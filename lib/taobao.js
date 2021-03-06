var request = require('request');
var _ = require('lodash');
//var jschardet = require('jschardet');
var fs = require('fs');
var url = require('url');
var iconv = require('iconv-lite');
var md5 = require('md5');
var cheerio = require('cheerio');
var taobaoV2 = require('./taobaoV2');
var proxyRequest2 = require('./proxyRequest2');
// var FileCookieStore = require('tough-cookie-filestore');
// var tough = require('tough-cookie');
// var Cookie = tough.Cookie;
// var CookieJar = tough.CookieJar;

var filterId = [];
var filterCategoryId = ['50012031', '50012043', '50012036', '50012038', '50012064', '50019272'] //鞋类分类
var provinces = [
    '北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆',
];
var existsAttrId = [];
// var customCookies = require('../cookies/taobao.com.cus');

// if (fs.existsSync('./cookies/taobao.com.cookies') == false) {
//     fs.writeFileSync('./cookies/taobao.com.cookies', '');
// }
//设置用户cookie空间
// var cookieStore = new FileCookieStore('./cookies/taobao.com.cookies');
// var jar = new CookieJar(cookieStore);
// //携带用户定制的cookie
// for (var i = customCookies.length - 1; i >= 0; i--) {
//     var c = new Cookie({
//         key: customCookies[i].name,
//         value: customCookies[i].value,
//         domain: 'taobao.com'
//     });
//     jar.setCookieSync(c, 'http://www.taobao.com/');
// }
// //清空用户的自定义cookie
// fs.writeFileSync('./cookies/taobao.com.cus', '[]');


// var j = request.jar(cookieStore);
// request = request.defaults({
//         jar: j
//     })
    // request = request.defaults({ jar : j ,'proxy':'http://121.233.255.25:7777'})

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);
    if (['item.taobao.com', 'detail.tmall.com', 'detail.tmall.hk', 'chaoshi.detail.tmall.com', 'world.tmall.com'].indexOf(urlInfo.host) != -1
        && ['/item.htm', '/hk/item.htm'].indexOf(urlInfo.pathname) != -1
        && urlInfo.query.id
    ) {
        return getItemInfo(urlInfo, callback);
    } else {
        return callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}


function getItemInfo(urlInfo, callback) {
    proxyRequest({
        //url:'https://unszacs.m.taobao.com/h5/mtop.taobao.detail.getdetail/6.0/?api=mtop.taobao.detail.getdetail&v=6.0&ttid=2013%40taobao_h5_1.0.0&type=jsonp&dataType=json&data=%7B%22itemNumId%22%3A%22'+urlInfo.query.id +'%22%7D',
        url: 'http://hws.m.taobao.com/cache/wdetail/5.0/?id=' + urlInfo.query.id + '&ttid=2013@taobao_h5_1.0.0&exParams={}',
    },function(error, response, body,checkCallback){
        checkCallback(true);
    }, function(error, response, body) {
        // console.log(JSON.parse(body))
        try{
            var responseFirstJson = JSON.parse(body);
        }catch(exception){
            fs.writeFileSync('log.txt', body)
        }
        // callback(null,{'responseFirstJson':responseFirstJson})
        // return;
        if (responseFirstJson.ret[0] == 'ERRCODE_QUERY_DETAIL_FAIL::宝贝不存在') {
            var itemInfo = {
                Unique: 'cn.taobao.' + urlInfo.query.id,
                Md5: '',
                Status: 'notFind',
                Url: 'https://item.taobao.com/item.htm?id=' + urlInfo.query.id,
                ItemAttributes: {
                    Title: '',
                    ShopName: '',
                    ShopId: '',
                    ImageUrl:'',
                    ImageUrls:[]
                },
                Variations: [],
                Items: []
            };
            return callback(null, itemInfo);
        }

        var itemInfo = {
            Unique: 'cn.taobao.' + urlInfo.query.id,
            Md5: '',
            Status: 'inStock',
            Url: (responseFirstJson.data.seller.type == 'B' ? 'https://detail.tmall.com/item.htm?id=' + urlInfo.query.id : 'https://item.taobao.com/item.htm?id=' + urlInfo.query.id),
            ItemAttributes: {
                Title: responseFirstJson.data.itemInfoModel.title,
                ShopName: responseFirstJson.data.seller.shopTitle,
                ShopId:  typeof responseFirstJson.data.seller.shopId != 'undefined' ? 'cn.taobao.'+responseFirstJson.data.seller.shopId : null,
                ImageUrl: responseFirstJson.data.itemInfoModel.picsPath[0],
                ImageUrls: responseFirstJson.data.itemInfoModel.picsPath,
                CategoryId: typeof responseFirstJson.data.itemInfoModel.categoryId  != 'undefined' ? responseFirstJson.data.itemInfoModel.categoryId : null,
                StageInfo:'',
                Region : false,
            },
            Variations: [],
            Items: []
        };
        //店铺地址类型
        var shopType = '全球购';
        if (typeof responseFirstJson.data.itemInfoModel.location != 'undefined') {
            provinces.forEach(function (v) {
                if (responseFirstJson.data.itemInfoModel.location.indexOf(v) != -1) {
                    shopType = '普通';
                    return;
                }
            })
        }
        itemInfo.ItemAttributes.ShopType = shopType;


        var apiStackValue = JSON.parse(responseFirstJson.data.apiStack[0].value);
        // callback(null, apiStackValue);
        // return;
        if ('errorMessage' in apiStackValue.data.itemControl.unitControl) {
            if (
                apiStackValue.data.itemControl.unitControl.errorMessage == '已下架'
                || apiStackValue.data.itemControl.unitControl.errorMessage == '当前区域卖光了'
            ) {
                itemInfo.Status = 'outOfStock';
                callback(null, itemInfo);
                return;
            }
        }
        /*callback(null, apiStackValue);
         return;*/
        // var attrs = {};
        // callback(null,[responseFirstJson,apiStackValue]);return ;
        if(typeof responseFirstJson.data.skuModel.skuProps != 'undefined'){//没有sku
            for (var i = 0; i <= responseFirstJson.data.skuModel.skuProps.length - 1; i++) {
                var variation = {
                    'Id': responseFirstJson.data.skuModel.skuProps[i].propId,
                    'Name': getVariationsName(responseFirstJson.data.skuModel.skuProps[i].propName),
                    'Values': []
                };
                for (var j = 0; j <= responseFirstJson.data.skuModel.skuProps[i].values.length - 1; j++) {
                    if ("imgUrl" in responseFirstJson.data.skuModel.skuProps[i].values[j]) {
                        variation.Values.push({
                            'ValueId': responseFirstJson.data.skuModel.skuProps[i].values[j].valueId,
                            'Name': responseFirstJson.data.skuModel.skuProps[i].values[j].name,
                            'ImageUrls': [responseFirstJson.data.skuModel.skuProps[i].values[j].imgUrl]
                        })
                    } else {
                        if(responseFirstJson.data.skuModel.skuProps[i].propName == '颜色分类'){
                            variation.Values.push({
                                'ValueId': responseFirstJson.data.skuModel.skuProps[i].values[j].valueId,
                                'Name': responseFirstJson.data.skuModel.skuProps[i].values[j].name,
                                'ImageUrls': responseFirstJson.data.itemInfoModel.picsPath
                            })
                        }else{
                            variation.Values.push({
                                'ValueId': responseFirstJson.data.skuModel.skuProps[i].values[j].valueId,
                                'Name': responseFirstJson.data.skuModel.skuProps[i].values[j].name
                            })
                        }
                    }
                };
                itemInfo.Variations.push(variation);
            };

            for (i in responseFirstJson.data.skuModel.ppathIdmap) {
                //var isFilter = false;
                var item = {
                    Unique: 'cn.taobao.' + responseFirstJson.data.skuModel.ppathIdmap[i],
                    Attr: [],
                    Offers: []
                }
                var itemKey = i;
                var itemAttrs = itemKey.split(';');
                // console.log(itemAttrs)
                //itemKey == 20549:28391;1627207:16384121
                for (var j = 0; j < itemAttrs.length; j++) {
                    var attrInfo = itemAttrs[j].split(':');
                    // attrInfo [20549,28391]
                    var a = _.findIndex(responseFirstJson.data.skuModel.skuProps, {
                        'propId': attrInfo[0]
                    })
                    // a = {"propId":"20549","propName":"鞋码","values":[{"valueId":"28389","name":"40"},{"valueId":"28390","name":"41"},{"valueId":"28391","name":"42"},{"valueId":"28392","name":"43"},{"valueId":"28393","name":"44"}]}
                    // console.log(responseFirstJson.data.skuModel.skuProps[a])
                    var b = _.findIndex(responseFirstJson.data.skuModel.skuProps[a].values, {
                        'valueId': attrInfo[1]
                    });
                    // b = {"valueId":"28389","name":"40"}

                    item.Attr.push({
                        'Nid': responseFirstJson.data.skuModel.skuProps[a].propId,
                        'N': getVariationsName(responseFirstJson.data.skuModel.skuProps[a].propName),
                        'Vid': responseFirstJson.data.skuModel.skuProps[a].values[b].valueId,
                        'V': responseFirstJson.data.skuModel.skuProps[a].values[b].name
                    })
                }

                if(typeof apiStackValue.data.featureMap != 'undefined'){//聚划算
                    price = parseFloat(apiStackValue.data.itemInfoModel.priceUnits[0].rangePrice);
                }else{
                    var skuId = responseFirstJson.data.skuModel.ppathIdmap[i];
                    if(!apiStackValue.data.skuModel.hasOwnProperty('skus')
                        ||  !apiStackValue.data.skuModel.skus.hasOwnProperty(skuId)
                        || Number(apiStackValue.data.skuModel.skus[skuId].quantity <= 0 )
                    ){
                        continue;
                    }
                    price = parseFloat(apiStackValue.data.skuModel.skus[skuId].priceUnits[0].price);
                }

                //验证属于过滤的id
                item.Attr.forEach(function (tmpAttr) {
                    if (existsAttrId.indexOf(tmpAttr.Vid) == -1) {
                        existsAttrId.push(tmpAttr.Vid);
                    }
                })

                var offer = {
                    Merchant: {
                        Name: '淘宝',
                    },
                    List: [{
                        Price: price,
                        Type: 'RMB'
                    }]
                };
                item.Offers.push(offer)
                itemInfo.Items.push(item);
                //!isFilter && itemInfo.Items.push(item);
            };
        }else{
            var item = {
                Unique: 'cn.taobao.' + urlInfo.query.id,
                Attr: [],
                Offers: []
            }



            var offer = {
                Merchant: {
                    Name: '淘宝',
                },
                List: [{
                    Price: parseFloat(apiStackValue.data.itemInfoModel.priceUnits[0].price),
                    Type: 'RMB'
                }]
            };
            item.Offers.push(offer)
            itemInfo.Items.push(item);
        }

        if(itemInfo.Items.length == 0){
            itemInfo.Status = 'outOfStock';
        }
        //分期
        if('stageInfo' in apiStackValue.data && apiStackValue.data.stageInfo.title == '分期'){
            itemInfo.ItemAttributes.StageInfo = apiStackValue.data.stageInfo.descriptions.join('||');
        }
        //区域区分
        if('delivery' in apiStackValue.data && 'saleRegionInfo' in apiStackValue.data.delivery){
            itemInfo.ItemAttributes.Region = true;
        }
        //去除没有sku的尺码
        itemInfo.Variations.forEach(function (variations, variationsIndex) {
            variations.Values.forEach(function (tmpArr, tmpIndex) {
                if (existsAttrId.indexOf(tmpArr.ValueId) == -1) {
                    delete  itemInfo.Variations[variationsIndex].Values[tmpIndex];
                }
            })
            itemInfo.Variations[variationsIndex].Values = itemInfo.Variations[variationsIndex].Values.filter(function(val){
                if(val) return val;
            });
        })


        //状态用新版本价格
        taobaoV2.getInfo('https://item.taobao.com/item.htm?id=' + urlInfo.query.id, function(error, itemInfo2){
            if(error){
               return  callback(error);
            }
            priceSkuList = {};
            itemInfo2.Items.forEach(function (val) {
                priceSkuList[val.Unique] = val.Offers[0].List[0].Price;
            })
            itemInfo.Items.forEach(function (val, key) {
                if (val.Unique in priceSkuList) {
                    itemInfo.Items[key].Offers[0].List[0].Price = priceSkuList[val.Unique];
                }
            })
            itemInfo.ItemAttributes.Subtitle = itemInfo2.ItemAttributes.Subtitle;
            itemInfo.ItemAttributes.Tax = itemInfo2.ItemAttributes.Tax;
            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            return callback(null, itemInfo);
        })
        //副标题
        /*proxyRequest2({
            encoding: null,
            url : 'https://detail.m.tmall.com/item.htm?id='+ urlInfo.query.id,
        }, function (err, response, body) {
            if (!err && body) {
                body = iconv.decode(body, 'gbk')
                var $ = cheerio.load(body);

                var subtitle = _.trim($('.subtitle').text(), "\"\n ");
                var regexp = /(var _DATA_Mdskip = [\s\S]*?)\<\/script>/ig;
                result = regexp.exec(body);
                if (!result) {
                    itemInfo.ItemAttributes.Tax = 1;
                }else{
                    try {
                        eval(result[1]);
                    } catch (exception) {
                        callback({
                            "Errors": {
                                'Code': 'Error',
                                "Message": exception.message
                            }
                        });
                        return;
                    }
                    res = _DATA_Mdskip;
                    var inter = 'vertical' in res ? res.vertical.inter : null;
                    if (!inter) {
                        itemInfo.ItemAttributes.Tax = 1;
                    } else {
                        if (inter.tariff.value.indexOf('元') >= 0) {
                            itemInfo.ItemAttributes.Tax = 1.112;
                        } else {
                            itemInfo.ItemAttributes.Tax = 1;
                        }
                    }
                }
                itemInfo.ItemAttributes.Subtitle = subtitle;
            }

            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            callback(null, itemInfo);
            return;


            // if (!err && body) {
            //     body = iconv.decode(body, 'gbk')
            //     var $ = cheerio.load(body);
            //
            //     var subtitle = _.trim($('.subtitle').text(), "\"\n ");
            //
            //     itemInfo.ItemAttributes.Subtitle = subtitle;
            // }
            //
            // itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            // callback(null, itemInfo);
            // return;
        });*/


        //暂时天猫淘宝 都试用
        //if (responseFirstJson.data.seller.type == 'B' || 1) {
        //     proxyRequest({
        //         url: 'https://mdskip.taobao.com/core/initItemDetail.htm?household=false&cartEnable=true&service3C=false&itemId=' + urlInfo.query.id + '&t='+ new Date().getTime(),
        //         headers: {
        //             'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
        //             'referer': 'https://detail.tmall.com/item.htm?spm=a220m.1000858.1000725.1.9bJPSD&id=' + urlInfo.query.id
        //         },
        //         encoding: null
        //     }, function(error, response, body, callbackStatus) {
        //         //校验抓取结果是否正常。不正常callbackStatus(flase)
        //         if(!body)
        //         {
        //             callbackStatus(false);
        //             return;
        //         }
        //         var body = iconv.decode(body, 'gbk');
        //         //如果是限制ip了就返回false
        //         if (body.indexOf("window.location.href='https://sec.taobao.com/query.htm") == 0) {
        //             callbackStatus(false)
        //         } else {
        //             callbackStatus(true)
        //         }
        //
        //     }, function(error, response, body) {
        //         //抓取成功
        //         var body = iconv.decode(body, 'gbk');
        //         // console.log(body)
        //         // callback(null,body)
        //         // return;
        //         try{
        //             var responseSecondJson = JSON.parse(body);
        //         }catch(exception){
        //             callback({
        //                 "Errors":{
        //                     'Code': 'Error',
        //                     "Message": 'responseSecondJson error '+exception
        //                 }
        //             });
        //             return;
        //         }
        //         // callback(null,responseSecondJson)
        //         // return;
        //
        //
        //         for (i in responseFirstJson.data.skuModel.ppathIdmap) {
        //
        //             var item = {
        //                 Unique: 'cn.taobao.' + responseFirstJson.data.skuModel.ppathIdmap[i],
        //                 Attr: [],
        //                 Offers: []
        //             }
        //             var index = _.findIndex(itemInfo.Items,{Unique:'cn.taobao.' + responseFirstJson.data.skuModel.ppathIdmap[i]})
        //
        //             var offer = {
        //                 Merchant: {
        //                     Name: 'Taobao',
        //                 },
        //                 List: [{
        //                     Price: parseInt(responseSecondJson.defaultModel.itemPriceResultDO.priceInfo[responseFirstJson.data.skuModel.ppathIdmap[i]].promotionList[0].price),
        //                     Type: 'RMB'
        //                 }]
        //             };
        //             itemInfo.Items[index].Offers.push(offer)
        //         };
        //         itemInfo.Md5 = md5(JSON.stringify(itemInfo))
        //         // callback(null, itemInfo)
        //             callback(null,{'item':itemInfo,'responseFirstJson':responseFirstJson,'responseSecondJson':responseSecondJson})
        //         return;
        //
        //     })


        // } else {
        //纯淘宝才能用这里
        // request(
        //     {
        //         url:'https://detailskip.taobao.com/json/sib.htm?itemId='+urlInfo.query.id+'&sellerId='+responseFirstJson.data.seller.userNumId+'&prior=1&p=1&',
        //         headers:{
        //             'referer':'https://item.taobao.com/item.htm?id='+urlInfo.query.id+'&ali_refid=a3_420434_1006:1110891320:N:%E7%94%B7%E4%BF%9D%E6%9A%96%E5%86%85%E8%A1%A3:9f7672f0aeaec3b2695edb9a18d9fbd6&ali_trackid=1_9f7672f0aeaec3b2695edb9a18d9fbd6&spm=a230r.1.0.0.VW8zvz'
        //         },
        //         encoding: null
        //     },function(error,response,body){
        //         var body = iconv.decode(body,'gbk');
        //         // callback(null,{'body':body})
        //         // return;
        //         var taobaoGconfig = (function(body){
        //             var g_config = {};
        //             try {
        //                 eval(body)
        //             } catch (exception) {
        //                 console.log("eval:");
        //                 console.log(exception);
        //             }
        //             return g_config;
        //         })(body)

        //         var itemInfo = {
        //             Unique:'cn.taobao.'+urlInfo.query.id,
        //             Md5:'',
        //             Url:urlInfo.href,
        //             ItemAttributes:{
        //                 Title:responseFirstJson.data.itemInfoModel.title
        //             },
        //             Variations:[],
        //             Items:[]
        //         };
        //         // var attrs = {};
        //         for (var i = 0;i <= responseFirstJson.data.skuModel.skuProps.length - 1; i++) {
        //             var variation = {
        //                 'Id':responseFirstJson.data.skuModel.skuProps[i].propId,
        //                 'Name':responseFirstJson.data.skuModel.skuProps[i].propName,
        //                 'Values':[]
        //             };
        //             // attrs[responseFirstJson.data.skuModel.skuProps[i].id] = {
        //             //     'Id': responseFirstJson.data.skuModel.skuProps[i].id,
        //             //     'Name': responseFirstJson.data.skuModel.skuProps[i].propName,
        //             //     'Values': {}
        //             // }
        //             for (var j = 0; j <= responseFirstJson.data.skuModel.skuProps[i].values.length - 1; j++) {
        //                 if("imgUrl" in responseFirstJson.data.skuModel.skuProps[i].values[j])
        //                 {
        //                     variation.Values.push({
        //                         'ValueId':responseFirstJson.data.skuModel.skuProps[i].values[j].valueId,
        //                         'Name':responseFirstJson.data.skuModel.skuProps[i].values[j].name,
        //                         'ImageUrl':responseFirstJson.data.skuModel.skuProps[i].values[j].imgUrl
        //                     })
        //                 }else{
        //                     variation.Values.push({
        //                         'ValueId':responseFirstJson.data.skuModel.skuProps[i].values[j].valueId,
        //                         'Name':responseFirstJson.data.skuModel.skuProps[i].values[j].name
        //                     })
        //                 }
        //             };
        //             itemInfo.Variations.push(variation);
        //         };

        //         for (i in responseFirstJson.data.skuModel.ppathIdmap) {

        //             var item = {
        //                 Unique:'cn.taobao.'+responseFirstJson.data.skuModel.ppathIdmap[i],
        //                 Attr:[],
        //                 Offers:[]
        //             }
        //             var itemKey = i;
        //             var itemAttrs = itemKey.split(';');
        //             // console.log(itemAttrs)
        //             //itemKey == 20549:28391;1627207:16384121
        //             for (var j = 0; j < itemAttrs.length; j++) {
        //                 var attrInfo = itemAttrs[j].split(':');
        //                 // attrInfo [20549,28391]
        //                 var a = _.findIndex(responseFirstJson.data.skuModel.skuProps,{'propId':attrInfo[0]})
        //                 // a = {"propId":"20549","propName":"鞋码","values":[{"valueId":"28389","name":"40"},{"valueId":"28390","name":"41"},{"valueId":"28391","name":"42"},{"valueId":"28392","name":"43"},{"valueId":"28393","name":"44"}]}
        //                 // console.log(responseFirstJson.data.skuModel.skuProps[a])
        //                 var b = _.findIndex(responseFirstJson.data.skuModel.skuProps[a].values,{'valueId':attrInfo[1]});
        //                 // b = {"valueId":"28389","name":"40"}
        //                 item.Attr.push({
        //                     'Nid':responseFirstJson.data.skuModel.skuProps[a].propId,
        //                     'N':responseFirstJson.data.skuModel.skuProps[a].propName,
        //                     'Vid':responseFirstJson.data.skuModel.skuProps[a].values[b].valueId,
        //                     'V':responseFirstJson.data.skuModel.skuProps[a].values[b].name
        //                 })
        //             }

        //             var offer = {
        //                 Merchant:{
        //                     Name:'Taobao',
        //                 },
        //                 List:[
        //                 {
        //                     Price:parseInt(taobaoGconfig.PromoData[';'+itemKey+';'][0].price),
        //                     Type:'RMB'
        //                 }
        //                 ]
        //             };
        //             item.Offers.push(offer)
        //             itemInfo.Items.push(item);
        //         };
        //         itemInfo.Md5 = md5(JSON.stringify(itemInfo.Items))
        //         // callback(null,itemInfo)
        //         callback(null,{'taobaoGconfig':taobaoGconfig,'itemInfo':itemInfo,'responseFirstJson':responseFirstJson})
        // })
        // }
    })
}
var proxyRequest= function(options,testCallback,callback)
{
    var run = function() {
        request('http://121.41.100.22:3333/proxyGet?add=1', function (err, response, body) {
            if (err) {
                return callback(err)
            }
            var data = JSON.parse(body);
            if (data.status == 'notIp') {
                setTimeout(function () {
                    run()
                }, 1000);
                console.log('setTimeout')
                return;
            }

            if (data.Ip.Ip) {
                newOptions = {};
                newOptions = options;
                newOptions.proxy = 'http://' + data.Ip.Ip + ':4321';
                newOptions.timeout = 10000;

                console.log('proxy ' + newOptions.proxy)
                request(newOptions, function (error, response, body) {
                    if (error) {
                        console.log('proxyRequest error' + error.message + JSON.stringify(newOptions));
                        return proxyRequest(options, testCallback, callback);
                    }
                    if (body.indexOf('COW Proxy') != -1) {
                        console.log('COW Proxy error');
                        return proxyRequest(options, testCallback, callback);
                    }

                    //抓取结果进行 testCallback 处理 根据 testCallback 来决定
                    testCallback(error, response, body, function (status, modifyOptions) {
                        //if (status == true) {
                            return callback(error, response, body)
                        //}
                        // } else {
                        //     //post error ip
                        //     console.log('ip 被封禁需要换ip')
                        //     request.post({
                        //         url: 'http://121.41.100.22:3333/proxyDel',
                        //         form: {'ip': data.Ip.Ip}
                        //     }, function (err, response, body) {
                        //         if (err) {
                        //             console.log('change ip error', err)
                        //         }
                        //         if (typeof modifyOptions == 'object') {
                        //             options = _.assign(options, modifyOptions);
                        //         }
                        //         proxyRequest(options, testCallback, callback);
                        //     })
                        // }
                    }, options)
                })
            }
        })
    }


    var urlParsed = url.parse(options.url);
    var proxyHost = "http-dyn.abuyun.com";
    var proxyPort = "9020";
    var proxyUser = "H1B70L4D3801OSOD";
    var proxyPass = "96FA7DBB0020A1E6";

    var base64 = new Buffer(proxyUser + ":" + proxyPass).toString("base64");
    var newOptions = {
        url : 'http://'+proxyHost+":"+proxyPort+urlParsed.path,
        headers : {
            "Host"                : urlParsed.hostname,
            "Proxy-Authorization" : "Basic " + base64
        },
    };
    request(newOptions, function (error, response, body) {
        if (error || response.statusCode != 200) {
            console.log(error || response.statusCode);
            run();
        } else {
            callback(error, response, body)
            return;
        }
    })

    //run();
}

var getVariationsName = function(name){
    return (name == '颜色分类' || name == 'color') ? '颜色' : ((name == '尺寸' ||name == '鞋码' || name == 'size') ? '尺码' : name);
}

//过滤鞋类尺寸没有数字的尺寸
var filterWord = function (categoryId, text) {
    if(filterCategoryId.indexOf(categoryId) != -1){
        var reg = /\d{2,}/gi;
        return !reg.exec(text);
    }else{
        return false;
    }
};