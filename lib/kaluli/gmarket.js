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
    var patt = /goodscode=([0-9]+)/ig;
    var result = patt.exec(urlStr);
    if (!result) {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'body error no math goods id'
            }
        });
        return '';
    }
    var goods_id = result[1];
    getHtml(urlStr, function (body, err) {
        if (err) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }
        var $ = cheerio.load(body);
        var itemInfo = {
            Unique: 'kr.co.gmarket.item2.' + goods_id,
            Md5: '',
            Status: 'inStock',
            Url: urlStr,
            ItemAttributes: {
                Title: $('p.tit').text(),
                ShopName : '韩国直邮',
                ShopId: 'kr.co.gmarket.item2',
                ImageUrl: $('.goods-img-info .img img').attr('src'),
                Tax:1
            },
            Variations: [],
            Items: [],
            Coupon:''
        };
        var base_price = $('#trCostPrice .numstyle').text().replace(/￦|\,/g,'');
        if (!base_price) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": '价格抓取错误'
                }
            });
            return;
        }
        base_price = parseFloat(base_price);
        //sku
        var api = "http://item2.gmarket.co.kr/Item/detailview/PayInc/GeneralGoodsOptionSelectorLayerService.aspx?goodscode="+goods_id;
        getHtml(api, function (body, err) {
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return '';
            }

            var $ = cheerio.load(body);
            //拼接variation
            var variation = {};
            variation.Id = 1;
            variation.Name = 'Choice';
            var values = [];
            $("#_0_ulItemList li").each(function (k, v) {
                var img = $(v).find('img').attr('src');
                var name = $(v).find('img').attr('alt').replace(/\s*\(.*\)/g,'');
                var price = $(v).find('.cost').text().replace(/\+|,|원|\s*/g, '');
                var id = $(v).find('.pb-list-img-over').attr('id');
                price = price ? price : 0.0;
                price = parseFloat(price);
                var value = {};
                value.ImageUrls = [];
                value.ValueId = id;
                value.Name = name;
                value.ImageUrls.push(img);
                values.push(value);
                var item = {
                    "Unique": "com.feelunique." + id,
                    "Attr": [],
                    "Offers": [{
                        "Merchant": {
                            "Name": "gmarket"
                        },
                        "List": [
                            {
                                "Price": base_price+price,
                                "Type": "JPY"
                            }
                        ]
                    }]
                };
                var attr = {};
                attr.Nid = 1;
                attr.N = 'Choice';
                attr.Vid = id;
                attr.V = name;
                item.Attr.push(attr);
                itemInfo.Items.push(item);
            })
            variation.Values = values;
            itemInfo.Variations.push(variation);
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null, itemInfo);
        })
    })
}
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        timeout: 10000,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache",
            "appId": "3001",
            "tourId": "2F7B8F57-696E-4FD6-9724-06DF04914129"
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
