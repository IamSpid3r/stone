var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy');
var Q = require('q');
var fun = require('./fun');
var iconv = require('iconv-lite');

//var proxyRequest = require('./proxyRequest').proxyRequest;
var proxyRequest = require('./proxyRequest2');

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);
    if (['item.taobao.com', 'detail.tmall.com', 'detail.tmall.hk'].indexOf(urlInfo.host) != -1
        && ['/item.htm', '/hk/item.htm'].indexOf(urlInfo.pathname) != -1
        && urlInfo.query.id
    ) {
        return getItemInfo(urlStr, callback);
    } else {
        return callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}

/*
 *内容处理
 **/
function getItemInfo(urlStr, callback) {
    //获取属性
    getHtml(urlStr,function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }
        if (body.length == 0){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'get product detail error'
                }
            });
            return '';
        }
        //console.log(body,11111);
        var urlInfo = url.parse(urlStr, true);
        //匹配js
        if (urlInfo.host == 'detail.tmall.com'){//天猫
            var exp = /i;w.(g_config\=(\{[\s\S]*.*\}));d\[gt\]/ig;
            try{
                bodyArr = exp.exec(body);
                bodyArr[1] = 'var '+bodyArr[1];
                var window = {
                    screen:{width:1100},
                    location:{search:false}
                }
                eval(bodyArr[1])
                var itemInfo = {
                    itemUrl:urlStr,
                    online:true,
                    itemId:g_config.itemId,
                    shopId:g_config.shopId,
                    shopName:'',
                    sellerId:g_config.sellerId,
                    sellerNick:decodeURI(g_config.sellerNickName),
                    shopUrl:'https:'+g_config.shopUrl,
                    type:g_config.type//是否是库东城
                };

                //获取shopname
                exp = /slogo\-shopname.*strong\>(.*)<\/strong><\/a>/ig;
                bodyArr = exp.exec(body);
                itemInfo.shopName = bodyArr[1];
                callback(null,itemInfo);
             }catch(exception){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": exception
                    }
                });
                return '';
             }
        } else {//淘宝
            var exp = /(var\s*g_config\s*=\s*\{[\s\S]*.*\});[\s\S]*.*g_config.tadInfo\s*\=/ig;
            try{
                body = exp.exec(body);
                var location = {
                    protocol:'http'
                }
                eval(body[1])
                var itemInfo = {
                    itemUrl:urlStr,
                    online:g_config.online,
                    itemId:g_config.itemId,
                    shopId:g_config.shopId,
                    shopName:g_config.shopName,
                    sellerId:g_config.sellerId,
                    sellerNick:g_config.sellerNick,
                    shopUrl:'https:'+g_config.idata.shop.url,
                    type:g_config.idata.item.type//是否是库东城
                };
                callback(null,itemInfo);
             }catch(exception){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": exception
                    }
                });
                return '';
             }
        }
        
    })
}

/*
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        timeout: 15000,
        gzip: true,
        headers: {
            //'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1',
            'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.146 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"gzip, deflate, br",
            "Accept-Language":"zh-CN,zh;q=0.9,en;q=0.8",
            "Cache-Control":"no-cache",
            "Cookie":" thw=cn; t=68ccaf2a13d23ba8430acca50889c6aa; cna=tzMdE8ey7VsCAWVRNFo3mcw/; hng=CN%7Czh-CN%7CCNY%7C156; um=6AF5B463492A874DB499155C773B4D1572BD49E506C02C9F21655A517F5C07B9FA2239CB24ED718CCD43AD3E795C914C451EE9430504E8725D4C8FB11A04AAF9; lgc=%5Cu6D45%5Cu7B11_%5Cu9189_%5Cu659C%5Cu9633; tracknick=%5Cu6D45%5Cu7B11_%5Cu9189_%5Cu659C%5Cu9633; _cc_=UIHiLt3xSw%3D%3D; tg=0; v=0; _tb_token_=feb1d371bb15a; uc1=cookie14=UoTePMWh0kzSuA%3D%3D; mt=ci=-1_0; isg=BPHxq2iKDzs4m6MCBgPUS2SYA3snzlUU8BwDcdMG9rjX-hBMGixEIVEYGA6cKf2I"
        },
        // proxy: 'http://172.16.13.177:8888'
        encoding: null
    }, function(error, response, body) {

        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0
                || body.indexOf('Direct connection failed, no parent proxy') > 0
            ) {
                callback(null, 'fast rate or no parent proxy');
            } else {
                body = iconv.decode(body, 'GBK');
                callback(body, null);
            }
        }else{
            callback(null, error);
        }
    })
}