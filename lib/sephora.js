/**
 * Created by libin on 2018/6/7.
 */
var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');
var eventproxy = require('eventproxy');
var Q            = require('q');
// var proxyRequest = require('./proxyRequest2');
var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    var patt = /product\/([0-9]+)\.html/ig;
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
    var sku_id = urlInfo.query.sku;
    var api_url = "https://api.sephora.cn/v1/product/sku/optionalSkuSpec?productId="+goods_id+"&skuId="+sku_id+"&channel=PC&isPromotion=false";
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
        if(body){
            text = _.trim(body);
            text = JSON.parse(text);
            var itemInfo = {
                Unique: 'cn.sephora.' + goods_id,
                Md5: '',
                Status: 'inStock',
                Url: url,
                ItemAttributes: {
                    Title: text.results.productCN,
                    ShopName : '丝芙兰',
                    ShopId: 'cn.sephora',
                    ImageUrl: text.results.currentSkuImagePath + "640x640.jpg",
                    Tax:1
                },
                Variations: [],
                Items: [],
                Coupon:''
            };
            //商品缺货
            var inventory = text.results.currentSkuInventory;
            if(inventory == 0) {
                itemInfo.Status = 'outOfStock';
                return callback(null, itemInfo);
            }
            //丝芙兰都是一层，默认为规格,拼接variation
            var variation = {};
            variation.Id = 1;
            variation.Name = "规格";
            var values = [];
            text.results.skuSaleAttrs.forEach(function (sku) {
                  var value = {};
                  value.ImageUrls = [];
                  value.ValueId = sku.skuId;
                  value.Name = sku.custom;
                  value.ImageUrls.push(sku.specImageUrl);
                  values.push(value);
                  //丝芙兰都是1层，建立item模型
                var item = {
                    "Unique": "cn.sephora." + sku.skuCode,
                    "Attr": [],
                    "Offers": [{
                        "Merchant": {
                            "Name": "sephora"
                        },
                        "List": [
                            {
                                "Price": text.results.currentSkuOfferPrice,
                                "Type": "RMB"
                            }
                        ]
                    }]
                };
                var attr = {};
                attr.Nid = 1;
                attr.N = "规格";
                attr.Vid = sku.skuId;
                attr.V = sku.custom;
                item.Attr.push(attr);
                itemInfo.Items.push(item);
            });

            variation.Values = values;
            itemInfo.Variations = variation;
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null,itemInfo);
        }else{
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'body null or status code not equal 200'
                }
            });
            return ;
        }
    })}







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
            "Pragma":"no-cache"
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}