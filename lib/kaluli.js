var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'www.kaluli.com'){
            var exp = /product\/(\d*)\.html/ig;
            var res = exp.exec(urlInfo.path);
            var pid = res[1];
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

    getHtml(urlStr, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        if(body){
            getItemInfo({
                body:body,
                pid:res[1],
                url:urlStr
            } , callback);
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
function getItemInfo(params, callback) {
    var pid = params.pid,
        body = params.body,
        url = params.url;

    var itemInfo = {
        Unique: 'cn.kaluli.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: title
        },
        Variations: [],
        Items: []
    };

    var $ = cheerio.load(body);
    var outOfStock = $('.aw-404-wrap').find('p').eq(0).text();
    if(outOfStock == '你访问的页面不存在'){//下架
        itemInfo.Status = 'outOfStock';

        callback(null, itemInfo);
        return ;
    }

    //上架
    var price = $('#kaluliPrice').html();
    var title = $('.pro-detail').find('h1').eq(0).text();

    //数据处理
    itemInfo.Items.push({
        "Unique":"cn.kaluli."+pid,
        "Attr":[],
        "Offers": [{
            "Merchant": {
                "Name":"kaluli"
            },
            "List":[
                {
                    "Price": price,
                    "Type": "RMB"
                }
            ]
        }]
    })
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
        //如果是限制ip了就返回false
        if(!error){
            if (body.indexOf("Sorry, this item isn't available") != -1) {
                callbackStatus(false)
            } else {
                callbackStatus(true)
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
