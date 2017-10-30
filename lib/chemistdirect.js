/**
 * Created by libin on 2017/10/30.
 */
var request = require('request');
var url  = require('url');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;
exports.getInfo = function(urlStr, callback){
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'cn.chemistdirect.com.au') {
        var patt = /\/(.*)\.html/ig;
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
        var goods_id = result[1];
        getHtml(urlInfo, function(body, err){
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
                    goods_id:goods_id,
                    url:urlStr
                } , callback);
            }else{
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": 'Goods Not Found'
                    }
                });
                return ;
            }
        })
    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
        return '';
    }


}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var goods_id = params.goods_id,
        body = params.body,
        url = params.url;

    try{
        $ = cheerio.load(body); //读取成为jquery对象，可以根据id索引
        var regexp = /(var sa_properties = [\s\S]*?)var loginUserId/ig;
        result = regexp.exec(body);
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception
            }
        });
        return '';
    }

    try {
        eval(result[1]);
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception
            }
        });
        return ;
    }
    res = sa_properties;


    var itemInfo = {
        Unique: 'cn.chemistdirect.' + goods_id,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName : '澳洲知名药房',
            ShopId: '',
            ImageUrl: '',
        },
        Variations: [],
        Items: []
    };
    itemInfo.ItemAttributes.Title = res.product_name;

    //获取头图
    var imageUrl = $("#preview").attr("src");
    itemInfo.ItemAttributes.ImageUrl = imageUrl;

    //获取属性存储
    var attr = [];
    var item = {};
    //获取属性名
    item.Attr = attr;
    item.Unique = 'cn.chemistdirect.' + res.sku;
    //获取金额字段
    item.Offers = [{
        "Merchant": {
            "Name":"chemistdirect"
        },
        "List":[
            {
                "Price": res.product_price_cny,
                "Type": "RMB"
            }
        ]
    }];
    itemInfo.Items.push(item);
    if(itemInfo.Items.length > 0){
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
    }else{
        itemInfo.Status = 'outOfStock';
    }
    callback(null, itemInfo);
    return;

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
        callback(body, error);
    })
}