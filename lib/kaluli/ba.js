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
    if (urlInfo.host == 'www.ba.de') {

        var exp = /(\d*)\.html/ig;
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

    var regexps = /p_zp_prods:([\s\S]*?)\n};/ig;
    var result = regexps.exec(body);

    var res = JSON.parse(result[1]);

    var type = [];
    var itemInfo = {
        Unique: 'cn.ba.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: itemUrl,
        ItemAttributes: {
            Title: res.name,
            ShopName: 'www.ba.de',
            ShopId: 'www.ba.de',
            ImageUrl: res.productimage,
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
                    "Price": res.currentprice.replace('€',''),
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

