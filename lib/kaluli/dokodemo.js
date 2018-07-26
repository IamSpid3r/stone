var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');
var eventproxy = require('eventproxy');
var Q            = require('q');
// var proxyRequest = require('./proxyRequest2');
var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    //获取shop_id
    getShopId(urlStr,function (body, err) {
        console.log(111)
        console.log(err)
        if (err) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err
                }
            });
            return;
        }
        var patt = /var shop_id = \'([0-9]+)\'/ig;
        var result = patt.exec(body);
        if (!result) {
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'url error no math shop id'
                }
            });
            return ;
        }
        var shop_id = result[1];
        patt = /products\/([0-9]+)/ig;
        result = patt.exec(urlStr);
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
        var api = 'https://dokodemo.world/api/product/';
        var param = {
            product_id:goods_id,
            global_id:2
        };

        getHtml(api, param, function (body, err) {
            console.log(222)
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }
            var text = _.trim(body);
            text = JSON.parse(text);
            var product_group_id = text.data.product.product_group_id;
            if (text.result != true || text.data.product == undefined) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": 'API返回错误'
                    }
                });
                return;
            }
            var param = {
                product_group_id: text.data.product.product_group_id,
                country_id: 344,
                shop_id: shop_id,
                global_id: 2
            }
            var api = 'https://dokodemo.world/api/product_class/';
            getHtml(api,param, function (body, err) {
                if (err) {
                    callback({
                        "Errors": {
                            'Code': 'Error',
                            "Message": err
                        }
                    });
                    return;
                }
                var text2 = _.trim(body);
                text2 = JSON.parse(text2);

                if (text2.result != true) {
                    callback({
                        "Errors": {
                            'Code': 'Error',
                            "Message": text2.error.join(',')
                        }
                    });
                    return;
                }
                var itemInfo = {
                    Unique: 'world.dokodemo.' + goods_id,
                    Md5: '',
                    Status: 'inStock',
                    Url: urlStr,
                    ItemAttributes: {
                        Title: text.data.product.name,
                        ShopName : '日本直邮',
                        ShopId: 'world.dokodemo',
                        ImageUrl: 'https://d89ge5hfdpmo8.cloudfront.net/mall/'+text.data.product.main_image,
                        Tax:1
                    },
                    Variations: [],
                    Items: [],
                    Coupon:''
                };
                var variation1 = {};
                var variation2 = {};
                console.log(Object.keys(text2.data['class1']).length)
                if (Object.keys(text2.data['class1']).length > 0) {
                    var valueId = 100000;
                    variation1.Id = 1;
                    variation1.Name = text.data.product.class_name1;
                    var values = [];
                    for( var i in text2.data['class1'] ){
                        var value = {};
                        value.ImageUrls = [];
                        value.ValueId = valueId;
                        value.Name = text2.data['class1'][i]['classcategory_name1'];
                        value.ImageUrls.push('https://d89ge5hfdpmo8.cloudfront.net/mall/'+text2.data['class1'][i]['class_thumbnail_image']);
                        values.push(value);
                        valueId++
                    }
                    variation1.Values = values;
                }
                if (Object.keys(text2.data['class2']).length > 0) {
                    var valueId = 200000;
                    variation2.Id = 2;
                    variation2.Name = text.data.product.class_name2;
                    var values = [];
                    for( var i in text2.data['class2'] ){
                        var value = {};
                        value.ImageUrls = [];
                        value.ValueId = valueId;
                        value.Name = text2.data['class2'][i]['classcategory_name2'];
                        value.ImageUrls.push('https://d89ge5hfdpmo8.cloudfront.net/mall/'+text2.data['class1'][i]['class_thumbnail_image']);
                        values.push(value);
                        valueId++
                    }
                    variation2.Values = values;
                }
                Object.keys(variation1).length && itemInfo.Variations.push(variation1);
                Object.keys(variation2).length && itemInfo.Variations.push(variation2);
                //拼凑item
                var productIds = [];//准备抓价格
                for( var i in text2.data['relation'] ){
                    if (text2.data['relation'][i]['shop_stock_flg'] == 1) {
                        var item = {
                            "Unique": "world.dokodemoe." + text2.data['relation'][i]['product_id'],
                            "Attr": [],
                            "Offers": [{
                                "Merchant": {
                                    "Name": "dokodemoe"
                                },
                                "List": [
                                    {
                                        "Price": '',
                                        "Type": "HKD"
                                    }
                                ]
                            }]
                        };
                        if (text2.data['relation'][i]['classcategory_name1']) {
                            var attr = {};
                            attr.Nid = 1;
                            attr.N = text.data.product.class_name1;
                            variation1.Values.forEach(function (value) {
                                if (value.Name == text2.data['relation'][i]['classcategory_name1']) {
                                    attr.Vid = value.ValueId;
                                }
                            })
                            attr.V = text2.data['relation'][i]['classcategory_name1'];
                            item.Attr.push(attr);
                        }
                        if (text2.data['relation'][i]['classcategory_name2']) {
                            var attr = {};
                            attr.Nid = 2;
                            attr.N = text.data.product.class_name2;
                            variation2.Values.forEach(function (value) {
                                if (value.Name == text2.data['relation'][i]['classcategory_name2']) {
                                    attr.Vid = value.ValueId;
                                }
                            })
                            attr.V = text2.data['relation'][i]['classcategory_name2'];
                            item.Attr.push(attr);
                        }
                        itemInfo.Items.push(item);
                        productIds.push(text2.data['relation'][i]['product_id']);
                    }
                }
                if (productIds.length == 0) {
                    itemInfo.Status = "outOfStock";
                    callback(null, itemInfo);
                    return '';
                }
                var ep = new eventproxy();
                productIds.forEach(function (id) {
                    var api = 'https://dokodemo.world/zh-Hans/es/products/'+id;
                    console.log(api);
                    getShopId(api, function (body1, err) {
                        if (err) {
                            console.log(err)
                            ep.emit('get_price',false);
                            return '';
                        }
                        console.log(id);
                        var $ = cheerio.load(body1);
                        var price = $('.p-products-infoArea__price__sale').attr('content');
                        for(var i in itemInfo.Items) {
                            if (itemInfo.Items[i].Unique == 'world.dokodemoe.'+id) {
                                console.log('equal');
                                itemInfo.Items[i].Offers[0].List[0].Price = price;
                                break;
                            }
                        }
                        ep.emit('get_price',true);
                    })
                })
                ep.after('get_price', productIds.length, function(list){
                    var res = true
                    for(var i in list) {
                        if (!list[i]) {
                            res = false;
                            break;
                        }
                    }
                    if (res) {
                        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                        callback(null, itemInfo);
                    } else {
                        callback({
                            "Errors": {
                                'Code': 'Error',
                                "Message": '抓取价格失败'
                            }
                        });
                    }

                    return;
                });
            });
        });
    })

}
function getHtml(urlStr,param, callback){
    noProxyRequest({
        url: urlStr,
        timeout: 10000,
        formData:param,
        method:"POST",
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache",
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
function getShopId(urlStr,callback){
    noProxyRequest({
        url: urlStr,
        timeout: 10000,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache",
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
//代理会很慢，这里不开代理
function noProxyRequest(options,callback) {
    request(options, callback);
}