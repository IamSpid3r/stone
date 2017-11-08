// 加载http模块
var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');
var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'www.abcpost.com.au'){

        //api url
        getHtml(urlStr, function(body, err, response){
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
                getItemInfo({body : body, url:urlStr}  , callback);
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
    var body     = params.body,
        url      = params.url;

    var regexp = /(\{'@context'[\s\S]*?)<\/script>/;
    // var patt = /(\{"@context":"https = [\s|\S]*?)\<\/script\>/
    result = regexp.exec(body);
    var $ = cheerio.load(body);
    $('script[type="application/ld+json"]').each(function (i) {
            result = JSON.parse($(this).text().replace(/@/g,''));
            console.log(result);
    });

    if(!result){
        var notFoundReg = /404-找不到页面/ig;
        if(notFoundReg.exec(body)){//not found
            var itemInfo = {
                Unique: 'www.abcpost.com.au.'+result,
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
    var goods_id = result;

    var graph = result.graph;
    var price =graph[1].offers[0].price;
    if(!price){
        price = graph[1].offers[0].lowprice;
    }
    var itemInfo = {
        Unique: 'www.abcpost.' + graph[1].sku,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: graph[1].name,
            ShopName : '澳洲药房中文网',
            ShopId: 'www.abcpost',
            ImageUrl: graph[1].image,
            Tax:0
        },
        Variations: [],
        Items: []
    };

    detail = {
        "Unique":'www.abcpost.' + graph[1].sku,
        "Attr":[],
        "Offers": [{
            "Merchant": {
                "Name":"www.abcpost"
            },
            "List":[
                {
                    "Price": price,
                    "Type": "RMB"
                }
            ]
        }]
    };
    itemInfo.Items.push(detail);
    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
    callback(null, itemInfo);
    return ;
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

