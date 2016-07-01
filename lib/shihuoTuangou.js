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
        if(urlInfo.host != 'www.shihuo.cn'){
            throw new Error();
        }
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
        return '';
    }

    var getUrl = 'http://www.shihuo.cn/api/stone/act/shihuoTuangou?url='+encodeURIComponent(urlStr);
    getHtml(getUrl, function(body, error){
        if(body){
            getItemInfo(body, callback);
        }else{
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": error
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
        var interfaceUrl = 'http://stone.shihuo.cn/info?url='+encodeURIComponent(body.data.url);
        getHtml(interfaceUrl, function(sbody, error){
            if(!error && sbody.hasOwnProperty('Status')){
                if( sbody.Status ){
                    callback(null, sbody.Data);
                    return ;
                }else{
                    callback(sbody.Msg);
                    return ;
                }
            }else{
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": error
                    }
                });
                return ;
            }
        })
    }else{
        var itemInfo = {
            Unique: 'cn.shihuo.tuangou' + body.data.id,
            Md5: '',
            Status: 'outOfStock',
            Url: body.data.url,
            ItemAttributes: {},
            Variations: [],
            Items: []
        };

        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
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
            callback(null ,err || 'get error');
        }
    })
}
