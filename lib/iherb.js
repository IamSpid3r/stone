var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy');
var Q = require('q');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if (urlInfo.host == 'cn.iherb.com') {
        var patt = /pr\/(.*)\/([0-9]+)/ig;
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
        var goods_id = result[2]
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
    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'url error'
            }
        });
        return ;
    }


};

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var goods_id = params.goods_id,
        body = params.body,
        url = params.url;

    try{
        $ = cheerio.load(body); //读取成为jquery对象，可以根据id索引
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception
            }
        });
        return '';
    }

    var itemInfo = {
        Unique: 'cn.iherb.' + goods_id,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName : '京东',
            ShopId: '',
            ImageUrl: '',
            VenderType:'普通',
            StageInfo:'',
            Brand:'',
        },
        Variations: [],
        Items: []
    };
    //获取品牌
    var title = $("#name").text();
    itemInfo.ItemAttributes.Title = title;
    var brand =  $("span[itemprop=name]").children("bdi").text();
    itemInfo.ItemAttributes.Brand = brand;
    //获取头图
    var imageUrl = $("#iherb-product-image").attr("src");
    itemInfo.ItemAttributes.ImageUrl = imageUrl;

    //iherb都是单属性的，所以只存一个属性
    var attr = [];
    var item = {};
    //获取属性名
    $(".product-grouping-row").each(function(){
       var name =  $(this).children("label").text();
       var value = $(this).children("span").text();
       attr.push({
            N:name.replace(/[\'\"\\\/\b\f\n\r\t]/g, '').trim(),
            V:value
       });
    })
    item.Attr = attr;
    item.Unique = 'cn.iherb.' + goods_id;
    //获取金额字段
    item.Offers = [{
        "Merchant": {
            "Name":"iherb"
        },
        "List":[
            {
                "Price": $("#price").attr("content"),
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
        callback(body, error, response);
    })
}


