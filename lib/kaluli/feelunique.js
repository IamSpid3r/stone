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
        var $ = cheerio.load(body);
        var patt = /com\/([0-9]+)/ig;
        var result = patt.exec(urlStr);
        if (!result) {
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'url error no math goods id'
                }
            });
            return ;
        }
        var goods_id = result[1];
        var itemInfo = {
            Unique: 'com.feelunique.' + goods_id,
            Md5: '',
            Status: 'inStock',
            Url: urlStr,
            ItemAttributes: {
                Title: "",
                ShopName : '香港直邮',
                ShopId: 'com.feelunique',
                ImageUrl: "",
                Tax:1
            },
            Variations: [],
            Items: [],
            Coupon:''
        };
        //ItemAttributes补全
        itemInfo.ItemAttributes.Title = $('#breadcrumb .product strong').text();
        itemInfo.ItemAttributes.ImageUrl = $('.J-detail-preview img').attr('src');
        //sku信息
        var skuName   = '';
        var skuIds    = [];
        var skuObj = {};
        if ($('.property-list li').length > 0) {
            $('.property-list li').each(function (k, v) {
                var sku_id = $(v).data('id');
                skuIds.push(sku_id);
                skuObj[sku_id] = {};
                skuObj[sku_id].title = $(v).attr('title');
                skuObj[sku_id].id = sku_id;
                skuObj[sku_id].img = $(v).find('img').attr('src');
            })
            skuName = '颜色';
        } else {
            var sku_id = goods_id.substr(1,goods_id.length-1);
            skuIds.push(sku_id);
            skuObj[sku_id] = {};
            skuObj[sku_id].title = itemInfo.ItemAttributes.Title;
            skuObj[sku_id].id = sku_id;
            skuObj[sku_id].img = itemInfo.ItemAttributes.ImageUrl
            skuName = '规格';
        }
        //获取sku信息
        var api = 'https://cn.feelunique.com/pt_catalog/productservice/info?product_id='+ encodeURIComponent(skuIds.join(','));
        getHtml(api, function (body, err) {
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }
            var text = _.trim(body);
            text = JSON.parse(text);
            //拼接variation
            var variation = {};
            variation.Id = 1;
            variation.Name = skuName;
            var values = [];
            text.data.forEach(function (sku) {
                if (sku.is_in_stock == 1) {
                    var value = {};
                    value.ImageUrls = [];
                    value.ValueId = sku.sku;
                    value.Name = skuObj[sku.product_id].title;
                    value.ImageUrls.push(skuObj[sku.product_id].img);
                    values.push(value);
                    var item = {
                        "Unique": "com.feelunique." + sku.sku,
                        "Attr": [],
                        "Offers": [{
                            "Merchant": {
                                "Name": "feelunique"
                            },
                            "List": [
                                {
                                    "Price": sku.rmb,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };
                    var attr = {};
                    attr.Nid = 1;
                    attr.N = skuName;
                    attr.Vid = sku.sku;
                    attr.V = skuObj[sku.product_id].title;
                    item.Attr.push(attr);
                    itemInfo.Items.push(item);
                }
            })
            if (values.length == 0) {
                itemInfo.Status = "outOfStock";
                callback(null, itemInfo);
                return '';
            }
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
        timeout: 5000,
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