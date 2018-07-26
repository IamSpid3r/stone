var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');
var eventproxy = require('eventproxy');
var Q            = require('q');
// var proxyRequest = require('./proxyRequest2');
var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    getHtml(urlStr, function (body, err) {
        if (err) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err
                }
            });
            return;
        }
        var patt = /prod_id: \"([a-zA-Z0-9]+)\"/ig;
        var result = patt.exec(body);
        if (!result) {
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'body error no math goods id'
                }
            });
            return ;
        }
        var goods_id = result[1];
        var $ = cheerio.load(body);
        var itemInfo = {
            Unique: 'com.rakuten.global.' + goods_id,
            Md5: '',
            Status: 'inStock',
            Url: urlStr,
            ItemAttributes: {
                Title: $('.b-ttl-main').text(),
                ShopName : '日本乐天',
                ShopId: 'com.rakuten.global',
                ImageUrl: $('.b-main-image img').attr('src'),
                Tax:1
            },
            Variations: [],
            Items: [],
            Coupon:''
        };
        var price = $('#price_in_yen').text().replace(/[^0-9]/ig,'');
        price = price ? price : 0;
        price = parseFloat(price);
        if (price <= 0) {
            callback({
                "Errors": {
                    'Code': 'Fatal',
                    "Message": 'price error'
                }
            });
            return ;
        }
        console.log(price)
        //sku
        var num = 1;
        $('.b-form-horizontal').eq(0).children('div').each(function (k, v) {
            var skuName = $(v).find('.b-control-label').text();
            skuName = _.trim(skuName);
            if (skuName.indexOf('数量') < 0) {
                var variation = {};
                variation.Id = num;
                variation.Name = skuName;
                var values = [];
                var i = 1;
                //找skuvalue
                $(v).find('.b-radio-btns li').each(function (k1, v1) {
                    var value = {};
                    value.ImageUrls = [];
                    value.ValueId = num*1000000 + i;
                    value.Name = $(v1).find('label').text();
                    values.push(value);
                    i++;
                })
                variation.Values = values;
                itemInfo.Variations.push(variation);
                num++
            }
        })
        var cartesian = [];
        if (itemInfo.Variations.length > 0) {
            //做笛卡尔乘积
            var len = itemInfo.Variations.length;
            cartesian = itemInfo.Variations[0].Values;
            for(var i = 1; i < len; i++) {
                var temp =[];
                cartesian.forEach(function (v) {
                    var _v = clone(v);
                    _v.skuName = itemInfo.Variations[i-1].Name;
                    _v.nid = itemInfo.Variations[i-1].Id;
                    itemInfo.Variations[i].Values.forEach(function (v1) {
                        var _v1 = clone(v1);
                        _v1.skuName = itemInfo.Variations[i].Name;
                        _v1.nid = itemInfo.Variations[i].Id;
                        var temp1 = [];
                        temp1.push(_v);
                        temp1.push(_v1);
                        temp.push(temp1);
                    })
                })
                cartesian = temp;
            }
        }
        if (cartesian.length > 0) {
            var item = {
                "Unique": 'com.rakuten.global.' + goods_id,
                "Attr": [],
                "Offers": [{
                    "Merchant": {
                        "Name": "rakuten"
                    },
                    "List": [
                        {
                            "Price": price,
                            "Type": "JPY"
                        }
                    ]
                }]
            };
            cartesian.forEach(function (v) {
                var attr = []
                v.forEach(function (v1) {
                    var attr1 = {};
                    attr1.Nid = v1.nid;
                    attr1.N = v1.skuName;
                    attr1.Vid = v1.ValueId;
                    attr1.V = v1.Name;
                    attr.push(attr1)
                })
                item.Attr = attr;
                itemInfo.Items.push(item);
            })
        }
        callback(null, itemInfo)
    })
}
function clone(source) {
    var result={};
    for (var key in source) {
        result[key] = source[key];
    }
    return result;
}
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        timeout: 15000,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache",
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
//代理会很慢，这里不开代理
function noProxyRequest(options,callback) {
    request(options, callback);
}
