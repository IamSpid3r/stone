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

const fun = require(process.cwd()+"/apps/lib/fun.js");
const NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
if (NODE_ENV) {
    var merchantTicket ='http://192.168.11.185:3012/info';
} else {
    var merchantTicket ='http://10.168.194.196:3012/info';
}



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
    var existsAttrId = [];
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
                ImageUrl: getRealImg(responseFirstJson.data.item.images[0]),
                ImageUrls: responseFirstJson.data.item.images.map(function (val) {
                    return getRealImg(val);
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
                        itemInfo.ItemAttributes.Tax = '1.112'
                    } else {
                        itemInfo.ItemAttributes.Tax = '1'
                    }
                }
                ;
            }
        } catch (e) {
            itemInfo.ItemAttributes.Tax = '1'
        }
        //
        // callback(null, apiStackValue);
        // return;
        //特殊价格
        var specialPrice = false;
        if ('extraPrices' in apiStackValue.price) {
            apiStackValue.price.extraPrices.forEach(function (priceType) {
                if (priceType.priceTitle == '狂欢价') {
                    specialPrice = priceType.priceText;
                }
            })
            if (specialPrice) {
                itemInfo.ItemAttributes.hasActivity = specialPrice;
                itemInfo.ItemAttributes.hasA = 1;
            }
        }
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
                            'ImageUrls': [getRealImg(responseFirstJson.data.skuBase.props[i].values[j].image)]
                        })
                    } else {
                        if (responseFirstJson.data.skuBase.props[i].name == '颜色分类') {
                            variation.Values.push({
                                'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                                'Name': responseFirstJson.data.skuBase.props[i].values[j].name,
                                'ImageUrls': responseFirstJson.data.item.images.map(function (val) {
                                    return getRealImg(val);
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
                itemInfo.Variations.push(variation);
            }

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
        } else {
            var item = {
                Unique: 'cn.taobao.' + urlInfo.query.id,
                Attr: [],
                Offers: []
            }

            let price = parseFloat(apiStackValue.skuCore.sku2info[0].price.priceText);
            if ('subPrice' in apiStackValue.skuCore.sku2info[0]) {
                //可能存在主价格被定金占用
                price = parseFloat(apiStackValue.skuCore.sku2info[0].subPrice.priceText);
            }

            var offer = {
                Merchant: {
                    Name: '淘宝',
                },
                List: [{
                    Price: parseFloat(price),
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

        //618津贴
        if ('coupon' in apiStackValue.resource && 'couponList' in apiStackValue.resource.coupon) {
            apiStackValue.resource.coupon.couponList.forEach(function (couponVal) {
                var textFee = /领津贴每满(\d*)减(\d*)/.exec(couponVal.title);
                if (textFee) {
                    Jintie = [
                        {
                            Id : md5(couponVal.title),
                            Amount : [textFee[2], textFee[1]],
                            Date: ['2018-06-01 00:00:00', '2018-06-20 23:59:59'],
                            Category : 'none',
                            Args : {
                                ApplyText: '618购物津贴',
                                Subtitles: [couponVal.title],
                            },
                            Type : 'jintie'
                        }
                    ];

                    itemInfo.Jintie = Jintie;
                }
            })
        }

        (async () => {
            try {
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))

                //优惠券[每个店铺每天只抓前十个渠道]
                if ('coupon' in apiStackValue.resource && 'couponList' in apiStackValue.resource.coupon) {
                    var shopId = itemInfo.ItemAttributes.ShopId;
                    var urlStr = itemInfo.Url;
                    var coupon = await crawlCoupon(urlStr, shopId);
                    if (coupon.Status) {
                        itemInfo.Coupon.List = coupon.Coupon.List;
                    }
                }

                return callback(null, itemInfo);
            } catch (e) {
                fun.stoneLog('taobao_store', 'info', {
                    "param": e.message,
                    "param1": urlStr
                })
                return callback(null, itemInfo);
            }
        })()
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


//获取优惠券
var crawlCoupon = function (urlStr, shopId, callback) {
    return new Promise((resolve, reject) => {
        request({
            url : merchantTicket+'?url='+encodeURIComponent(urlStr)+'&shopId='+shopId,
            timeout : 5000
        }, function (err, response, body) {
            if (err) {
                reject(err.message);
            } else {
                var body = JSON.parse(body);
                if (!body.Status) {
                    reject(body.Msg);
                } else {
                    resolve(body.Data);
                }
            }
        })
    })
}

var getRealImg = function (imgPath) {
    if (imgPath.indexOf('http') == -1) {
        return 'http:'+imgPath
    }
    return imgPath;
}