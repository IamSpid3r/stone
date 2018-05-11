var request = require('request');
var url = require('url');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('../proxyRequest').proxyRequest;
exports.getInfo = function (urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if (urlInfo.host == 'cn.pharmacydirect.co.nz') {
        var patt = /\/(.*)\.html/ig;
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
        var timesInfo = {
            goods_id: goods_id,
            url: urlStr,
            host: urlInfo.host,
        }
        getTimesHtml(urlInfo, timesInfo, callback);
        return
    } else {
        callback({
            "Errors": {
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
        return '';
    }
}

function getTimesHtml(urlInfo, timesInfo, callback) {
    getHtml(urlInfo, function (body, err) {
        if (err) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }
        if (body) {
            var goods_id = timesInfo.goods_id,
              body = body,
              url = timesInfo.url,
              host = urlInfo.host;
            try {
                $ = cheerio.load(body); //读取成为jquery对象，可以根据id索引
                // var regexp = /(var sa_properties = [\s\S]*?)var loginUserId/ig;
                var regexp = /(var sa_properties = [\s\S]*?)var getUrlParamValue/ig;
                result = regexp.exec(body);
            } catch (exception) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": exception.message
                    }
                });
                return '';
            }
            try {
                eval(result[1]);
            } catch (exception) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": exception.message
                    }
                });
                return '';
            }
            res = sa_properties;
            var itemInfo = {
                Unique: '',
                Md5: '',
                Status: 'inStock',
                Url: url,
                ItemAttributes: {
                    Title: '',
                    ShopName: '',
                    ShopId: '',
                    ImageUrl: '',
                    Tax: 1
                },
                Variations: [],
                Items: []
            };
            itemInfo.ItemAttributes.Title = res.product_name;
            var rate = '';

            var imageUrl = $("#zoom1").attr("href");
            itemInfo.ItemAttributes.ImageUrl = imageUrl;
            itemInfo.ItemAttributes.ShopName = '新西兰pharmacydirect药房中文网';
            itemInfo.ItemAttributes.ShopId = 'cn.pharmacydirect.co.nz';
            itemInfo.Unique = 'cn.pharmacydirect.' + goods_id;
            rate = 'NZD';

            var attr = [];//获取属性存储
            var item = {};
            item.Attr = attr;//获取属性名
            item.Unique = host + "." + res.sku;
            item.Offers = [{//获取金额字段
                "Merchant": {
                    "Name": host
                },
                "List": [
                    {
                        // "Price": res.product_price_cny,
                        "Price": res.product_price,
                        "Type": rate
                    }
                ]
            }];
            itemInfo.Items.push(item);
            if (itemInfo.Items.length > 0) {
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            } else {
                itemInfo.Status = 'outOfStock';
            }
            //是否缺货
            if(res.is_in_stock){
                callback(null, itemInfo);
                return;
            }else if(! res.is_in_stock){
                itemInfo.Status = 'outOfStock';
                callback(null, itemInfo);
                return;
            }
            // callback(null, itemInfo);
            // return;
        } else {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'Goods Not Found'
                }
            });
            return;
        }
    })
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
        callback(body, error);
    })
}