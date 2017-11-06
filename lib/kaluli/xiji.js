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
        //api url
        var api_url = 'http://m.xiji.com/wap/product-'+goods_id+'.html';
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
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var goods_id = params.goods_id,
        body     = params.body,
        url      = params.url;
    //获取标题
    var titleregexp = /\<div class\=\"xj-goods-name\"\>([\s\S]*?)\<\/div\>/ig;
    var title = titleregexp.exec(body);
    // //获取价格
    // var regexp = /(var __goodsInfo = [\s\S]*?)\nreturn/ig;
    // var priceregexp = /\<b class\=\"price\"\>\<sub\>\￥\<\/sub\>([\s\S]*?)\<\/b\>/ig;
    // var price = priceregexp.exec(body);
    // 获取图片
    var imgarearegexp = /\<div class\=\"swiper\-wrapper\"\>([\s\S]*?)\<\/div\>/ig;
    var imgarea = imgarearegexp.exec(body);
    var imgurlregexp = /\<img src\=\"([\s\S]*?)\"/ig
    var imgurl = imgurlregexp.exec(imgarea)
    if(!title){
        var notFoundReg = /404-找不到页面/ig;
        if(notFoundReg.exec(body)){//not found
            var itemInfo = {
                Unique: 'cn.xijie.' + goods_id,
                Md5: '',
                Status: 'notFind',
                Url: url,
                ItemAttributes: {},
                Variations: [],
                Items: []
            };
            callback(null, itemInfo);
            return ;
        }else{// regexp error
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'goods not found'
                }
            });
            return ;
        }
    }
    try {
        // eval(result[1]);
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception
            }
        });
        return ;
    }
    // 添加调取包税接口数据
    // var categoryIds = res.goods.categoryIdList
    var itemInfo = {
        Unique: 'cn.xijie.' + goods_id,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: title[1],
            ShopName : '考拉海购',
            ShopId: 'cn.kaola',
            ImageUrl: imgurl[1],
            Tax: '0',


            // 添加调取包税接口数据
            // categoryId: res.goods.categoryIdList,
        },
        Variations: [],
        Items: []
    };


    //获取pc站网页，组件items数据
    var getPcmain = function(){
        var defer = Q.defer();
        getHtml('http://www.xiji.com/product-'+goods_id+'.html', function(pcbody, err){
            if(err){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return '';
            }
            try{
                // 将页面转换成可以取到dom的格式
                var $ = cheerio.load(pcbody);
                // 组装Variations数据
                $('#product_spec .spec-area .spec-item').each(function(){
                    var attr = {}
                    attr.Id = ''
                    attr.Name = $(this).find('.item-label i').text()
                    attr.Values = [];
                    $(this).find('li').each(function () {
                        var value = {};
                        value.ValueId = ''
                        value.Name = $(this).find('span').text()
                        attr.Values.push(value);
                    })
                    itemInfo.Variations.push(attr);
                })

                // 组装items数据
                $('#product_spec .spec-area .spec-item:first-child ul li').each(function () {
                    // 两层规格。先确定首层规格的所有商品id
                    if($(this).hasClass('selected')){
                        var val1 = {}
                        val1.Nid = ''
                        val1.N = $('#product_spec .spec-area .spec-item:first-child .item-label i').text()
                        val1.Vid = ''
                        val1.V = $(this).find('span').text()


                        $('#product_spec .spec-area .spec-item:nth-child(2) ul li').each(function () {
                            var info = {}
                            if($(this).hasClass('selected')){
                                info.Unique = 'cn.xiji.' + goods_id
                            }else{
                                info.Unique = 'cn.xiji.' + $(this).find('a').attr('rel')
                            }
                            info.attr = []
                            info.Offers =[{
                                "Merchant": {
                                    "Name":"beibei"
                                },
                                "List":[
                                    {
                                        // "Price": '',
                                        "Type": "RMB"
                                    }
                                ]
                            }]
                            info.attr.push(val1)

                            var val2 = {}
                            val2.Nid = ''
                            val2.N = $('#product_spec .spec-area .spec-item:nth-child(2) .item-label i').text()
                            val2.Vid = ''
                            val2.V = $(this).find('span').text()
                            info.attr.push(val2)
                            // 获取价格
                            /*var itemss = itemInfo.Items
                            for(var i = 0; i<itemss.length; i++){
                                var shopid = itemss[i].Unique
                                var shop_idregexp = /cn\.xiji\.(.*)/;
                                var shop_idobj = shop_idregexp.exec(shopid)
                                var shop_id = shop_idobj[1]
                                var api_urls = 'http://m.xiji.com/wap/product-'+shop_id+'.html';
                                getHtml(api_urls, function (bodyprice, err) {
                                    if(err){
                                        callback({
                                            "Errors":{
                                                'Code': 'Error',
                                                "Message": err
                                            }
                                        });
                                        return ;
                                    }
                                    try{
                                        var priceregexp = /\<b class\=\"price\"\>\<sub\>\￥\<\/sub\>([\s\S]*?)\<\/b\>/ig;
                                        var price = priceregexp.exec(bodyprice);
                                        var p = price[1]
                                        console.log(p)
                                        // itemInfo.Items.Offers.List.Price = price[1]
                                        // itemInfo.Items.Offers.List.push({
                                        //     'Price': p
                                        // })
                                        callback('shabi')
                                    }catch(e){
                                        callback('price not json');
                                        return '';
                                    }
                                })
                            }*/
                            itemInfo.Items.push(info);
                        })
                    }

                })
            }catch(e){
                callback('cant get shop sku message');
                return '';
            }
            return defer.resolve({});
        })



        return defer.promise;
    }
    getPcmain().then(function(){
        // 数据加密
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
    })
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


