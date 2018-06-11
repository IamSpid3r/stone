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
    var patt = /product\/([0-9]+)/ig;
    result = patt.exec(urlStr);
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

    var mainInfoApi = "https://a.bolo.me/v2/entity?catalogId="+goods_id+"&tck=&from=&entityType=SkuDetailEntity";
    getHtml(mainInfoApi, function(body, err, response) {
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
        var itemInfo = {
            Unique: 'cn.bolo.' + goods_id,
            Md5: '',
            Status: 'inStock',
            Url: url,
            ItemAttributes: {
                Title: "",
                ShopName : '菠萝蜜',
                ShopId: 'cn.bolo',
                ImageUrl: "",
                Tax:1.12
            },
            Variations: [],
            Items: [],
            Coupon:''
        };
        //请求秘钥错误
        if(text.result == 1) {
            itemInfo.status = "notFound";
            callback(null,itemInfo);
        }

        itemInfo.ItemAttributes.Title = text.entityValue.entityItems[0].entityValue.sku.name;
        itemInfo.ItemAttributes.ImageUrl = text.header.shareInfo.imageUrl+"@!largeJpegLQ";

        //获取skus
        var skuApi = "https://a.bolo.me/v2/catalogs/"+goods_id+"/prepare_purchase";
        getHtml(skuApi,function(body,err,response){
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }
            console.log(body);
            var text2 = _.trim(body);
            text2 = JSON.parse(text2);
            var variation = {};
            variation.Id = 1;
            variation.Name = text2.skus[0].skuLabel;
            var values = [];
            text2.skus.forEach(function(sku){
                var value = {};
                value.ImageUrls = [];
                value.ValueId = sku.skuNo;
                value.Name = sku.skuName;
                value.ImageUrls.push("https://img.bolo.me/"+sku.cover+"@!largeJpegLQ");
                values.push(value);

                //菠萝蜜也是1层结构。建立item模型
                var item = {
                    "Unique": "cn.bolo." + sku.id,
                    "Attr": [],
                    "Offers": [{
                        "Merchant": {
                            "Name": "bolo"
                        },
                        "List": [
                            {
                                "Price": sku.price,
                                "Type": "RMB"
                            }
                        ]
                    }]
                };
                var attr = {};
                attr.Nid = variation.Id;
                attr.N   = variation.Name;
                attr.Vid = sku.skuNo;
                attr.V = sku.skuName;
                item.Attr.push(attr);
                itemInfo.Items.push(item);
            });

            variation.Values = values;
            itemInfo.Variations.push(variation);
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));

            callback(null,itemInfo);
        });

    });
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