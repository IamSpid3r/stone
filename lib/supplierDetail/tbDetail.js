var request = require('request');
var url  = require('url');
var iconv = require('iconv-lite');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var Q = require('q');
var phantom = require('phantom');
var proxyRequest = require('../proxyRequest').proxyRequest;
exports.getInfo = function(urlStr, callback) {   
    var urlInfo = url.parse(urlStr, true, true);
    var running = 0;
    try { 
        if (urlInfo.host == 'item.taobao.com' && urlInfo.pathname == '/item.htm' && urlInfo.query.id)  running = 1;
        if (urlInfo.host == 'detail.tmall.com' &&  urlInfo.pathname == '/item.htm' && urlInfo.query.id) running = 1;
        if (urlInfo.host == 'detail.tmall.hk' &&  urlInfo.pathname == '/hk/item.htm' && urlInfo.query.id) running = 1;
        if (urlInfo.host == 'chaoshi.detail.tmall.com' &&  urlInfo.pathname == '/item.htm' && urlInfo.query.id) running = 1;
        if(running == 0)  callback({ "Errors":{'Code': 'Fatal', "Message": 'host error is not taobao hostname'}});    
        //继续执行
        var api_url = 'http://hws.m.taobao.com/cache/mtop.wdetail.getItemDescx/4.1/?data=%7B%22item_num_id%22%3A%22'+urlInfo.query.id+'%22%7D';
     

        getHtml({
            url: api_url
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
            if(body.data.images == undefined || body.data.images == '') {
                 callback({ "Errors":{'Code': 'Error',"Message": 'request api error'}});
            }
            itemInfo = {
                Md5: md5('cn.taobao.' + urlInfo.query.id),
                Url:urlStr,
                Status: 'inStock',
                detailImgs:body.data.images,
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