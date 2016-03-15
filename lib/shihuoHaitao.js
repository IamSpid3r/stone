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

    var getUrl = 'http://www.shihuo.cn/api/stone/act/shihuoGoods?url='+encodeURIComponent(urlStr);
    getHtml(getUrl, function(body){
        if(body){
            getItemInfo(body, callback);
        }else{
            callback({
                "Errors":{
                    'Code': 'Error',
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
        if(body.type == 2){
            var interfaceUrl = 'http://localhost:3000/info?url='+encodeURIComponent(body.data.url);
            getHtml(interfaceUrl, function(body, error){
                if(typeof body.Status != undefined && body.Status){
                    callback(null, body.Data);
                }else{
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": 'Goods Not Found'
                        }
                    });
                }
            })
        }else if(body.type == 1){
            var itemInfo = {
                Unique: 'cn.shihuo.ziyin.' + body.data.id,
                Md5: '',
                Status: body.data.stock,
                Url: body.data.url,
                ItemAttributes: {
                    Title: body.data.title
                },
                Variations: [],
                Items: [
                    {
                        Unique: 'cn.shihuo.ziyin.' + body.data.id,
                        Attr: [ ],
                        Offers: [
                            {
                                Merchant: {
                                    Name: "shihuoZiyin"
                                },
                                List: [
                                    {
                                        Price: body.data.price,
                                        Type: "RMB"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null, itemInfo);
        }else{
            var itemInfo = {
                Unique: 'cn.shihuo.' + body.data.id,
                Md5: '',
                Status: 'outOfStock',
                Url: body.data.url,
                ItemAttributes: {},
                Variations: [],
                Items: []
            };

            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null, itemInfo);
        }
    }else{
        callback({
            "Errors":{
                'Code': 'Error',
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
            callback(null ,err || 'get error');
        }
    })
}