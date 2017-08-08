var request = require('request');
var url  = require('url');
var iconv = require('iconv-lite');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var Q = require('q');
var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {   
    var urlInfo = url.parse(urlStr, true, true);
    try { 
        //如果url不对 那么直接返回error
          if (urlInfo.host != 'item.jd.com' && urlInfo.host != 'item.jd.hk') {
            callback({"Errors":{'Code': 'Error',"Message": 'Url Error'}}); return;
        }
        var jdRegExp = /^\/([a-zA-Z0-9]+).html/gi;
        var  goods_id = jdRegExp.exec(urlInfo.pathname);
        if(Array.isArray(goods_id) && goods_id[1] != undefined) {
            goods_id = goods_id[1];
        } else {
            callback({"Errors":{'Code': 'Error',"Message": 'Url Error'}}); return;
        }
        var apiUrl = 'https://item.m.jd.com/ware/detail.json?wareId='+goods_id;

        
        getHtml({
            url: apiUrl
            ,method: 'GET'
            ,headers: {
                'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
                "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                "X-Requested-With":"XMLHttpRequest"
            }
            ,encoding: null
            ,gzip: true
        }, function(err, response, body) {
            if (err) {
                callback({ "Errors":{'Code': 'Error',"Message": 'request api error'}});
            }
            //分析json
            body = iconv.decode(body, 'utf-8');
            body = JSON.parse(body);
            var $ = cheerio.load(body.ware.wdisHtml);
             var imgs = [];
            $('img').each(function(){
                 var _img = $(this).attr('src');
                if(_img != '' && _img != undefined) {
                    if(!in_array(imgs,_img))  imgs.push(_img);
                }
            });
           
            itemInfo = {
                Md5: md5('cn.jd.' + goods_id),
                Url:urlStr,
                Status: 'inStock',
                detailImgs:imgs,
            };
            callback(null, itemInfo);
        }); //getHtml end






    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error'
            }
        });
        return '';
    }
};

function  gwyy(str) {
    console.log(JSON.stringify(str,null,2));
    process.exit();
}

function in_array(arr, str) {
    var i = arr.length;
    while (i--) {
        if (arr[i] === str) {
            return true;
        }
    }
    return false;
}
/*
 *获取html
 **/
function getHtml(options, callback){
    proxyRequest(options, function(error, response, body, callbackStatus) {
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
        callback(error, response, body);
    })
}
