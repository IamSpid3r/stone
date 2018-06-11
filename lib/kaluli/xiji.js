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
    if(urlInfo.host == 'www.xiji.com'){
        var patt = /product\-([0-9]+)\.html/ig;
        var result = patt.exec(urlInfo.path);
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
        var api_url = 'http://www.xiji.com/product-ajax_product_price-' + goods_id + '.html';
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
                try{
                    var bodys = JSON.parse(body)//json化返回数据
                }catch (exception){
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": exception.message
                        }
                    });
                    return '';
                }
                //组合返回的值
                var itemInfo = {
                    Unique: 'cn.xijie.' + goods_id,
                    Md5: '',
                    Status: 'inStock',
                    Url: urlInfo.href,
                    ItemAttributes: {
                        Title: bodys.productBasic.title,
                        ShopName : '西集网',
                        ShopId: 'cn.xiji',
                        ImageUrl: '',
                        Tax: 1,
                    },
                    Variations: [],
                    Items: []
                };
                // 组装Variations
                var skuTypes = bodys.productBasic.spec.product
                var skuTypeItems = bodys.productBasic.spec.goods.en_US
                for(var key in skuTypes){
                    var attr = {}
                    attr.Id = key;
                    attr.Name = '空';
                    attr.Values = [];
                    for(var item in skuTypeItems[key]){
                        // console.log(item)
                        var value = {};
                        value.ValueId = item;
                        value.Name = skuTypeItems[key][item].spec_value
                        attr.Values.push(value);
                    }
                    itemInfo.Variations.push(attr);
                }
                // 组装Items
                var goodsMains = bodys.productBasic.spec.goods
                for(var key in skuTypes){
                    var goodsMainsItems = goodsMains[key]
                    console.log(goodsMainsItems)
                    if(goodsMainsItems != 'undefined'){
                        console.log(1)
                    }else{
                        console.log(2)
                    }
                }


                callback(null, itemInfo);
                return ;

            }else{
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": 'body null or status code not equal 200'
                    }
                });
                return ;
            }
        })//获取商品sku接口数据
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
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        timeout : 5000,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Content-Type":"text/html",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Content-Encoding":"gzip",
            "charset":"UTF-8",
            "Connection":"keep-alive",
            "Pragma":"no-cache"
        }
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


