// // 识货代码元逻辑
// var request      = require('request');
// var url          = require('url');
// var querystring  = require('querystring');
// var cheerio      = require('cheerio');
// var md5          = require('md5');
// var _            = require('lodash');
//
// var proxyRequest = require('./proxyRequest').proxyRequest;
//
// exports.getInfo = function(urlStr, callback) {
//     var urlInfo = url.parse(urlStr, true, true);
//     if(urlInfo.host == 'www.kaola.com'){
//         var patt = /product\/([0-9]+)\.html/ig;
//
//         result = patt.exec(urlInfo.path);
//         if (!result) {
//             callback({
//                 "Errors":{
//                     'Code': 'Fatal',
//                     "Message": 'url error no math goods id'
//                 }
//             });
//             return ;
//         }
//         var goods_id =  result[1];
//
//         //api url
//         var api_url = 'http://m.kaola.com/product/'+goods_id+'.html';
//         getHtml(api_url, function(body, err, response){
//             if(err){
//                 callback({
//                     "Errors":{
//                         'Code': 'Error',
//                         "Message": err
//                     }
//                 });
//                 return ;
//             }
//
//             if(body && response.statusCode == 200){
//                 getItemInfo({body : body, goods_id : goods_id, url:urlStr} , callback);
//             }else{
//                 callback({
//                     "Errors":{
//                         'Code': 'Error',
//                         "Message": 'body null or status code not equal 200'
//                     }
//                 });
//                 return ;
//             }
//         })
//     }else{
//         callback({
//             "Errors":{
//                 'Code': 'Fatal',
//                 "Message": 'url error'
//             }
//         });
//         return ;
//     }
// }
//
//
//  // *内容处理
//
// function getItemInfo(params, callback) {
//     var goods_id = params.goods_id,
//         body     = params.body,
//         url      = params.url;
//
//     var regexp = /(var __goodsInfo = [\s\S]*?)\nreturn/ig;
//     result = regexp.exec(body);
//     if(!result){
//         var notFoundReg = /404-找不到页面/ig;
//         if(notFoundReg.exec(body)){//not found
//             var itemInfo = {
//                 Unique: 'cn.kaola.' + goods_id,
//                 Md5: '',
//                 Status: 'notFind',
//                 Url: url,
//                 ItemAttributes: {},
//                 Variations: [],
//                 Items: []
//             };
//             callback(null, itemInfo);
//             return ;
//         }else{// regexp error
//             callback({
//                 "Errors":{
//                     'Code': 'Error',
//                     "Message": 'goods not found'
//                 }
//             });
//             return ;
//         }
//     }
//
//     try {
//         eval(result[1]);
//     } catch (exception) {
//         callback({
//             "Errors":{
//                 'Code': 'Error',
//                 "Message": exception
//             }
//         });
//         return ;
//     }
//
//     res = __goodsInfo;
//     //callback(null, res);
//     var itemInfo = {
//         Unique: 'cn.kaola.' + goods_id,
//         Md5: '',
//         Status: 'inStock',
//         Url: url,
//         ItemAttributes: {
//             Title: res.goods.title,
//             ShopName : '考拉海购',
//             ShopId: 'cn.kaola',
//             ImageUrl: res.goods.imageUrl
//         },
//         Variations: [],
//         Items: []
//     };
//
//     if(res.goods.onlineStatus == 0){
//         itemInfo.Status = 'outOfStock';
//         callback(null, itemInfo);
//         return ;
//     }
//
//     var attribute= [];                  //类型对应id
//     // var color = {
//     //     "Id": 1 ,
//     //     "Name":"颜色",
//     //     "Values":[]
//     // };
//     // var size = {
//     //     "Id": 2 ,
//     //     "Name":"尺码",
//     //     "Values":[]
//     // };
//     var skuPropertyList = [];       //属性集合
//     _(res.goods.skuGoodsPropertyList).forEach(function(property){
//         _(property.propertyValues).forEach(function(propertyValues){
//             skuPropertyList.push({
//                 propertyNameId  : property.propertyNameId,
//                 propertyName  : property.propertyNameCn,
//                 propertyValueId : propertyValues.propertyValueId,
//                 propertyValue : propertyValues.propertyValue,
//                 imageUrl  : propertyValues.imageUrlFor430,
//             })
//         })
//
//         if(_.findIndex(attribute, {Name : property.propertyNameCn}) == -1){
//             attribute.push({
//                 'Id' : property.propertyNameId,
//                 'Name' : property.propertyNameCn,
//                 "Values" : []
//             })
//         }
//     })
//
//     _(res.goods.skuList).forEach(function(sku){
//         var item = {},
//             attr = [];
//         if(sku.actualStorageStatus == 1 && sku.actualStore > 0){
//             sku.skuPropertyValueIdList.forEach(function(skuPropertyValueIdList){
//                 var propertyIndex = _.findIndex(skuPropertyList, {propertyValueId : skuPropertyValueIdList})
//                 if(propertyIndex != -1){
//                     property =  skuPropertyList[propertyIndex];
//                     attrIndex = _.findIndex(attribute, {Name : property.propertyName});
//
//                     if(_.findIndex(attribute[attrIndex].Values,{"ValueId": property.propertyValueId}) == -1){
//                         attribute[attrIndex].Values.push({
//                             "ValueId": property.propertyValueId ,
//                             "Name":    property.propertyValue
//                         })
//                     }
//
//                     attr.push({
//                         "Nid": attribute[attrIndex].Id,
//                         "N":   attribute[attrIndex].Name,
//                         "Vid": property.propertyValueId,
//                         "V":   property.propertyValue
//                     })
//                 }
//             })
//
//             //save goods info
//             unique = '';
//             attr.forEach(function(attrVal){
//                 if(!unique)  unique = 'cn.kaola.';
//                 unique += attrVal.Vid;
//             })
//             item.Unique = unique;
//             item.Attr   = attr;
//             item.Offers = [{
//                 "Merchant": {
//                     "Name":"kaola"
//                 },
//                 "List":[
//                     {
//                         "Price": sku.actualCurrentPrice,
//                         "Type": "RMB"
//                     }
//                 ]
//             }]
//
//             itemInfo.Items.push(item);
//         }
//     })
//
//     if(itemInfo.Items.length > 0){
//         itemInfo.Variations = attribute;
//         itemInfo.Md5 = md5(JSON.stringify(itemInfo));
//     }else{
//         itemInfo.Status = 'outOfStock';
//     }
//
//     callback(null, itemInfo);
//     return ;
// }
//
//
//
//  // *获取html
// function getHtml(urlStr, callback){
//     proxyRequest({
//         url: urlStr,
//         headers: {
//             'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
//             "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*!/!*;q=0.8',
//             "Accept-Language":"zh-CN,zh;q=0.8",
//             "Cache-Control":"no-cache",
//             "Connection":"keep-alive",
//             "Pragma":"no-cache"
//         }
//         // proxy: 'http://172.16.13.177:8888'
//         //encoding: null
//     }, function(error, response, body, callbackStatus) {
//         if(!error){
//             if (body.indexOf('Please retry your requests at a slower rate') > 0) {
//                 callbackStatus(false);
//             } else {
//                 callbackStatus(true);
//             }
//         }else{
//             callbackStatus(false)
//         }
//     }, function(error, response, body) {
//         callback(body, error, response);
//     })
// }
var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');
var eventproxy = require('eventproxy');


var Q            = require('q');

var proxyRequest = require('./proxyRequest2');

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

            if(body){
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
    var regexp2 = /window.(__Goods__ = [\s\S]*?)\nwindow\.__Newcomer__/ig;

    result = regexp.exec(body);
    result2 = regexp2.exec(body);

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
        eval(result2[1]);
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
    res2 = __Goods__;

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
            VenderType : res2.selfGoods ? '自营' : '普通'
            // 添加调取包税接口数据
            // categoryId: res.goods.categoryIdList,
        },
        Variations: [],
        Items: [],
        Coupon:''
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
            var unique = '';
            attr.forEach(function(attrVal){
                if(!unique)  unique = 'cn.kaola.';
                unique += attrVal.Vid;
            })
            if(!unique){
                unique = 'cn.kaola.'+goods_id;
            }
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
            }];
            item.Subtitle = [];

            itemInfo.Items.push(item);
        }
    })

    var ep = new eventproxy();

    if (res2.selfGoods){
        var ep_length = 3;
    } else {
        var ep_length = 4;
    }
    ep.after('info', ep_length, function (info) {
            callback(null, itemInfo);
            return ;
    })

    if (!res2.selfGoods){//非自营
        //获取店铺名称
        getHtml("https://www.kaola.com/product/"+goods_id+".html", function(body, err){
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
                    var exp = /f-toe.*title="(.*)".*href="http:\/\/mall.kaola.com\/(\d+)"/ig;
                    var res = exp.exec(body);
                    if (res){
                        itemInfo.ItemAttributes.ShopId += '.'+res[2];
                        itemInfo.ItemAttributes.ShopName = res[1];
                    }
                }catch(e){
                    callback('获取店铺id和名称有误 '+ e.message);
                    return '';
                }
                ep.emit('info', []);
            });
    }
    //获取优惠券
    getHtml('https://m.kaola.com/product/queryCouponInfo.html?goodsId='+goods_id+'&t='+new Date().getTime(), function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }
        itemInfo.Coupon = {"List": []};
        try{
            body = JSON.parse(body);
        }catch(e){
            callback('coupon not json');
            return '';
        }
        if (body.body.couponDetailList != null && body.body.couponDetailList.length > 0){
            try{
                body.body.couponDetailList.forEach(function(coupon){
                    var quota = 0;
                    if (coupon.condition != '无金额门槛'){
                        quota = coupon.condition.replace(/满￥/g, "").replace(/使用/g, "");
                    }
                    var couponDate = coupon.couponUseTime.split("至");
                    itemInfo.Coupon.List.push({
                        "Id":coupon.redeemCode,
                        "Amount":[coupon.amount,quota],
                        "Date":[couponDate[0].replace(/\./g, "-")+" 00:00:00",couponDate[1].replace(/\./g, "-")+" 23:59:59"],
                        "Category": "normal"
                    });
                })
            }catch(e){
                callback('抓取优惠券有误 '+ e.message);
                return '';
            }
            
        }
        ep.emit('info',[]);
    })

    //促销信息
    getHtml('https://m.kaola.com/product/queryPromotionNew.html?goodsId='+goods_id+'&t='+new Date().getTime()+'&categoryId=0&provinceCode=310000&cityCode=310100&districtCode=310101', function(body, err){
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
            callback('promotion not json');
            return '';
        }
        var promotion = [];
        if (body.body.goodsPromotionResult4WapNew != undefined){
            if (body.body.goodsPromotionResult4WapNew.goodsPromotionResult4Wap.memberGoodsDiscount != null){
                promotion.push({Name:body.body.goodsPromotionResult4WapNew.goodsPromotionResult4Wap.memberGoodsDiscount});
            } else if(body.body.goodsPromotionResult4WapNew.goodsPromotionResult4Wap.memberCurrentPrice != null){
                promotion.push({Name:'黑卡价¥'+body.body.goodsPromotionResult4WapNew.goodsPromotionResult4Wap.memberCurrentPrice});
            }
            body.body.goodsPromotionResult4WapNew.goodsPromotionResult4Wap.cuxiaoPromotionTagList.forEach(function(promotionarr){
                promotion.push({Name:promotionarr.promotionTitle});
            })
            itemInfo.Items.forEach(function(item,row_index){
                itemInfo.Items[row_index].Subtitle = promotion;
            })
        }
        ep.emit('info',[]);
    })


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
        // var taxNum = body.data.goodsTaxAmount;
        // if(taxNum == null || taxNum == undefined || taxNum == '') {
        //     console.log('9999')
        //     itemInfo.ItemAttributes.Tax = 1
        // }else {
        //     console.log('0000')
        //     itemInfo.ItemAttributes.Tax = 1.119
        // }
        // var tax = body.data.hideDpReduceTax;
        // if(tax) {
        //     itemInfo.ItemAttributes.Tax = 1
        // }else {
        //     itemInfo.ItemAttributes.Tax = 1.119
        // }

        var tax = body.data.hideDpReduceTax;        //是否包税
        var taxNum = body.data.goodsTaxAmount;      //详细税费的值
        if(tax) {   //是否考拉包税的判断
            itemInfo.ItemAttributes.Tax = 1
        }else {     //税费的详细值为空的判断
            if(taxNum == null || taxNum == undefined || taxNum == '') {
                itemInfo.ItemAttributes.Tax = 1
            }else {
                itemInfo.ItemAttributes.Tax = 1.119
            }
        }



        // 加密部分。。执行最后的数据返回
        if(itemInfo.Items.length > 0){
            itemInfo.Variations = attribute;
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        }else{
            itemInfo.Status = 'outOfStock';
        }
        ep.emit('info', []);
     })
}

function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache"
        }
    }, function(error, response, body) {
        callback(body, error);
    })
    // var options = {
    //     url: urlStr,
    //     headers: {
    //         'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
    //         "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //         "Accept-Encoding":"deflate, sdch",
    //         "Accept-Language":"zh-CN,zh;q=0.8",
    //         "Cache-Control":"no-cache",
    //         "Connection":"keep-alive",
    //         "Pragma":"no-cache"
    //     }
    // };
    // request(options,function(error,response,body) {
    //     if (body.indexOf("您访问的页面不存在") != -1) {
    //         callback(body, '不存在');
    //     } else {
    //      callback(body, error);
    //     }
    // });
 }



