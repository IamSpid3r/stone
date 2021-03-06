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
    if(urlInfo.host == 'www.kaola.com' || urlInfo.host == 'www.kaola.com.hk'){
        var patt = /product\/([0-9]+)\.html/ig;

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
        var goods_id =  result[1];
        //api url
        var api_url = 'http://m.kaola.com/product/'+goods_id+'.html';
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

    var regexp = /(var __goodsInfo = [\s\S]*?)\nreturn/ig;
    result = regexp.exec(body);
    // console.log(result)
    if(!result){
        var notFoundReg = /404-找不到页面/ig;
        if(notFoundReg.exec(body)){//not found
            var itemInfo = {
                Unique: 'cn.kaola.' + goods_id,
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

    res = __goodsInfo;
    //callback(null, res);
    // 添加调取包税接口数据
    var categoryIds = res.goods.categoryIdList
    var itemInfo = {
        Unique: 'cn.kaola.' + goods_id,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: res.goods.title,
            ShopName : '考拉海购',
            ShopId: 'cn.kaola',
            ImageUrl: res.goods.imageUrl,


            // 添加调取包税接口数据
            // categoryId: res.goods.categoryIdList,
        },
        Variations: [],
        Items: []
    };

    if(res.goods.onlineStatus == 0){
        itemInfo.Status = 'outOfStock';
        callback(null, itemInfo);
        return ;
    }

    var attribute= [];                  //类型对应id
    // var color = {
    //     "Id": 1 ,
    //     "Name":"颜色",
    //     "Values":[]
    // };
    // var size = {
    //     "Id": 2 ,
    //     "Name":"尺码",
    //     "Values":[]
    // };
    var skuPropertyList = [];       //属性集合
    _(res.goods.skuGoodsPropertyList).forEach(function(property){
        _(property.propertyValues).forEach(function(propertyValues){
            skuPropertyList.push({
                propertyNameId  : property.propertyNameId,
                propertyName  : property.propertyNameCn,
                propertyValueId : propertyValues.propertyValueId,
                propertyValue : propertyValues.propertyValue,
                imageUrl  : propertyValues.imageUrlFor430,
            })
        })

        if(_.findIndex(attribute, {Name : property.propertyNameCn}) == -1){
            attribute.push({
                'Id' : property.propertyNameId,
                'Name' : property.propertyNameCn,
                "Values" : []
            })
        }
    })

    _(res.goods.skuList).forEach(function(sku){
        var item = {},
            attr = [];
        if(sku.actualStorageStatus == 1 && sku.actualStore > 0){
            sku.skuPropertyValueIdList.forEach(function(skuPropertyValueIdList){
                var propertyIndex = _.findIndex(skuPropertyList, {propertyValueId : skuPropertyValueIdList})
                if(propertyIndex != -1){
                    property =  skuPropertyList[propertyIndex];
                    attrIndex = _.findIndex(attribute, {Name : property.propertyName});

                    if(_.findIndex(attribute[attrIndex].Values,{"ValueId": property.propertyValueId}) == -1){
                        attribute[attrIndex].Values.push({
                            "ValueId": property.propertyValueId ,
                            "Name":    property.propertyValue
                        })
                    }

                    attr.push({
                        "Nid": attribute[attrIndex].Id,
                        "N":   attribute[attrIndex].Name,
                        "Vid": property.propertyValueId,
                        "V":   property.propertyValue
                    })
                }
            })

            //save goods info
            unique = '';
            attr.forEach(function(attrVal){
                if(!unique)  unique = 'cn.kaola.';
                unique += attrVal.Vid;
            })
            item.Unique = unique;
            item.Attr   = attr;
            item.Offers = [{
                "Merchant": {
                    "Name":"kaola"
                },
                "List":[
                    {
                        "Price": sku.actualCurrentPrice,
                        "Type": "RMB"
                    }
                ]
            }]

            itemInfo.Items.push(item);
        }
    })


    // 获取商品品牌，店铺名称
    // var getShopMain = function(){
    //     var defer = Q.defer();
    //     var name_url = 'http://www.kaola.com/product/'+goods_id+'.html' || 'http://www.kaola.com.ck/product/'+goods_id+'.html'
    //     getHtml(name_url, function(namebody, err){
    //         if(err){
    //             callback({
    //                 "Errors":{
    //                     'Code': 'Error',
    //                     "Message": err
    //                 }
    //             });
    //             return '';
    //         }
    //         try{
    //             var regexp = /(var __kaolaProductData = [\s\S]*?)\n<\/script>/ig;
    //             var nameresult = regexp.exec(namebody);
    //             eval(nameresult[1]);
    //
    //             shopMain = __kaolaProductData;
    //             // var shopName = shopMain.goods.shopInfo.shopName;
    //             // var shopHref = shopMain.goods.shopInfo.shopId;
    //
    //
    //             // itemInfo.ItemAttributes.ShopName = shopName
    //             // itemInfo.ItemAttributes.ShopId = shopHref
    //
    //         }catch(e){
    //             callback('shop name not a json');
    //             return '';
    //         }
    //         return defer.resolve({});
    //     })
    //     return defer.promise;
    // }

    // getShopMain().then(function(){
        // 添加包邮部分信息
        getHtml('https://www.kaola.com.hk/product/ajax/queryPromotionTitle.html?goodsId='+goods_id+'&categoryId='+categoryIds+'&t='+new Date().getTime(), function(body, err){
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
                body = JSON.parse(body);
            }catch(e){
                callback('price not json');
                return '';
            }

            var tax = body.data.hideDpReduceTax;
            if(tax) {
                itemInfo.ItemAttributes.Tax = 1.112
            }else {
                itemInfo.ItemAttributes.Tax = 1
            }


            // 加密部分。。执行最后的数据返回
            if(itemInfo.Items.length > 0){
                itemInfo.Variations = attribute;
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            }else{
                itemInfo.Status = 'outOfStock';
            }

            callback(null, itemInfo);
            return ;


        })

    // })
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


