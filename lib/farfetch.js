const request = require('request');
const url  = require('url');
const querystring = require('querystring');
const cheerio = require('cheerio');
const md5 = require('md5');
const _ = require('lodash');
const eventproxy = require('eventproxy');
const fun = require('./fun');
const proxyRequest = require('./proxyRequestGuowai').proxyRequest;


var redis = require(process.cwd()+'/apps/lib/redis.js');
const NODE_ENV = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
const REDIS_KEY = 'farfetch:crawl:key';
const AUTH_URL = config.farfetch.auth+'/connect/token';//获取token&刷新token
const DETAIL_URL = config.farfetch.api+'/v1/products/';//查看商品详情

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        //https://www.farfetch.com/cn/shopping/men/nike-air-vapormax-flyknit--item-12624677.aspx
        ///cn/shopping/men/swear-nori-sneakers-item-12934772.aspx
        if(urlInfo.host.indexOf('farfetch') != -1){
            var exp = /cn\/.*?item-(\d*)\.aspx/ig;
            var res = exp.exec(urlInfo.path);
            var productId = res[1];

            return getItemInfo(urlStr, productId, callback);
        } else {
            return  callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'Host Error'
                }
            });
        }
    } catch (exception) {
        return  callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error'
            }
        });
    }
}

/*
 *内容处理
 **/
function getItemInfo(urlStr, productId, callback) {
    redis.get(REDIS_KEY, function (err, result) {
        if (err) {
            return err.message;
        }
        if(result){
            console.log(1);
            getProduct(result,urlStr,productId,callback);
        }else{
            console.log(2);
            authToken().then(function(result){
                console.log(3);
                getProduct(result,urlStr,productId,callback);
            }).catch(function(err){
                console.log(err);
                callback(err);
            });
        } 
    });
}

/** 授权登陆后获取token */
function authToken(){
    return new Promise((resolve, reject) =>{
        let option = {
            url: AUTH_URL,
            headers: [
            {
                name: 'content-type',
                value: 'application/x-www-form-urlencoded'
            }
            ],
            form: {
                grant_type: 'client_credentials',
                client_id: config.farfetch.clientId,
                client_secret: config.farfetch.clientSecret,
                scope: 'api'
            }
        };
        if(NODE_ENV == 'develop'){
            option.form.grant_type = 'password';
            option.form.username = config.farfetch.username;
            option.form.password = config.farfetch.password
        }
        console.log(option);
        request.post(option,function(error,response,body){
            if (!error && response.statusCode == 200) {
                let json = JSON.parse(body);
                redis.set(REDIS_KEY,json.token_type+' '+json.access_token,'EX', json.expires_in);
                resolve(json.token_type+' '+json.access_token);
            }else{
                reject();
            }
        });
    });
}

function getProduct(token,urlStr,productId,callback){
    var itemInfo = {
        Unique: '',
        Md5: '',
        Status: 'inStock',
        Url: urlStr,
        ItemAttributes: {
            Title: '',
            ShopName : 'farfetch',
            ShopId: 'cn.farfetch',
            ImageUrl: '',
        },
        Variations: [],
        Items: [],
        Coupon:[]
    };

    var color = {
        "Id": 1 ,
        "Name":"颜色",
        "Values":[]
    };
    var size = {
        "Id": 2 ,
        "Name":"尺码",
        "Values":[]
    };

    (async () => {
        try {
            //当前页面的数据
            request.get(DETAIL_URL+productId,{
                'headers':{
                    'FF-Country':'CN',
                    'FF-Currency':'CNY',
                    'Accept-Language': 'zh-CN',
                    'Authorization':token 
                }
            },function(error,response,body){
                if (!error && response.statusCode == 200) {
                    body = JSON.parse(body);
                    color.Values.push({
                                ValueId: body.id,
                                Name: body.colors[0].color.name,
                                ImageUrls : _.map(body.images.images.filter(x=>x.size == 600),function(x){return x.url})
                            });
                    itemInfo.Unique = 'cn.farfetch.' + body.id;
                    itemInfo.Variations.push(color);

                    color.Values.forEach(col => {
                        body.variants.forEach(row=>{
                            if(row.quantity > 0){//必须有货
                                let sizeName = body.description.indexOf('鞋') != -1?row.attributes[4].value + ' ' + body.gender + ' ' +row.attributes[1].value:row.attributes[1].value;
                                size.Values.push({
                                    ValueId:  size.Values.length + 1,
                                    Name: sizeName
                                });

                                if(row.price.currencyIsoCode == 'CNY'){//必须人民币计价
                                    itemInfo.Items.push({
                                        Unique: 'cn.farfetch.' +col.ValueId+'.'+(itemInfo.Items.length+1),
                                        Attr: [
                                            {
                                                'Nid': 1,
                                                'N': '颜色',
                                                'Vid': col.ValueId,
                                                'V':  col.Name
                                            },{
                                                'Nid': 2,
                                                'N': '尺码',
                                                'Vid':  (itemInfo.Items.length+1),
                                                'V':  sizeName
                                            }
                                        ],
                                        Offers: [{
                                            Merchant: {
                                                Name: 'farfetch',
                                            },
                                            List: [{
                                                Price: Math.ceil(row.price.priceInclTaxes),
                                                Type: 'RMB'
                                            }]
                                        }]
                                    })
                                }
                            }
                        });
                    });
                    itemInfo.Variations.push(size);

                    if (itemInfo.Items.length == 0) {
                        itemInfo.Status = 'outOfStock';
                        return callback(null, itemInfo);
                    }
                    itemInfo.ItemAttributes.Title = body.brand.name + ' ' + body.shortDescription;
                    itemInfo.ItemAttributes.ImageUrl = color.Values[0].ImageUrls[0];
                    itemInfo.Md5 = md5(JSON.stringify(itemInfo));

                    return callback(null, itemInfo);
                }else{//请求失败
                    console.log(error);
                    itemInfo.Status = 'notFind';
                    return callback(body?JSON.parse(body):error);
                }
            });
            
            // var $ = cheerio.load(body);
            // var patternSku = /__initialState_slice-pdp__\'\] = (.*?);<\/script/
            // if (skuResult = patternSku.exec(body)) {
            //     skuResult = JSON.parse(skuResult[1]);

            //     //写入所有sku数组
            //     allSkuResults.push(skuResult);
            // } else {
            //     throw new Error('body not found sku!');
            // }

            // //items 排序保证即使填的子商品不一样md5一致
            // allSkuResults.sort(function (a, b) {
            //     return a.productViewModel.details.productId -  b.productViewModel.details.productId;
            // })
            // var firstProductId = allSkuResults[0].productViewModel.details.productId;
            // allSkuResults.forEach(function (result) {
            //     let productViewModel = result.productViewModel;
            //     var tmpImgs = [];
            //     productViewModel.images.main.forEach(function (val) {
            //         tmpImgs.push(val[600]);
            //     })

            //     color.Values.push({
            //         ValueId: result.productViewModel.details.productId,
            //         Name: productViewModel.details.colors,
            //         ImageUrls : tmpImgs
            //     })
            //     _colorIndex = color.Values.length - 1;
            //     _(productViewModel.sizes.available).forEach(function (val, sizeKey) {
            //         let  gender = productViewModel.details.genderName;

            //         if (val.quantity > 0) {
            //             //鞋子区分男女码 uk us
            //             if (JSON.stringify(productViewModel).indexOf('鞋') != -1) {
            //                 var sizeName = productViewModel.sizes.friendlyScaleName +' '+gender+' '+ val.description;
            //             } else {
            //                 var sizeName =  val.description;
            //             }
            //             if (-1 == (_sizeIndex = _.findIndex(size.Values, {Name : val.description}))) {
            //                 size.Values.push({
            //                     ValueId:  size.Values.length + 1,
            //                     Name: sizeName
            //                 })
            //                 _sizeIndex  = size.Values.length - 1;
            //             }

            //             //item
            //             price =  sizeKey in productViewModel.priceInfo
            //                 ? productViewModel.priceInfo[sizeKey].finalPrice
            //                 : productViewModel.priceInfo.default.finalPrice;
            //             itemInfo.Items.push({
            //                 Unique: 'cn.farfetch.' +color.Values[_colorIndex].ValueId+'.'+size.Values[_sizeIndex].ValueId,
            //                 Attr: [
            //                     {
            //                         'Nid': 1,
            //                         'N': '颜色',
            //                         'Vid': color.Values[_colorIndex].ValueId,
            //                         'V':  color.Values[_colorIndex].Name
            //                     },{
            //                         'Nid': 2,
            //                         'N': '尺码',
            //                         'Vid':  size.Values[_sizeIndex].ValueId,
            //                         'V':  size.Values[_sizeIndex].Name
            //                     }
            //                 ],
            //                 Offers: [{
            //                     Merchant: {
            //                         Name: 'farfetch',
            //                     },
            //                     List: [{
            //                         Price: price,
            //                         Type: 'RMB'
            //                     }]
            //                 }]
            //             })
            //         }
            //     })
            // })

            // if (itemInfo.Items.length == 0) {
            //     itemInfo.Status = 'outOfStock';
            //     return callback(null, itemInfo);
            // }
            // //属性
            // itemInfo.Unique = 'cn.farfetch.' + firstProductId;
            // itemInfo.Variations.push(color);
            // itemInfo.Variations.push(size);
            // //基本信息
            // itemInfo.ItemAttributes.Title =  skuResult.productViewModel.details.shortDescription;
            // itemInfo.ItemAttributes.ImageUrl = color.Values[0].ImageUrls[0];

            // itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            // return callback(null, itemInfo);
        } catch(e) {
            return  callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": e.message
                }
            });
        }
    })();
}


// function getHtml(urlStrs) {
//     return new Promise((resolve, reject) => {
//         if (typeof urlStrs != 'object') {
//             urlStrs = [urlStrs];
//         }
//         //wait all requests
//         var ep = new eventproxy();
//         ep.after('getHtml', urlStrs.length, function (body) {
//             var contents = [];
//             var isError = false;
//             for (let i=0;i<body.length;i++) {
//                 if (body[i].err) {
//                     isError = body[i].err;
//                     break;
//                 } else {
//                     contents.push(body[i].body)
//                 }
//             }

//             if (isError) {
//                 reject(isError);
//             } else {
//                 resolve(contents);
//             }
//         })

//         //request
//         urlStrs.forEach(function (urlStr) {
//             urlStr = _.replace(urlStr, 'com', 'cn');
//             let options = {
//                 url: urlStr,
//                 gzip: true,
//                 timeout: 10000,
//                 headers: {
//                     'authority': 'www.farfetch.com',
//                     'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
//                     "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
//                     "accept-encoding": "gzip, deflate, br",
//                     "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
//                     "cache-control": "no-cache",
//                     "pragma": "no-cache",
//                     'upgrade-insecure-requests' : 1,
//                     "referer": "https://www.farfetch.com/cn/sets/men/new-in-this-week-eu-men.aspx",
//                     "cookie" : 'ub=; BIcookieID=ad2208aa-59b4-43d2-801f-5067609e778e; checkoutType2=4; _qubitTracker=1528083974205.672520; __gads=ID=17f592f5ae54140b:T=1528083987:S=ALNI_MZGrsOA97vz6g762UHSYramZAX6IA; _ga=GA1.2.615930167.1528083987; cto_lwid=76334cc5-8d48-438b-9ecf-6a6134c037e3; rskxRunCookie=0; rCookie=zgg0ornlw24njt3r03h5t; RES_TRACKINGID=77361750709938082; RecentView_FF=; SSP_AB_PDP_Design_20171215=Test; _br_uid_2=uid%3D2875528103966%3Av%3D11.8%3Ats%3D1528188514213%3Ahc%3D2; usr-gender=248; _sp_id.b865=a4714eb8-560a-4c11-97e1-66b360bc3492.1528188512.2.1529402508.1528188586.9823356f-91a3-4a77-baff-b3fdc594b3f8; _gcl_aw=GCL.1529723097.EAIaIQobChMIq8Hfqebo2wIVwxwqCh3UiwDOEAEYASAFEgLJl_D_BwE; _gac_UA-3819811-6=1.1529723100.EAIaIQobChMIq8Hfqebo2wIVwxwqCh3UiwDOEAEYASAFEgLJl_D_BwE; FF.Session=gadlt0sdq3qnjyvp5suxagy5; FFVIQSendUserID=; ResonanceSegment=; grtng-mssg={"isToDisplay":false,"type":2}; ckm-ctx-sf=/cn; FF.ApplicationCookie=3CQZ5TdTyFi17ydp_ZRTcpXRvvyyWqGyJKVr3wCnzsUxkCTh3KnBgIssWQ6NsZbyDb1tLSfc1lqfcsxGyoGrX5KcXe14HgO2kvkWRNbpQZahMdliY2uWWarmduHlKAHkH-7eYof0X6OOcfj6UacS-5iP8dteduZfJfc5_bPKjeyZFDAIFCuq_3ViUlqnK3CtBq2-JKmMkgOJhcM7Cc3axE-F5jNGZJwojPBXKT0BjDVL07cH; ABProduct=10:1#11:0#13:0#134:0#137:0#138:1#142:0#3:0#4:1#5:1#6:1#7:0#8:0#93:1; ABListing=122:1#35:2; ABLanding=139:0; ABCheckout=; TapadCookie_v2=true; _gid=GA1.2.66607571.1532500772; Hm_lvt_f2215c076b3975f65e029fad944be10a=1530770502; viq=farfetch; ABGeneral=1167:1#133:1#135:1#144:0#952:1; _qst_s=14; _qsst_s=1532504238299; _qst=%5B12%2C0%5D; _qPageNum_farfetch=0; _qsst=1532504241131; RES_SESSIONID=21702949424240523; Hm_lpvt_f2215c076b3975f65e029fad944be10a=1532504243; _gat_UA-3819811-6=1; qb_session=1:1:10:Csub=B:0:WTQXvSp:0:0:0:0:.farfetch.com; _uetsid=_uetad94f0a9; lastRskxRun=1532504245942; qb_permanent=1528083974205.672520:134:1:11:8:0::0:1:0:BbFLYP:BbWCix:::::137.59.101.152:hong%20kong:390:hong%20kong:HK:22.2759:114.167:unknown:unknown:hong%20kong:7310:migrated|1532504245007:Csub=Fc=CD=BS+D=Ga:B:WTQXwMP:WTQXvSp:0:0:0::0:0:.farfetch.com:0'
//                 }
//             };
//             proxyRequest(options, function (err, response, body) {
//                 console.log(urlStr, err);
//                 ep.emit('getHtml', {
//                     err : err,
//                     body : body,
//                 });
//             })
//         })
//     })
// }
