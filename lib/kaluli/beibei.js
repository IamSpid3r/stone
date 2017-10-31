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
    if(urlInfo.host == 'global.beibei.com' || urlInfo.host == 'www.beibei.com'){
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
    var itemInfo = {
        Unique: 'cn.beibei.' + res.iid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: res.title,
            ShopName : '贝贝网',
            ShopId: 'cn.beibei',
            ImageUrl: res.main_img,
        },
        Variations: [],
        Items: []
    };

    // 开始处理数据
    var wareInfo =  res.sku.sku_id_map;
    if(typeof wareInfo != 'undefined'){//没有sku
        for(var i = 0;i< wareInfo.length;i++){
            var cc = wareInfo[1]
        }
    }

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


