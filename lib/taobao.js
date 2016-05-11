var request = require('request');
var _ = require('lodash');
var jschardet = require('jschardet');
var fs = require('fs');
var phantom = require('phantom');
var url = require('url');
var iconv = require('iconv-lite');
var md5 = require('md5');

var FileCookieStore = require('tough-cookie-filestore');
var tough = require('tough-cookie');
var Cookie = tough.Cookie;
var CookieJar = tough.CookieJar;
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
    if (urlInfo.host == 'item.taobao.com' && urlInfo.pathname == '/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else if (urlInfo.host == 'detail.tmall.com' &&  urlInfo.pathname == '/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else if (urlInfo.host == 'detail.tmall.hk' &&  urlInfo.pathname == '/hk/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    }else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}


function getItemInfo(urlInfo, callback) {


    proxyRequest({
        url: 'http://hws.m.taobao.com/cache/wdetail/5.0/?id=' + urlInfo.query.id + '&ttid=2013@taobao_h5_1.0.0&exParams={}',
    },function(error, response, body,checkCallback){
        checkCallback(true);
    }, function(error, response, body) {
        // console.log(JSON.parse(body))
        fs.writeFileSync('log.txt',body)
        var responseFirstJson = JSON.parse(body);
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
                },
                Variations: [],
                Items: []
            };
            callback(null, itemInfo);
            return;
        }

        var itemInfo = {
            Unique: 'cn.taobao.' + urlInfo.query.id,
            Md5: '',
            Status: 'inStock',
            Url: (responseFirstJson.data.seller.type == 'B' ? 'https://detail.tmall.com/item.htm?id=' + urlInfo.query.id : 'https://item.taobao.com/item.htm?id=' + urlInfo.query.id),
            ItemAttributes: {
                Title: responseFirstJson.data.itemInfoModel.title,
                ShopName: responseFirstJson.data.seller.shopTitle,
                ShopId:  'cn.taobeo.'+responseFirstJson.data.seller.shopId,
                ImageUrl: responseFirstJson.data.itemInfoModel.picsPath[0]
            },
            Variations: [],
            Items: []
        };
        var apiStackValue = JSON.parse(responseFirstJson.data.apiStack[0].value);
        if ('errorMessage' in apiStackValue.data.itemControl.unitControl) {
            if (apiStackValue.data.itemControl.unitControl.errorMessage == '已下架') {
                itemInfo.Status = 'outOfStock';
            }
        }
        /*callback(null, apiStackValue);
        return;*/
        // var attrs = {};
       // callback(null,responseFirstJson);return ;
        if(typeof responseFirstJson.data.skuModel.skuProps != 'undefined'){//没有sku
            for (var i = 0; i <= responseFirstJson.data.skuModel.skuProps.length - 1; i++) {
                var variation = {
                    'Id': responseFirstJson.data.skuModel.skuProps[i].propId,
                    'Name': getVariationsName(responseFirstJson.data.skuModel.skuProps[i].propName),
                    'Values': []
                };
                // attrs[responseFirstJson.data.skuModel.skuProps[i].id] = {
                //     'Id': responseFirstJson.data.skuModel.skuProps[i].id,
                //     'Name': responseFirstJson.data.skuModel.skuProps[i].propName,
                //     'Values': {}
                // }
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
                    if(typeof apiStackValue.data.skuModel.skus[responseFirstJson.data.skuModel.ppathIdmap[i]] == 'undefined'){
                        continue;
                    }
                    price = parseFloat(apiStackValue.data.skuModel.skus[responseFirstJson.data.skuModel.ppathIdmap[i]].priceUnits[0].price);
                }

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

        itemInfo.Md5 = md5(JSON.stringify(itemInfo))
        // callback(null,{'item':itemInfo,'responseFirstJson':responseFirstJson})
        callback(null, itemInfo);
        return;

        //暂时天猫淘宝 都试用
        if (responseFirstJson.data.seller.type == 'B' || 1) {
            proxyRequest({
                url: 'https://mdskip.taobao.com/core/initItemDetail.htm?household=false&cartEnable=true&service3C=false&itemId=' + urlInfo.query.id + '&t='+ new Date().getTime(),
                headers: {
                    'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
                    'referer': 'https://detail.tmall.com/item.htm?spm=a220m.1000858.1000725.1.9bJPSD&id=' + urlInfo.query.id
                },
                encoding: null
            }, function(error, response, body, callbackStatus) {
                //校验抓取结果是否正常。不正常callbackStatus(flase)
                if(!body)
                {
                    callbackStatus(false);
                    return;
                }
                var body = iconv.decode(body, 'gbk');
                //如果是限制ip了就返回false
                if (body.indexOf("window.location.href='https://sec.taobao.com/query.htm") == 0) {
                    callbackStatus(false)
                } else {
                    callbackStatus(true)
                }

            }, function(error, response, body) {
                //抓取成功
                var body = iconv.decode(body, 'gbk');
                // console.log(body)
                // callback(null,body)
                // return;
                try{
                    var responseSecondJson = JSON.parse(body);
                }catch(exception){
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": 'responseSecondJson error '+exception
                        }
                    });
                    return;
                }
                // callback(null,responseSecondJson)
                // return;
                

                for (i in responseFirstJson.data.skuModel.ppathIdmap) {

                    var item = {
                        Unique: 'cn.taobao.' + responseFirstJson.data.skuModel.ppathIdmap[i],
                        Attr: [],
                        Offers: []
                    }
                    var index = _.findIndex(itemInfo.Items,{Unique:'cn.taobao.' + responseFirstJson.data.skuModel.ppathIdmap[i]})

                    var offer = {
                        Merchant: {
                            Name: 'Taobao',
                        },
                        List: [{
                            Price: parseInt(responseSecondJson.defaultModel.itemPriceResultDO.priceInfo[responseFirstJson.data.skuModel.ppathIdmap[i]].promotionList[0].price),
                            Type: 'RMB'
                        }]
                    };
                    itemInfo.Items[index].Offers.push(offer)
                };
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                // callback(null, itemInfo)
                    callback(null,{'item':itemInfo,'responseFirstJson':responseFirstJson,'responseSecondJson':responseSecondJson})
                return;

            })


        } else {
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
        }
    })
}
var proxyRequest= function(options,testCallback,callback)
{
    var run = function()
    {
        request('http://121.41.45.190:3333/proxyGet?add=1',function(err,response,body){
            if(err){
                callback(err)
                return;
            }
            var data = JSON.parse(body);
            // data = {status:"ok",Ip:{Ip:''}}
            // data.Ip.Ip = "222.189.183.119";

            if(data.status == 'notIp')
            {
                setTimeout(function(){
                    run()
                },1000);
                console.log('setTimeout')

                return;
            }
            if(data.Ip.Ip)
            {
                options.proxy = 'http://'+data.Ip.Ip+':4321';
                console.log('proxy '+options.proxy)
                options.timeout = 10000;
                request(options,function(error,response,body){
                    if(error)
                    {
                        console.log('proxyRequest error'+error);
                        proxyRequest(options,testCallback,callback);
                        return;
                    }
                    if(body.indexOf('COW Proxy') != -1)
                    {
                        console.log('COW Proxy error');
                        proxyRequest(options,testCallback,callback);
                        return;
                    }

                    //抓取结果进行 testCallback 处理 根据 testCallback 来决定
                    testCallback(error,response,body,function(status,modifyOptions){
                        if(status == true)
                        {
                            callback(error,response,body)
                        }else{
                            //post error ip
                            console.log('ip 被封禁需要换ip')
                            request.post({
                                url:'http://121.41.45.190:3333/proxyDel',
                                form:{'ip':data.Ip.Ip}
                            },function(err,response,body){
                                if(err)
                                {
                                    console.log('change ip error',err)
                                }
                                if(typeof modifyOptions == 'object')
                                {
                                    options = _.assign(options,modifyOptions);
                                }
                                proxyRequest(options,testCallback,callback);
                            })
                        }
                    },options)
                })
            }
        })
    }
    run();
}

var getVariationsName = function(name){
   return (name == '颜色分类') ? '颜色' : ((name == '鞋码') ? '尺码' : name);
}