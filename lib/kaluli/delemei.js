// 加载http模块
var request = require('request');
var url = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function (urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if (urlInfo.host == 'www.delemei.de') {

        var exp = /\/(\d*)-/ig;
        var res = exp.exec(urlInfo.path);
        var pid = res[1];
        //api url
        getHtml(urlStr, function (body, err, response) {
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
                getItemInfo({pid: pid, body: body, url: urlStr}, callback);
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
    var body = params.body,
        itemUrl = params.url,
        pid = params.pid;

    if (!body) {
        var notFoundReg = /404-找不到页面/ig;
        if (notFoundReg.exec(body)) {//not found
            var itemInfo = {
                Unique: 'cn.ba.' + pid,
                Md5: '',
                Status: 'notFind',
                Url: itemUrl,
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

    var $ = cheerio.load(body);
    var title =  $('#thumbnail_1133').find('img').attr('title');;
    var price ='' ;
    $('#center_column').find('.product-price').each(function (item) {
        if(item == 0){
            price =$(this).text();
        }
    });
    if (price) {
        price = price.replace('参考价：¥', '').trim();
    }
    var img = $('#thumbnail_1133').find('img').attr('src');


    var type = [];
    var itemInfo = {
        Unique: 'cn.ba.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: itemUrl,
        ItemAttributes: {
            Title: title,
            ShopName: 'www.ba.de',
            ShopId: 'www.ba.de',
            ImageUrl: img,
            Tax: 1
        },
        Variations: [],
        Items: []
    };

    detail = {
        "Unique": 'cn.ba.' + pid,
        "Attr": [],
        "Offers": [{
            "Merchant": {
                "Name": "www.ba.de"
            },
            "List": [
                {
                    "Price": price,
                    "Type": "EUR"
                }
            ]
        }]
    };
    itemInfo.Items.push(detail);

    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
    callback(null, itemInfo);
    return;
}


/*
 *获取html
 **/
function getHtml(urlStr, callback) {
    request(urlStr, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(body, error, response);
        }
    })
}