var request = require('request');
var url = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');

var Q = require('q');

var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function (urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if (urlInfo.host == 'global.beibei.com' || urlInfo.host == 'www.beibei.com' || urlInfo.host == 'you.beibei.com') {
        var patt = /detail\/(.*)\.html/ig;
        // var patt = /detail\/([0-9]+\-[0-9]+)\.html/ig;

        result = patt.exec(urlInfo.path);
        if (!result) {
            callback({
                "Errors": {
                    'Code': 'Fatal',
                    "Message": 'url error no math goods id'
                }
            });
            return;
        }
        var goods_id = result[1];
        //api url
        getMHtml(goods_id).then(function (json) {
            var MshopId = json.id;
            var api_url_m = 'https://m.beibei.com/gaea_pt/mpt/group/detail.html?iid=' + MshopId;

            getHtml(api_url_m, function (body, err, response) {
                if (err) {
                    callback({
                        "Errors": {
                            'Code': 'Error',
                            "Message": err
                        }
                    });
                    return;
                }
                if (body && response.statusCode == 200) {
                    getItemInfo({body: body, goods_id: goods_id, url: urlStr}, callback);
                } else {
                    callback({
                        "Errors": {
                            'Code': 'Error',
                            "Message": 'body null or status code not equal 200'
                        }
                    });
                    return;
                }
            })
        })

    } else {
        callback({
            "Errors": {
                'Code': 'Fatal',
                "Message": 'url error'
            }
        });
        return;
    }
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var goods_id = params.goods_id,
      body = params.body,
      url = params.url;
    var regexp = /getItemDetail\">([\s\S]*?)<\/script>/ig;
    result = regexp.exec(body);
    if (!result) {
        var notFoundReg = /404-找不到页面/ig;
        if (notFoundReg.exec(body)) {//not found
            var itemInfo = {
                Unique: 'cn.kaola.' + goods_id,
                Md5: '',
                Status: 'notFind',
                Url: url,
                ItemAttributes: {},
                Variations: [],
                Items: []
            };
            callback(null, itemInfo);
            return;
        } else {// regexp error
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'goods not found'
                }
            });
            return;
        }
    }
    try {
        var res = JSON.parse(result[1]);
    } catch (exception) {
        callback({
            "Errors": {
                'Code': 'Error',
                "Message": exception
            }
        });
        return;
    }
    // 数据组装
    var TaxM = res.oversea_info
    if (typeof TaxM != 'undefined' && TaxM.tax_info.price != 0) {
        var tax = 1.112 //不包税
    } else {
        var tax = 1 //包税
    }
    var itemInfo = {
        Unique: 'cn.beibei.' + res.iid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: res.title,
            ShopName: '贝贝网',
            ShopId: 'cn.beibei',
            Tax: tax,
            ImageUrl: res.main_img,
        },
        Variations: [],
        Items: []
    };

    // 开始处理数据,先组装Variations数据
    var idMap = res.sku.sku_id_map;
    var kvMap = res.sku.sku_kv_map;
    var vIdAttr = {};
    // 将最底层ID为key值，组装成新的sku的值
    if (typeof idMap != 'undefined') {//没有sku
        for (var key in idMap) {
            var attr = {};
            //设置属性名字
            attr.Id = key;
            attr.Name = kvMap["k" + key];
            attr.Values = [];
            //设置属性value
            for (var i = 0; i < idMap[key].length; i++) {
                var value = {};
                value.ValueId = idMap[key][i];
                value.Name = kvMap["v" + idMap[key][i]];
                attr.Values.push(value);
                // 将最底层ID为key值，组装成新的sku的值
                var vIdAttrItem = [];
                vIdAttrItem.vIdName = kvMap["v" + idMap[key][i]];
                vIdAttrItem.typeId = key;
                vIdAttrItem.typeName = kvMap["k" + key];
                // var vIdAttr = {}
                vIdAttr[idMap[key][i]] = vIdAttrItem;
            }
            itemInfo.Variations.push(attr);
        }
    }
    // console.log(vIdAttr)     vIdAttr 就是将最底层的sku组合起来，方便items去组装
    //组装Items数据
    var stockMap = res.sku.sku_stock_map;
    for (var skuId in stockMap) {
        var vIds = skuId.split(/[a-zA-Z@]/);        //vIds 是sku值的组合
        //去除数组当中的空值
        for (var i = 0; i < vIds.length; i++) {
            if (vIds[i] == "" || typeof(vIds[i]) == "undefined") {
                vIds.splice(i, 1);
                i = i - 1;
            }
        }

        var attrs = {}
        attrs.Unique = 'beibei.' + stockMap[skuId].sku_id;
        // attrs.Attr = [];
        attrs.Attr = [];
        for(var i = 0; i< vIds.length; i++){
            var attrItem = {}
            var skuItemId = vIds[i]
            attrItem.Nid = vIdAttr[skuItemId].typeId
            attrItem.N = vIdAttr[skuItemId].typeName
            attrItem.Vid = skuItemId
            attrItem.V = vIdAttr[skuItemId].vIdName
            attrs.Attr.push(attrItem)
        }

        attrs.Offers = [{
            "Merchant": {
                "Name": "beibei"
            },
            "List": [
                {
                    "Price": stockMap[skuId].price / 100,
                    "Type": "RMB"
                }
            ]
        }];
        itemInfo.Items.push(attrs);
    }
    // 加密部分
    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
    callback(null, itemInfo);

    return;

}

function getMHtml(goods_id) {
    var defer = Q.defer();
    var api_url = 'http://global.beibei.com/detail/' + goods_id + '.html';
    getHtml(api_url, function (body, err, response) {
        if (err) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err
                }
            });
            return;
        }

        if (body && response.statusCode == 200) {
            var regexp = /(pageData.itemId = \'([\s\S]*?))\'/;
            var result = '';
            var MshopId = '';
            // 无限死循环，不停抓取
            try {
                result = regexp.exec(body);
                MshopId = result[2]

            } catch (e) {
                getMHtml(goods_id);
            }
        } else {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'body null or status code not equal 200'
                }
            });
            return;
        }
        return defer.resolve({
            id: MshopId
        });
        // return defer.resolve({});
    })
    return defer.promise;
}

/*
 *获取html
 **/
function getHtml(urlStr, callback) {
    proxyRequest({
        url: urlStr,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Language": "zh-CN,zh;q=0.8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Pragma": "no-cache"
        }
        // proxy: 'http://172.16.13.177:8888'
        //encoding: null
    }, function (error, response, body, callbackStatus) {
        if (!error) {
            if (body.indexOf('Please retry your requests at a slower rate') > 0) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        } else {
            callbackStatus(false)
        }
    }, function (error, response, body) {
        callback(body, error, response);
    })
}


