/**
 * Created by captern on 2017/10/30.
 */
var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');

var Q            = require('q');

var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'global.beibei.com' || urlInfo.host == 'www.beibei.com' || urlInfo.host == 'you.beibei.com'){
        var patt = /detail\/(.*)\.html/ig;
        // var patt = /detail\/([0-9]+\-[0-9]+)\.html/ig;

        result = patt.exec(urlInfo.path);
        if (!result) {
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'url error no math goods id'
                }
            });
            return ;
        }
        var goods_id =  result[1];
        //api url
        getMHtml(goods_id).then(function(json){
            var MshopId = json.id;
            var api_url_m = 'https://m.beibei.com/gaea_pt/mpt/group/detail.html?iid='+MshopId;

            getHtml(api_url_m, function(body, err, response) {
                if(err){
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": err
                        }
                    });
                    return ;
                }
                if(body && response.statusCode == 200){
                    getItemInfo({body : body, goods_id : goods_id, url:urlStr} , callback);
                }else{
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": 'body null or status code not equal 200'
                        }
                    });
                    return ;
                }
            })
        })

    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'url error'
            }
        });
        return ;
    }
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var goods_id = params.goods_id,
        body     = params.body,
        url      = params.url;
    var regexp = /getItemDetail\">([\s\S]*?)<\/script>/ig;
    result = regexp.exec(body);
    if(!result){
        var notFoundReg = /404-找不到页面/ig;
        if(notFoundReg.exec(body)){//not found
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
            return ;
        }else{// regexp error
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'goods not found'
                }
            });
            return ;
        }
    }
    try {
        var res = JSON.parse(result[1]);
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception
            }
        });
        return ;
    }
    // 数据组装
    var TaxM = res.oversea_info
    if(typeof TaxM != 'undefined' && TaxM.tax_info.price != 0){
        var tax = 1 //不包税
    }else{
        var tax = 0 //包税
    }
    var itemInfo = {
        Unique: 'cn.beibei.' + res.iid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: res.title,
            ShopName : '贝贝网',
            ShopId: 'cn.beibei',
            Tax : tax,
            ImageUrl: res.main_img,
        },
        Variations: [],
        Items: []
    };

    // 开始处理数据,先组装Variations数据
    var idMap =  res.sku.sku_id_map;
    var kvMap = res.sku.sku_kv_map;
    if(typeof idMap != 'undefined'){//没有sku
        for(var key in idMap){
            var attr = {};
            //设置属性名字
            attr.Id = key;
            attr.Name = kvMap["k"+key];
            attr.Values = [];
            //设置属性value
            for(var i=0;i<idMap[key].length;i++) {
                var value = {};
                value.ValueId = idMap[key][i];
                value.Name = kvMap["v"+idMap[key][i]]
                attr.Values.push(value);
            }
            itemInfo.Variations.push(attr);
        }
    }

    //组装Items数据

    var stockMap = res.sku.sku_stock_map;
    var length = itemInfo.Variations.length
    if(typeof stockMap != 'undefined' && length == 2){
        // 组装stockMap 双层 的规格
        var typeOne = itemInfo.Variations[0].Values
        var typetwo = itemInfo.Variations[1].Values
        for(var i = 0; i<typeOne.length; i++){

            var k = [];
            for(var key in idMap){
                k.push(key)
            }
            var val = {};
            val.Nid = k[0]
            val.N   = kvMap['k' + k[0]]
            val.Vid = idMap[k[0]][i]
            val.V   = kvMap['v' + idMap[k[0]][i]]
            for(var j = 0; j<typetwo.length; j++){
                var attrs = {};
                NidAll = 'v'+typeOne[i].ValueId + 'v'+typetwo[j].ValueId
                attrs.Unique = 'beibei.' + stockMap[NidAll].sku_id;
                attrs.Attr = [];
                attrs.Attr.push(val)

                attrs.Offers = [{
                    "Merchant": {
                        "Name":"beibei"
                    },
                    "List":[
                        {
                            "Price": stockMap[NidAll].pintuan_price/100,
                            "Type": "RMB"
                        }
                    ]
                }];
                var val2 = {};
                val2.Nid = k[1]
                val2.N   = kvMap['k' + k[1]]
                val2.Vid = idMap[k[1]][j]
                val2.V   = kvMap['v' + idMap[k[1]][j]]
                attrs.Attr.push(val2)

                // 推出去
                itemInfo.Items.push(attrs);
            }
        }

    }else if(typeof stockMap != 'undefined' && length == 1){
        // 组装stockMap 双层 的规格
        var typeOne = itemInfo.Variations[0].Values
        for(var i = 0; i<typeOne.length; i++){

            var k = [];
            for(var key in idMap){
                k.push(key)
            }
            var val = {};
            val.Nid = k[0]
            val.N   = kvMap['k' + k[0]]
            val.Vid = idMap[k[0]][i]
            val.V   = kvMap['v' + idMap[k[0]][i]]

            var attrs = {};
            NidAll = 'v'+typeOne[i].ValueId
            attrs.Unique = 'beibei.' + stockMap[NidAll].sku_id;
            attrs.Attr = [];
            attrs.Attr.push(val)

            attrs.Offers = [{
                "Merchant": {
                    "Name":"beibei"
                },
                "List":[
                    {
                        "Price": stockMap[NidAll].pintuan_price/100,
                        "Type": "RMB"
                    }
                ]
            }];

            // 推出去
            itemInfo.Items.push(attrs);
        }

    }
    callback(null, itemInfo);

    return ;

}

function getMHtml(goods_id){
    var defer = Q.defer();
    var api_url = 'http://global.beibei.com/detail/'+goods_id+'.html';
    getHtml(api_url, function(body, err, response){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return ;
        }

        if(body && response.statusCode == 200){
            var regexp = /(pageData.itemId = \'([\s\S]*?))\'/;
            var result = regexp.exec(body);
            var MshopId = result[2]
        }else{
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'body null or status code not equal 200'
                }
            });
            return ;
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
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache"
        }
        // proxy: 'http://172.16.13.177:8888'
        //encoding: null
    }, function(error, response, body, callbackStatus) {
        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(body, error, response);
    })
}


