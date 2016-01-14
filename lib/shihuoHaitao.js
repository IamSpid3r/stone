var request = require('request');
var url  = require('url');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'www.shihuo.cn'){
            var sku = urlInfo.path.split('/')[3].split('-');
            var pid = sku[0];       //商品id
        }else{
            throw new Error();
        }
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error'
            }
        });
        return '';
    }

    var getUrl = 'http://www.shihuo.cn/api/acount/f/getOriginalUrl?id='+pid;
    getHtml(getUrl, function(body){
        if(body){
            getItemInfo(body, callback);
        }else{
            callback({
                "Errors":{
                    'Code': 'error',
                    "Message": 'Goods Not Found'
                }
            });
        }
    })
}

/*
 *内容处理
 **/
function getItemInfo(body, callback) {
    if(body.status){
        var url = body.data.url;
        if(process.env.NODE_ENV != 'develop'){//线上
            var  interfaceUrl = 'http://121.41.45.190:3000/info';
        }else{//线下
            var  interfaceUrl = 'http://192.168.8.179:3000/info';
        }

        interfaceUrl+='?url='+encodeURIComponent(url);
        getHtml(interfaceUrl, function(body){
            if(typeof body.Status != undefined && body.Status){
                callback(null, body.Data);
            }else{
                callback({
                    "Errors":{
                        'Code': 'error',
                        "Message": 'Goods Not Found'
                    }
                });
            }
        })
    }else{
        callback({
            "Errors":{
                'Code': 'error',
                "Message": 'Goods Not Found'
            }
        });
    }
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    request({url : urlStr},function(err,response,body){
        if (!err && response.statusCode == 200) {
            body = JSON.parse(body);
            callback(body);
        }else{
            throw new Error(err);
        }
    })
}
