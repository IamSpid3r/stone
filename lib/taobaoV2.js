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


var filterId = [];
var filterCategoryId = ['50012031', '50012043', '50012036', '50012038', '50012064', '50019272'] //鞋类分类
var taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');

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
    } else if (urlInfo.host == 'detail.tmall.hk' &&  (urlInfo.pathname == '/hk/item.htm' || urlInfo.pathname == '/item.htm') && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else if ((urlInfo.host == 'chaoshi.detail.tmall.com' || urlInfo.host == 'world.tmall.com') &&  urlInfo.pathname == '/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}


function getItemInfo(urlInfo, callback) {
    var api = 'mtop.taobao.detail.getdetail';
    var version = '6.0';
    var params = {
        "api" : api,
        'v' : version,
        'jsv': '2.4.8',
        'H5Request' : true,
        'AntiCreep' : true,
        'AntiFlood' : true,
        'isSec' : 0,
        "ecode" : 0,
        "ttid" : "2016@taobao_h5_2.0.0",
        "data" : {"itemNumId" : urlInfo.query.id},
    };

    var cookiePath = 'cookieV2.txt';
    taobaoToken(params , cookiePath, function (body, err) {
        if (err) {
            callback(err)
            return;
        }
        responseFirstJson = body;
        // callback(null, body);
        // return;
        if ('trade' in responseFirstJson.data && 'redirectUrl' in responseFirstJson.data.trade) {
            var itemInfo = {
                Unique: 'cn.taobao.' + urlInfo.query.id,
                Md5: '',
                Status: 'notFind',
                Url: 'https://item.taobao.com/item.htm?id=' + urlInfo.query.id,
                ItemAttributes: {
                    Title: '',
                    ShopName: '',
                    ShopId: '',
                    ImageUrl: '',
                    ImageUrls: [],
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
            Url: (responseFirstJson.data.seller.sellerType == 'B' ? 'https://detail.tmall.com/item.htm?id=' + urlInfo.query.id : 'https://item.taobao.com/item.htm?id=' + urlInfo.query.id),
            ItemAttributes: {
                Title: responseFirstJson.data.item.title,
                ShopName: responseFirstJson.data.seller.shopName,
                ShopId: typeof responseFirstJson.data.seller.shopId != 'undefined' ? 'cn.taobao.' + responseFirstJson.data.seller.shopId : null,
                ImageUrl: 'http:'+responseFirstJson.data.item.images[0],
                ImageUrls: responseFirstJson.data.item.images.map(function (val) {
                    return 'http:'+val;
                }),
                CategoryId: typeof responseFirstJson.data.item.categoryId != 'undefined' ? responseFirstJson.data.item.categoryId : null,
                StageInfo: '',
            },
            Variations: [],
            Items: []
        };

        var apiStackValue = JSON.parse(responseFirstJson.data.apiStack[0].value);
        // callback(null, apiStackValue);
        // return;
        if ('hintBanner' in apiStackValue.trade && 'text' in apiStackValue.trade.hintBanner) {
            if (
                apiStackValue.trade.hintBanner.text.indexOf('下架') != -1
                || apiStackValue.trade.hintBanner.text.indexOf('卖光') != -1
            ) {
                itemInfo.Status = 'outOfStock';
            }
        }

        //有sku
        if(typeof responseFirstJson.data.skuBase.props != 'undefined'){
            for (var i = 0; i <= responseFirstJson.data.skuBase.props.length - 1; i++) {
                var variation = {
                    'Id': responseFirstJson.data.skuBase.props[i].pid,
                    'Name': getVariationsName(responseFirstJson.data.skuBase.props[i].name),
                    'Values': []
                };
                // attrs[responseFirstJson.data.skuModel.skuProps[i].id] = {
                //     'Id': responseFirstJson.data.skuModel.skuProps[i].id,
                //     'Name': responseFirstJson.data.skuModel.skuProps[i].propName,
                //     'Values': {}
                // }
                for (var j = 0; j <= responseFirstJson.data.skuBase.props[i].values.length - 1; j++) {
                    if ("image" in responseFirstJson.data.skuBase.props[i].values[j]) {
                        variation.Values.push({
                            'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                            'Name': responseFirstJson.data.skuBase.props[i].values[j].name,
                            'ImageUrls': [ 'http:'+responseFirstJson.data.skuBase.props[i].values[j].image]
                        })
                    } else {
                        if(responseFirstJson.data.skuBase.props[i].name == '颜色分类'){
                            variation.Values.push({
                                'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                                'Name': responseFirstJson.data.skuBase.props[i].values[j].name,
                                'ImageUrls': responseFirstJson.data.item.images.map(function (val) {
                                    return 'http:'+val;
                                })
                            })
                        }else{
                            //var isFilter = filterWord(itemInfo.ItemAttributes.CategoryId, responseFirstJson.data.skuModel.skuProps[i].values[j].name);

                            //if(!isFilter){
                            variation.Values.push({
                                'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                                'Name': responseFirstJson.data.skuBase.props[i].values[j].name
                            })
                            //}else{
                            //  filterId.push(responseFirstJson.data.skuModel.skuProps[i].values[j].valueId);
                            //}
                        }
                    }
                };
                itemInfo.Variations.push(variation);
            };

            for (i in responseFirstJson.data.skuBase.skus) {
                //var isFilter = false;
                var item = {
                    Unique: 'cn.taobao.' + responseFirstJson.data.skuBase.skus[i].skuId,
                    Attr: [],
                    Offers: []
                }
                var itemKey = responseFirstJson.data.skuBase.skus[i].propPath;
                var itemAttrs = itemKey.split(';');
                // console.log(itemAttrs)
                //itemKey == 20549:28391;1627207:16384121
                for (var j = 0; j < itemAttrs.length; j++) {
                    var attrInfo = itemAttrs[j].split(':');
                    // attrInfo [20549,28391]
                    var a = _.findIndex(responseFirstJson.data.skuBase.props, {
                        'pid': attrInfo[0]
                    })
                    // a = {"propId":"20549","propName":"鞋码","values":[{"valueId":"28389","name":"40"},{"valueId":"28390","name":"41"},{"valueId":"28391","name":"42"},{"valueId":"28392","name":"43"},{"valueId":"28393","name":"44"}]}
                    // console.log(responseFirstJson.data.skuModel.skuProps[a])
                    var b = _.findIndex(responseFirstJson.data.skuBase.props[a].values, {
                        'vid': attrInfo[1]
                    });
                    // b = {"valueId":"28389","name":"40"}

                    item.Attr.push({
                        'Nid': responseFirstJson.data.skuBase.props[a].pid,
                        'N': getVariationsName(responseFirstJson.data.skuBase.props[a].name),
                        'Vid': responseFirstJson.data.skuBase.props[a].values[b].vid,
                        'V': responseFirstJson.data.skuBase.props[a].values[b].name
                    })

                    //验证属于过滤的id
                    //if(!isFilter){
                    //  isFilter  = filterId.indexOf(responseFirstJson.data.skuModel.skuProps[a].values[b].valueId) == -1
                    //    ? false : true;
                    //}
                }

                price = parseFloat(apiStackValue.skuCore.sku2info[0].price.priceText);

                var skuId = responseFirstJson.data.skuBase.skus[i].skuId;
                if(!apiStackValue.skuCore.hasOwnProperty('sku2info')
                    ||  !apiStackValue.skuCore.sku2info.hasOwnProperty(skuId)
                    ||  Number(apiStackValue.skuCore.sku2info[skuId].quantity) <= 0
                ){
                    continue;
                }
                if(skuId in apiStackValue.skuCore.sku2info){
                    price = parseFloat(apiStackValue.skuCore.sku2info[skuId].price.priceText);
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
                    Price: parseFloat(apiStackValue.skuCore.sku2info[0].price.priceText),
                    Type: 'RMB'
                }]
            };
            item.Offers.push(offer)
            itemInfo.Items.push(item);
        }


        //分期
        if('skuVertical' in apiStackValue && 'installment' in apiStackValue.skuVertical){
            itemInfo.ItemAttributes.StageInfo = apiStackValue.skuVertical.installment.title
        }

        if(itemInfo.Items.length == 0){
            itemInfo.Status = 'outOfStock';
        }
        itemInfo.Md5 = md5(JSON.stringify(itemInfo))
        callback(null, itemInfo);
        return;

    })
}

var getVariationsName = function(name){
   return (name == '颜色分类' || name == 'color' || name == '主要颜色') ? '颜色' : ((name == '鞋码' || name == 'size') ? '尺码' : name);
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

//兼容老图片 获取老图片地址
var  getOldImgpath = function (imgPath) {
    var regexp = /img\.alicdn\.com\/imgextra\/i(\d{1,})\/(.*)/ig;
    var res = regexp.exec(imgPath);

    if(res){
        var oldPath = 'http://gd'+res[1]+'.alicdn.com/bao/uploaded/i'+res[1]+'/'+res[2];
        return oldPath;
    }
    return imgPath;
}