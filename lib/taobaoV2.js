var request = require('request');
var _ = require('lodash');
var fs = require('fs');
var url = require('url');
var iconv = require('iconv-lite');
var md5 = require('md5');
var Q = require('q');

var filterId = [];
var filterCategoryId = ['50012031', '50012043', '50012036', '50012038', '50012064', '50019272'] //鞋类分类
var taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');
var provinces = [
    '北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆',
];
var existsAttrId = [];

const fun = require(process.cwd()+"/apps/lib/fun.js");

const NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var shopTicketKey = 'stone2018:shopTicket:'+fun.dateformat(new Date(), 'yyyy.MM.dd')+':';
var shopTicketFinishKey = 'stone2018:shopTicketFinish:'+fun.dateformat(new Date(), 'yyyy.MM.dd')+':';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var redisConfig = config.db.redis;
const redis = require('redis');
const redisClient = redis.createClient({
    host       : redisConfig.host,
    port       : redisConfig.port,
    db         : redisConfig.database,
    password   : redisConfig.password,
    connect_timeout : 3000
})
if (NODE_ENV) {
    var merchantTicket ='http://192.168.11.185:3012/info?url=';
} else {
    var merchantTicket ='http://10.168.194.5:3012/info?url=';
}



exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);
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
            return callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err
                }
            });
        }
        responseFirstJson = body;
        // callback(null, responseFirstJson);
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
                ShopName: 'shopName' in responseFirstJson.data.seller ? responseFirstJson.data.seller.shopName : '',
                ShopId: typeof responseFirstJson.data.seller.shopId != 'undefined' ? 'cn.taobao.' + responseFirstJson.data.seller.shopId : null,
                SellerId: typeof responseFirstJson.data.seller.userId != 'undefined' ?  responseFirstJson.data.seller.userId : null,
                ImageUrl: responseFirstJson.data.item.images[0],
                ImageUrls: responseFirstJson.data.item.images.map(function (val) {
                    return val;
                }),
                CategoryId: typeof responseFirstJson.data.item.categoryId != 'undefined' ? responseFirstJson.data.item.categoryId : null,
                StageInfo: '',
                Region: false,
                Subtitle: responseFirstJson.data.item.subtitle,
                ShopType: '普通'
            },
            Variations: [],
            Items: [],
            Coupon: {
                List: []
            },
        };
        // 税费部分判断
        var apiStackValue = JSON.parse(responseFirstJson.data.apiStack[0].value);
        try {
            var taxText = apiStackValue.vertical.inter.taxDesc[0].商品进口税
            for (var i in taxText) {
                if (taxText.hasOwnProperty(i)) { //filter,只输出man的私有属性
                    if (i.indexOf('预计') != -1) {
                        itemInfo.ItemAttributes.Tax = '1.119'
                    } else {
                        itemInfo.ItemAttributes.Tax = '1'
                    }
                }
                ;
            }
        } catch (e) {
            itemInfo.ItemAttributes.Tax = '1'
        }

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
        if (typeof responseFirstJson.data.skuBase.props != 'undefined') {
            for (var i = 0; i <= responseFirstJson.data.skuBase.props.length - 1; i++) {
                var variation = {
                    'Id': responseFirstJson.data.skuBase.props[i].pid,
                    'Name': getVariationsName(responseFirstJson.data.skuBase.props[i].name),
                    'Values': []
                };
                for (var j = 0; j <= responseFirstJson.data.skuBase.props[i].values.length - 1; j++) {
                    if ("image" in responseFirstJson.data.skuBase.props[i].values[j]) {
                        variation.Values.push({
                            'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                            'Name': responseFirstJson.data.skuBase.props[i].values[j].name,
                            'ImageUrls': [responseFirstJson.data.skuBase.props[i].values[j].image]
                        })
                    } else {
                        if (responseFirstJson.data.skuBase.props[i].name == '颜色分类') {
                            variation.Values.push({
                                'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                                'Name': responseFirstJson.data.skuBase.props[i].values[j].name,
                                'ImageUrls': responseFirstJson.data.item.images.map(function (val) {
                                    return val;
                                })
                            })
                        } else {
                            variation.Values.push({
                                'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                                'Name': responseFirstJson.data.skuBase.props[i].values[j].name
                            })
                        }
                    }
                }
                ;
                itemInfo.Variations.push(variation);
            }
            ;

            for (i in responseFirstJson.data.skuBase.skus) {
                //var isFilter = false;
                var item = {
                    Unique: 'cn.taobao.' + responseFirstJson.data.skuBase.skus[i].skuId,
                    Attr: [],
                    Offers: []
                }
                var itemKey = responseFirstJson.data.skuBase.skus[i].propPath;
                var itemAttrs = itemKey.split(';');
                for (var j = 0; j < itemAttrs.length; j++) {
                    var attrInfo = itemAttrs[j].split(':');
                    // attrInfo [20549,28391]
                    var a = _.findIndex(responseFirstJson.data.skuBase.props, {
                        'pid': attrInfo[0]
                    })
                    var b = _.findIndex(responseFirstJson.data.skuBase.props[a].values, {
                        'vid': attrInfo[1]
                    });

                    item.Attr.push({
                        'Nid': responseFirstJson.data.skuBase.props[a].pid,
                        'N': getVariationsName(responseFirstJson.data.skuBase.props[a].name),
                        'Vid': responseFirstJson.data.skuBase.props[a].values[b].vid,
                        'V': responseFirstJson.data.skuBase.props[a].values[b].name
                    })
                }

                price = parseFloat(apiStackValue.skuCore.sku2info[0].price.priceText);
                if ('subPrice' in apiStackValue.skuCore.sku2info[0]) {
                    //可能存在主价格被定金占用
                    price = parseFloat(apiStackValue.skuCore.sku2info[0].subPrice.priceText);
                }

                var skuId = responseFirstJson.data.skuBase.skus[i].skuId;
                if (!apiStackValue.skuCore.hasOwnProperty('sku2info')
                    || !apiStackValue.skuCore.sku2info.hasOwnProperty(skuId)
                    || Number(apiStackValue.skuCore.sku2info[skuId].quantity) <= 0
                ) {
                    continue;
                }
                if (skuId in apiStackValue.skuCore.sku2info) {
                    price = parseFloat(apiStackValue.skuCore.sku2info[skuId].price.priceText);
                }
                if ('subPrice' in apiStackValue.skuCore.sku2info[skuId]) {
                    //可能存在主价格被定金占用
                    price = parseFloat(apiStackValue.skuCore.sku2info[skuId].subPrice.priceText);
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
            }
            ;
        } else {
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
        if ('skuVertical' in apiStackValue && 'installment' in apiStackValue.skuVertical) {
            itemInfo.ItemAttributes.StageInfo = apiStackValue.skuVertical.installment.title
        }
        //去除没有sku的尺码
        itemInfo.Variations.forEach(function (variations, variationsIndex) {
            variations.Values.forEach(function (tmpArr, tmpIndex) {
                if (existsAttrId.indexOf(tmpArr.ValueId) == -1) {
                    delete  itemInfo.Variations[variationsIndex].Values[tmpIndex];
                }
            })
            itemInfo.Variations[variationsIndex].Values = itemInfo.Variations[variationsIndex].Values.filter(function (val) {
                if (val) return val;
            });
        })
        if (itemInfo.Items.length == 0) {
            itemInfo.Status = 'outOfStock';
            return callback(null, itemInfo);
        }

        //区域区分
        if ('delivery' in apiStackValue && 'showAreaChooser' in apiStackValue.delivery) {
            itemInfo.ItemAttributes.Region = true;
        }
        //优惠券[每个店铺每天只抓前十个渠道]
        if ('coupon' in apiStackValue.resource && 'couponList' in apiStackValue.resource.coupon) {
            var shopId = itemInfo.ItemAttributes.ShopId;
            var urlStr = itemInfo.Url;
            var shopTicketDateKey = shopTicketKey+shopId;
            var shopTicketFinishDateKey = shopTicketFinishKey+shopId;

            if (shopId) {
                isFinishCoupon(shopId).then(function (count) {
                    if (count >= 1) {
                        //已成功抓取的优惠券
                        getCouponList(shopId).then(function (couponList) {
                            //完成
                            if (count >= 10) {
                                itemInfo.Coupon.List = couponList;
                                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                                return callback(null, itemInfo);
                            }

                            //抓取优惠券
                            crawlCoupon(urlStr, function (err, result) {
                                if (err) {
                                    fun.stoneLog('taobaoCoupon', 'error', {
                                        'param' : err,
                                        'param1' : urlStr,
                                    })
                                } else {
                                    if (result.Status) {
                                        var newCoupon = result.Coupon.List;
                                        itemInfo.Coupon.List = newCoupon;
                                    } else {
                                        var newCoupon = [];
                                    }

                                    //写入redis
                                    redisClient.set(shopTicketFinishDateKey, Number(count) + 1, 'EX', 24 * 3600);
                                    //相同的
                                    intersectCoupon = _.intersectionBy(couponList, newCoupon, 'Id');
                                    redisClient.set(shopTicketDateKey, JSON.stringify(intersectCoupon), 'EX', 24 * 3600);
                                }
                                itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                                return callback(null, itemInfo);
                            });
                        }, function (err) {
                            return callback({
                                "Errors": {
                                    'Code': 'Error',
                                    "Message": err.message
                                }
                            });
                        }).then(function () {
                        },function (err) {
                            return callback({
                                "Errors": {
                                    'Code': 'Error',
                                    "Message": err.message
                                }
                            });
                        })
                    } else {
                        //抓取优惠券
                        crawlCoupon(urlStr, function (err, result) {
                            if (err) {
                                fun.stoneLog('taobaoCoupon', 'error', {
                                    'param' : err,
                                    'param1' : urlStr,
                                })
                            } else {
                                if (result.Status) {
                                    var newCoupon = result.Coupon.List;
                                    itemInfo.Coupon.List = newCoupon;
                                } else {
                                    var newCoupon = [];
                                }
                                //写入redis
                                redisClient.set(shopTicketFinishDateKey, count + 1, 'EX', 24 * 3600);
                                //相同的
                                redisClient.set(shopTicketDateKey, JSON.stringify(newCoupon), 'EX', 24 * 3600);
                            }
                            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                            return callback(null, itemInfo);
                        });
                    }
                }, function (err) {
                    return callback({
                        "Errors": {
                            'Code': 'Error',
                            "Message": err.message
                        }
                    });
                }).then(function () {
                },function (err) {
                    return callback({
                        "Errors": {
                            'Code': 'Error',
                            "Message": err.message
                        }
                    });
                })
            } else {
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                return callback(null, itemInfo);
            }
        } else {
            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            return callback(null, itemInfo);
        }
    })
}

var getVariationsName = function(name){
   return (name == '颜色分类' || name == 'color' || name == '主要颜色') ? '颜色' : ((name == '尺寸'  || name == '鞋码' || name == 'size') ? '尺码' : name);
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

//获取优惠券抓取是否完成
var  isFinishCoupon = function (shopId) {
    var deferred = Q.defer();
    var shopTicketFinishDateKey = shopTicketFinishKey+shopId;

    redisClient.get(shopTicketFinishDateKey, function (err, count) {
        if (err) {
            deferred.reject(err);
        }

        //有数据
        count = count != null ? count : 0;
        deferred.resolve(count);
    })

    return deferred.promise;
}

//获取存在的优惠券
var getCouponList = function (shopId) {
    var deferred = Q.defer();
    var shopTicketDateKey = shopTicketKey+shopId;

    redisClient.get(shopTicketDateKey, function (err, result) {
        if (err) {
            deferred.reject(err);
        }
        deferred.resolve(JSON.parse(result));
    })

    return deferred.promise;
}

//获取优惠券
var crawlCoupon = function (urlStr, callback) {
    request({
        url : merchantTicket+encodeURIComponent(urlStr),
        timeout : 5000
    }, function (err, response, body) {
        if (err) {
            callback(err.message);
        }
        var body = JSON.parse(body);
        if (!body.Status) {
            callback(body.Msg);
        }

        callback(null, body.Data);
    })
}