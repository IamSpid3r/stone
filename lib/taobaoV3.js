const request = require('request');
const _ = require('lodash');
const fs = require('fs');
const url = require('url');
const iconv = require('iconv-lite');
const md5 = require('md5');
const Q = require('q');
const proxyRequest = require('./proxyRequest').proxyRequest;
const proxyRequest2 = require('./proxyRequest2');
const fun = require(process.cwd() + "/apps/lib/fun.js");
const NODE_ENV = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
if (NODE_ENV) {
    var merchantTicket = 'http://192.168.11.185:3012/info';
} else {
    var merchantTicket = 'http://10.168.194.196:3012/info';
}

var filterId = [];
var filterCategoryId = ['50012031', '50012043', '50012036', '50012038', '50012064', '50019272'] //鞋类分类
var provinces = [
    '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆',
];

exports.getInfo = function (urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);

    if (['item.taobao.com', 'detail.tmall.com', 'detail.tmall.hk', 'chaoshi.detail.tmall.com', 'world.tmall.com'].indexOf(urlInfo.host) != -1
        && ['/item.htm', '/hk/item.htm'].indexOf(urlInfo.pathname) != -1
        && urlInfo.query.id
    ) {
        return getItemInfo(urlInfo, callback);
    } else {
        return callback({
            "Errors": {
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}


function getItemInfo(urlInfo, callback) {
    var existsAttrId = [];
    var apiUrl = 'https://trade-acs.m.taobao.com/gw/mtop.taobao.detail.getdetail/6.0/?data=';
    apiUrl += encodeURIComponent(JSON.stringify(
        {
            "detail_v": "3.1.8",
            "itemNumId": urlInfo.query.id
        }
    ));

    //发送请求
    superRequest({url: apiUrl}, function (err, response, body) {
        if (err) {
            return callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err.message
                }
            });
        }
        try {
            var responseFirstJson = JSON.parse(body);
            if (responseFirstJson.ret[0].indexOf('SUCCESS') == -1) {
                return callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": responseFirstJson.ret[0]
                    }
                });
            }
        } catch (exception) {
            return callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": exception.message
                }
            });
        }
        console.log('run taobao v3..')
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
                SellerId: typeof responseFirstJson.data.seller.userId != 'undefined' ? responseFirstJson.data.seller.userId : null,
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
        if (responseFirstJson.data.apiStack[0].value) {
            var apiStackValue = JSON.parse(responseFirstJson.data.apiStack[0].value);
        } else {
            return callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'apiStack is null'
                }
            });
        }
        try {
            if ('taxDesc' in apiStackValue.vertical.inter) {
                var taxText = apiStackValue.vertical.inter.taxDesc[0].商品进口税;
                for (var i in taxText) {
                    if (taxText.hasOwnProperty(i)) { //filter,只输出man的私有属性
                        if (i.indexOf('预计') != -1) {
                            itemInfo.ItemAttributes.Tax = '1.112'
                        } else {
                            itemInfo.ItemAttributes.Tax = '1'
                        }
                    }
                }
            }
        } catch (e) {
            itemInfo.ItemAttributes.Tax = '1'
        }
        //
        // callback(null, apiStackValue);
        // return;
        //特殊价格
        var specialPrice = false;
        if ('price' in apiStackValue && 'extraPrices' in apiStackValue.price) {
            apiStackValue.price.extraPrices.forEach(function (priceType) {
                if (priceType.priceTitle == '狂欢价') {
                    specialPrice = priceType.priceText;
                }
                if (priceType.priceTitle == '欢聚价') {
                    specialPrice = priceType.priceText;
                }
            })
        }
        if (specialPrice) {
            itemInfo.ItemAttributes.hasActivity = specialPrice;
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
                        if (getVariationsName(responseFirstJson.data.skuBase.props[i].name) == '颜色'
                            && responseFirstJson.data.skuBase.props[i].values.length == 1
                        ) {
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

        //99津贴
        if (isTest(urlInfo.query.id) && 'coupon' in apiStackValue.resource && 'couponList' in apiStackValue.resource.coupon) {
            apiStackValue.resource.coupon.couponList.forEach(function (couponVal) {
                var textFee = /领津贴每满(\d*)减(\d*)/.exec(couponVal.title);
                if (textFee) {
                    Jintie = [
                        {
                            Id: null,
                            Amount: [textFee[2], textFee[1]],
                            Date: ['2018-11-11 00:00:00', '2018-11-11 23:59:59'],
                            Category: 'none',
                            Args: {
                                ApplyText: '购物津贴',
                                Subtitles: [couponVal.title],
                            },
                            Type: 'jintie'
                        }
                    ];
                    //唯一id
                    Jintie[0].Id = md5(Jintie[0].Date[0] + Jintie[0].Date[1] + textFee[2] + textFee[1]);

                    itemInfo.Jintie = Jintie;
                }
            })
        }
        //跨店满减
        // if ('coupon' in apiStackValue.resource && 'shopProm' in apiStackValue.resource) {
        //     apiStackValue.resource.shopProm.forEach(function (couponVal) {
        //         var regexp2 = /每满(\d*)减(\d*)/;
        //         if (couponVal.iconText == '跨店满减'
        //             && (textFee2 = regexp2.exec(couponVal.content[0]))
        //         ) {
        //             let startFee = textFee2[1];
        //             let amount = textFee2[2];
        //             let startTime = '2018-09-13 19:00:00';
        //             let endTime = '2018-09-16 23:59:59';
        //             kuadian = [
        //                 {
        //                     Id : null,
        //                     Amount : [amount, startFee],
        //                     Date: [startTime, endTime],
        //                     Category : 'none',
        //                     Args : {
        //                         ApplyText: '跨店满减',
        //                         Subtitles: ['跨店满减'],
        //                     },
        //                     Type : 'kuadian'
        //                 }
        //             ];
        //             //唯一id
        //             kuadian[0].Id = md5(startFee+amount+startTime+endTime);
        //
        //             itemInfo.Kuadian = kuadian;
        //         }
        //     })
        // }


        //商品服务信息
        //邮费
        var postage = 0;
        if ('delivery' in apiStackValue && 'postage' in apiStackValue.delivery) {
            var postageReg = /快递: ([\d\.]+)/;
            if (postageRes = postageReg.exec(apiStackValue.delivery.postage)) {
                if (Number(postageRes[1]) > 0) {
                    postage = parseInt(postageRes[1]);
                }
            }
        }
        //服务
        var deliveryTime = '';
        var day7 = false;
        var returnGoods = false;
        if ('consumerProtection' in apiStackValue) {
            apiStackValue.consumerProtection.items.forEach(function (item) {
                //发货时间
                let dtreg1 = /(\d+)小时内发货/
                let dtreg2 = /(\d+)天内发货/
                if (dtres1 = dtreg1.exec(item.title)) {
                    deliveryTime = Number(dtres1[1]);
                }
                if (dtreg2 = dtreg2.exec(item.title)) {
                    deliveryTime = Number(dtreg2[1]) * 24;
                }
                //七天无理由
                if (item.title == '7天无理由' || item.title == '七天退换') {
                    day7 = true;
                }
                //无忧退货
                if (item.title == '无忧退货' || item.title == '七天退换') {
                    returnGoods = true;
                }
            })
        }
        //天猫默认48小时内
        if (responseFirstJson.data.seller.sellerType == 'B') {
            if ('inter' in apiStackValue.vertical && 'taxDesc' in apiStackValue.vertical.inter) {
                deliveryTime = '';
            } else {
                deliveryTime = 48;
            }
        }
        itemInfo.ItemAttributes.Postage = postage;
        itemInfo.ItemAttributes.DeliveryTime = deliveryTime;
        itemInfo.ItemAttributes.Day7 = day7;
        itemInfo.ItemAttributes.ReturnGoods = returnGoods;

        //聚划算
        var jhs = [];
        if (isTest(urlInfo.query.id) && 'jhs' in apiStackValue.vertical) {
            jhs = {
                startTime: Math.ceil(apiStackValue.vertical.jhs.startTime / 1000),
                endTime: Math.ceil(apiStackValue.vertical.jhs.endTime / 1000),
                sellingPoints: apiStackValue.vertical.jhs.sellingPoints,
            };
            itemInfo.Jhs = jhs;
        }
        //定金
        var deposit = [];
        if (isTest(urlInfo.query.id) && 'price' in apiStackValue
            && 'depositPrice' in apiStackValue.price
            && 'transmitPrice' in apiStackValue.price
            && apiStackValue.price.transmitPrice.priceTitle == '定金'
        ) {
            var depositReduceText = apiStackValue.price.depositPrice.priceDesc;
            var depositPrice = apiStackValue.price.transmitPrice.priceText;
            var depositReduceMatch = /付定金立减(\d+)/.exec(depositReduceText);
            if (depositReduceMatch) {
                let depositId = md5('deposit' + depositReduceMatch[1] + depositPrice + '2018-11-11 00:00:00');
                itemInfo.Deposit = [
                    {
                        Id: depositId,
                        Amount: [depositReduceMatch[1], depositPrice],
                        Date: ['2018-11-11 00:00:00', '2018-11-11 23:59:59'],
                        Type: 'deposit'
                    }
                ];
            }
        }

        (async () => {
            try {
                //优惠券
                if ('coupon' in apiStackValue.resource && 'couponList' in apiStackValue.resource.coupon) {
                    var shopId = itemInfo.ItemAttributes.ShopId;
                    var userId = itemInfo.ItemAttributes.SellerId;
                    var urlStr = itemInfo.Url;
                    var coupon = await crawlCoupon(urlStr, shopId, userId);
                    if (coupon.Status) {
                        itemInfo.Coupon.ShopId = responseFirstJson.data.seller.shopId;
                        itemInfo.Coupon.UserId = responseFirstJson.data.seller.userId;
                        itemInfo.Coupon.IsAlimama = coupon.IsAlimama;
                        itemInfo.Coupon.List = coupon.Coupon.List;
                    }
                }
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))

                return callback(null, itemInfo);
            } catch (e) {
                fun.stoneLog('taobao_store', 'info', {
                    "param": e.message,
                    "param1": urlStr
                })
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                return callback(null, itemInfo);
            }
        })()
    })
}

var getVariationsName = function (name) {
    return (name == '颜色分类' || name == 'color' || name == '主要颜色') ? '颜色' : ((name == '尺寸' || name == '鞋码' || name == 'size') ? '尺码' : name);
}

//过滤鞋类尺寸没有数字的尺寸
var filterWord = function (categoryId, text) {
    if (filterCategoryId.indexOf(categoryId) != -1) {
        var reg = /\d{2,}/gi;
        return !reg.exec(text);
    } else {
        return false;
    }
};

//兼容老图片 获取老图片地址
var getOldImgpath = function (imgPath) {
    var regexp = /img\.alicdn\.com\/imgextra\/i(\d{1,})\/(.*)/ig;
    var res = regexp.exec(imgPath);
    if (res) {
        var oldPath = 'http://gd' + res[1] + '.alicdn.com/bao/uploaded/i' + res[1] + '/' + res[2];
        return oldPath;
    }
    return imgPath;
}


//获取优惠券
var crawlCoupon = function (urlStr, shopId, sellerId) {
    return new Promise((resolve, reject) => {
        let merchantTicketUrl = merchantTicket + '?url=' + encodeURIComponent(urlStr)
            + '&shopId=' + shopId + '&sellerId=' + sellerId + '&v=v2';
        request({
            url: merchantTicketUrl,
            timeout: 3000
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
        return 'http:' + imgPath
    }
    return imgPath;
}

var isTest = function (id) {
    return true;
    id = Number(id);
    return [577029946063, 578244294612, 578862656926].indexOf(id) > -1 ? true : false;
}

//超级请求
var superRequest = function (options, callback) {
    options.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
        "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": " zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
        "Cache-Control": "no-cache, max-age=0",
        "Pragma": "no-cache",
        "authority": "trade-acs.m.taobao.com",
        "Connection": "keep-alive",
        "Cookie": 'WAPFDFDTGFG=%2B4cMKKP%2B8PI%2BNCvomScNS%2F3NP4Rjers%3D; _w_app_lg=21; t=453a366c9840f9b8289595bf84a12559; cna=wUEmEDfrSXICAXTpm2vXEC1F; tg=0; thw=cn; hng=CN%7Czh-CN%7CCNY%7C156; l=AiIinTXftCbh026JhuqlbC9Y8qOEdiay; miid=93794387539053666; ali_ab=101.80.107.127.1535357192718.1; UM_distinctid=1657a6bee0b100-00a9d5522515cd-16386950-fa000-1657a6bee0c2f2; cookie2=135c2658ddcb0b4a6fa0c791037a83bc; _tb_token_=7e3d43534753e; v=0; publishItemObj=Ng%3D%3D; tracknick=hxl724753832; lgc=hxl724753832; dnk=hxl724753832; tk_trace=oTRxOWSBNwn9dPyorMJE%2FoPdY8zfvmw%2Fq5hld2AUNz8AS5mIYkcJ7GWWZHhXTf5sG3lZy5fi7DoloRpz2D42LL%2Fu69afSTs794nBUcX6jMZS1l3JmX5UrWWYZ6D4%2F7UVx1GBVc0Z3h6E5qrTlxdPUbi0mY4AaHrIVdplyKf60sYlvSMRhRy0SynxLJAg53D1YReY430ekywlSblSaoQk%2FDnrIyFTJTAEROzSexx89y656FG3DMSIshfZ2hbKk4UlJS0bvZQ2jq4BHbzJyvcBe2FXoO0o; mt=ci=5_1&np=; enc=q2LkEO%2F3g%2Bbd4pKXtsmqcvHCeNDHU8uX2Avqh%2Ff0fzPOb7x6ua08VkweDJrEuWyUSBIg1aCi%2Fh60NHAkV6pODA%3D%3D; _m_h5_tk=981c17672aaf8b9bb4680312bdfd1649_1540299253663; _m_h5_tk_enc=62ff7f35eecae596090423be9365e2fa; munb=761008464; existShop=MTU0MDQ1ODI4NQ%3D%3D; ockeqeudmj=vp64JIo%3D; skt=6641a7c8b641531b; csg=00d48b48; uc3=vt3=F8dByRjI7VB9Qa%2FicI0%3D&id2=VAcPTBfHdD5t&nk2=CzU40LsQJv8VSkPW&lg2=V32FPkk%2Fw0dUvg%3D%3D; _cc_=URm48syIZQ%3D%3D; uc1=cookie16=W5iHLLyFPlMGbLDwA%2BdvAGZqLg%3D%3D&cookie21=URm48syIZJfmYzXrEixrAg%3D%3D&cookie15=VT5L2FSpMGV7TQ%3D%3D&existShop=false&pas=0&cookie14=UoTYNk%2BgrxtXug%3D%3D&tag=10&lng=zh_CN; isg=BI6OUX9AWS9A0-0bAi6Kwwwl32L8H2B_icpnM7jXwBFBGy91IpzIGe3aVwfSA0oh'
    };
    options.gzip = true;
    request(options, function (error, response, body) {
        if (error) {
            console.log('v3 origin proxyRequest', body)
            proxyRequest(options, function (error, response, body) {
                return callback(error, response, body)
            });
            return;
        } else {
            return callback(error, response, body)
        }
    })
}
