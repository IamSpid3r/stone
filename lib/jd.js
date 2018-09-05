var request = require('request');
var url = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy');
var Q = require('q');
var iconv = require('iconv-lite')
var events = require('events');
var fun = require('./fun');

//var proxyRequest = require('./proxyRequest').proxyRequest;
var proxyRequest = require('./proxyRequest2');
var proxyRequestOrigin = require('./proxyRequest').proxyRequest;;

exports.getInfo = function (urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if (urlInfo.host == 'item.jd.com' || urlInfo.host == 'item.jd.hk') {
            var exp = /(\d*)\.html/ig;
            var res = exp.exec(urlInfo.path);
            var pid = res[1];
        }
    } catch (exception) {
        return callback({
            "Errors": {
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
    }

    //get html
    getHtml('http://cdnware.m.jd.com/c1/skuDetail/apple/5.4.1/' + pid + '.json', function (body, err) {
        if (err) {
            return callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err.message
                }
            });
        }

        getItemInfo({body: body, pid: pid, url: urlStr}, urlInfo, callback);
    })
}

/*
 *内容处理
 **/
function getItemInfo(params, urlInfo, callback) {
    var pid = params.pid, body = params.body, url = params.url;
    if (!fun.isJson(body)) {
        return callback({
            "Errors": {
                'Code': 'Error',
                "Message": 'body not a json'
            }
        });
    }


    body = JSON.parse(body);
    var itemInfo = {
        Unique: 'cn.jd.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName: '京东',
            ShopId: '',
            ImageUrl: '',
            VenderType: '普通',
            ShopType: '普通',
            CategoryId:'',
            StageInfo: '',
            Region: true,
            Tax: '1',
        },
        Variations: [],
        Items: [],
        Coupon: {"List": []}
    };

    if (body.code == 25) {//未获得信息
        itemInfo.Status = 'notFind'
        return callback(null, itemInfo);
    } else if (body.code != 0) {//抓取失败
        return callback({
            "Errors": {
                'Code': 'Error',
                "Message": "Crawl Error"
            }
        });
    }

    var wareInfo = body.wareInfo;
    var type = {'color': 1, 'size': 2, "spec": 3};                  //类型对应id
    var color = {
        "Id": 1,
        "Name": "",
        "Values": []
    };
    var size = {
        "Id": 2,
        "Name": "",
        "Values": []
    };
    var spec = {
        "Id": 3,
        "Name": "",
        "Values": []
    };
    var colorSkus = [];
    var priceSkus = [];
    var skuStockSkus = [];
    var n = j = h = 0; //标记位
    var isYuyue = false;

    itemInfo.ItemAttributes.Title = wareInfo.basicInfo.name;
    itemInfo.ItemAttributes.CategoryId = wareInfo.basicInfo.category;
    itemInfo.ItemAttributes.ImageUrl = wareInfo.basicInfo.wareImage[0].big.replace(/\.webp/g, "");
    if (wareInfo.shopInfo.shop != null) {
        itemInfo.ItemAttributes.ShopId = 'cn.jd.' + wareInfo.shopInfo.shop.shopId;
        itemInfo.ItemAttributes.ShopName = wareInfo.shopInfo.shop.name;
        if (wareInfo.shopInfo.shop.venderType == 1) {
            itemInfo.ItemAttributes.VenderType = '自营';
        }
    }
    if (wareInfo.basicInfo.service.service == '由京东发货并提供售后服务') {
        itemInfo.ItemAttributes.VenderType = '自营';
    }

    //数据处理
    var isColor = typeof  wareInfo.basicInfo.skuColorSize.colorSizeTitle['colorName'] != 'undefined' ? true : false;
    var isSize = typeof  wareInfo.basicInfo.skuColorSize.colorSizeTitle['sizeName'] != 'undefined' ? true : false;
    var isSpec = typeof  wareInfo.basicInfo.skuColorSize.colorSizeTitle['specName'] != 'undefined' ? true : false;
    if (isColor) {
        color.Name = wareInfo.basicInfo.skuColorSize.colorSizeTitle['colorName'];
    }
    if (isSize) {
        size.Name = wareInfo.basicInfo.skuColorSize.colorSizeTitle['sizeName'];
    }
    if (isSpec) {
        spec.Name = wareInfo.basicInfo.skuColorSize.colorSizeTitle['specName'];
    }

    if (wareInfo.basicInfo.skuColorSize.colorSize) {//有属性
        wareInfo.basicInfo.skuColorSize.colorSize.forEach(function (val) {
            var item = {
                "Unique": "cn.jd." + val.skuId,
                "Attr": [],
                "Offers": [{
                    "Merchant": {
                        "Name": "jd"
                    },
                    "List": [
                        {
                            "Price": 0,
                            "Type": "RMB"
                        }
                    ]
                }]
            };

            if (isColor) {
                if ((colorIndex = _.findIndex(color.Values, {"Name": _.trim(val.color, ' \n\t')})) == -1) {
                    n++;
                    var valueId = type.color + _.padStart(n, 6, 0);
                    var ImageUrls = [];

                    if (wareInfo.basicInfo.wareId == val.skuId) {//当前skuid
                        wareInfo.basicInfo.wareImage.forEach(function (v) {
                            ImageUrls.push(v.big.replace(/\.webp/g, ""));
                        })
                    } else {//除去当前skuid 集合
                        colorSkus.push([valueId, val.skuId]);
                    }


                    color.Values.push({
                        "ValueId": valueId,
                        "Name": _.trim(val.color, ' \n\t'),
                        "ImageUrls": ImageUrls
                    });

                    colorIndex = color.Values.length - 1;
                }

                currentColor = color.Values[colorIndex];
                item.Attr.push({
                    "Nid": color.Id,
                    "N": color.Name,
                    "Vid": currentColor.ValueId,
                    "V": currentColor.Name
                })
            }

            if (isSize) {
                if ((sizeIndex = _.findIndex(size.Values, {"Name": _.trim(val.size, ' \n\t')})) == -1) {
                    j++;
                    valueId = type.size + _.padStart(j, 6, 0);
                    size.Values.push({
                        "ValueId": valueId,
                        "Name": _.trim(val.size, ' \n\t')
                    });

                    sizeIndex = size.Values.length - 1;
                }

                currentSize = size.Values[sizeIndex];
                item.Attr.push({
                    "Nid": size.Id,
                    "N": size.Name,
                    "Vid": currentSize.ValueId,
                    "V": currentSize.Name
                })
            }

            if (isSpec) {
                if ((specIndex = _.findIndex(spec.Values, {"Name": _.trim(val.spec, ' \n\t')})) == -1) {
                    h++;
                    valueId = type.spec + _.padStart(h, 6, 0);
                    spec.Values.push({
                        "ValueId": valueId,
                        "Name": _.trim(val.spec, ' \n\t')
                    });

                    specIndex = spec.Values.length - 1;
                }

                currentSpec = spec.Values[specIndex];
                item.Attr.push({
                    "Nid": spec.Id,
                    "N": spec.Name,
                    "Vid": currentSpec.ValueId,
                    "V": currentSpec.Name
                })
            }

            //skuid集合
            priceSkus.push('J_' + val.skuId);
            skuStockSkus.push(val.skuId);

            //保存商品信息
            itemInfo.Items.push(item)
        });
    } else {//无属性
        var item = {
            "Unique": "cn.jd." + wareInfo.basicInfo.wareId,
            "Attr": [],
            "Offers": [{
                "Merchant": {
                    "Name": "jd"
                },
                "List": [
                    {
                        "Price": 0,
                        "Type": "RMB"
                    }
                ]
            }]
        };
        itemInfo.Items.push(item)

        //skuid集合
        priceSkus.push('J_' + wareInfo.basicInfo.wareId);
        skuStockSkus.push(wareInfo.basicInfo.wareId);
    }
    //唯一id 所有skuid md5 16位
    if (priceSkus.length < 1) {
        return callback({
            "Errors": {
                'Code': 'Error',
                "Message": "priceSkus lt 1"
            }
        });
    }
    var priceSkusStr = priceSkus.join(',');
    itemInfo.Unique = 'cn.jd.' + md5(priceSkusStr).substr(8, 16);


    var event = new events.EventEmitter();
    //全球购的判断
    var quanqiuGou = function () {
        var hkapiUrl = 'https://c.3.cn/globalBuy?skuId=' + pid;
        getHtml(hkapiUrl, function (body, err) {
            try {
                if (fun.isJson(body)) {
                    body = JSON.parse(body);
                    if (body.success != false) {
                        itemInfo.ItemAttributes.ShopType = '全球购';
                        var str = body.taxTxt.content;   //接口中关于税费的字段
                        var num = str.replace(/[^0-9]/ig, "");
                        if (num > 0) {
                            itemInfo.ItemAttributes.Tax = 1.112;
                        }
                    }
                }
            } catch (e) {
                console.log('quanqiuGou:' + e.message);
            }

            event.emit('crawl_ok');
        })
    }
    quanqiuGou();


    //商品详情页面
    var getStageInfo = function () {
        return new Promise ((resolve, reject) => {
            if (url.indexOf('hk') == -1) {
                var apiUrl = 'https://item.m.jd.com/product/' + pid + '.html';
            } else {
                var apiUrl = 'https://mitem.jd.hk/ware/view.action?wareId=' + pid;
            }
            getHtml(apiUrl, function (body, err) {
                if (err) {
                    reject(err)
                } else {
                    try {
                        var $ = cheerio.load(body);
                        // if ($('#returnurl').val()) {
                        //     return getHtml(apiUrl);
                        // }
                        if ($('#baitiaoItem').text() != '') {
                            itemInfo.ItemAttributes.StageInfo = $('#baitiaoItem').text();
                        }
                        //是否含有预约
                        if (body.indexOf('yuyue') != -1) {
                            isYuyue = true;
                        }

                        //活动618
                        // let nowTime = (new Date()).getTime();
                        // let activityPattern = /(_bigPromoteList = [^<]+)<\/script/
                        // let itemPattern = /_itemOnly =  \(([^)]+)\)\;/
                        // let activityMatch = activityPattern.exec(body);
                        // let itemMatch = itemPattern.exec(body);
                        //
                        // if (activityMatch && itemMatch) {
                        //     let activityRes = activityMatch[1];
                        //     let itemRes = JSON.parse(itemMatch[1]);
                        //     eval(activityRes)
                        //     if (_bigPromoteList) {
                        //         _bigPromoteList.forEach(function (s) {
                        //             if (s.pTag == itemRes.item.pTag &&
                        //                 (!s.startTime || (new Date(s.startTime)).getTime() < nowTime) && (!s.endTime || (new Date(s.endTime)).getTime() > nowTime)
                        //             ) {
                        //                 itemInfo.ItemAttributes.hasActivity = true;
                        //             }
                        //         })
                        //     }
                        // }

                        resolve(body);
                    } catch (e) {
                        reject(e)
                    }
                }
            })
        });
    };


    //获取优惠券
    var couponUrl = 'https://item.m.jd.com/coupon/coupon.json?wareId=' + pid+'&t='+Math.random();
    var getCoupon = function () {
        getHtml(couponUrl, function (body, err) {
            if (!err) {
                try {
                    body = JSON.parse(body);
                    if (body.coupon.length > 0) {
                        body.coupon.forEach(function (coupon) {
                            if (coupon.couponKind == 1 || coupon.couponKind == 2) {//满减
                                itemInfo.Coupon.List.push({
                                    "Id": coupon.batchId,
                                    "Amount": [coupon.discount, coupon.quota],
                                    "Date": [coupon.beginTime.replace(/\./g, "-") + " 00:00:00", coupon.endTime.replace(/\./g, "-") + " 23:59:59"],
                                    "Category": "normal",
                                    "Type": "item"
                                });
                            }
                        })
                    }
                } catch (e) {
                    console.log('getCoupon:' + e.message);
                }
            }

            event.emit('crawl_ok');
        })
    }
    getCoupon();

    //获取价格信息
    var priceUrls = [];
    if (priceSkus.length > 100) {
        priceUrls.push('http://p.3.cn/prices/mgets?type=1&skuIds=' + priceSkus.slice(0, 100).join())
        priceUrls.push('http://p.3.cn/prices/mgets?type=1&skuIds=' + priceSkus.slice(100).join())
    } else {
        priceUrls.push('http://p.3.cn/prices/mgets?type=1&skuIds=' + priceSkus.join())
    }
    getHtml(priceUrls, function (bodyPricesArr, err) {
        try {
            if (err) {
                return event.emit('crawl_ok', {
                    "Errors": {
                        'Code': 'Error',
                        "Message": err.message
                    }
                });
            }

            var bodyPrices = [];
            bodyPricesArr.forEach(function (val) {
                val = JSON.parse(val);
                bodyPrices = bodyPrices.concat(val);
            })
            bodyPrices.forEach(function (bodyPrice) {
                if ((itemIndex = _.findIndex(itemInfo.Items, {"Unique": "cn.jd." + _.trimStart(bodyPrice.id, 'J_')})) != -1) {
                    if (bodyPrice.p != -1) {
                        itemInfo.Items[itemIndex].Offers[0].List[0].Price = bodyPrice.p;
                    } else {
                        delete  itemInfo.Items[itemIndex];
                    }
                }
            })
            if (itemInfo.length <= 0) {
                itemInfo.Status = 'outOfStock';
            }

            return event.emit('crawl_ok');
        } catch (e) {
            return event.emit('crawl_ok', {
                "Errors": {
                    'Code': 'Error',
                    "Message": e.message
                }
            });
        }
    })

    //sku上架的状态
    getStageInfo().then(function () {
        var skuStockUrls = [];
        if (skuStockSkus.length > 100) {
            skuStockUrls.push('https://c0.3.cn/stocks?callback=c&type=getstocks&skuIds=' + skuStockSkus.slice(0, 100).join() + '&area=1_72_2799_0')
            skuStockUrls.push('https://c0.3.cn/stocks?callback=c&type=getstocks&skuIds=' + skuStockSkus.slice(100).join() + '&area=1_72_2799_0')
        } else {
            skuStockUrls.push('https://c0.3.cn/stocks?callback=c&type=getstocks&skuIds=' + skuStockSkus.slice(0, 100).join() + '&area=1_72_2799_0')
        }
        getHtml(skuStockUrls, function (skuStocksArr, err) {
            try {
                if (err) {
                    return event.emit('crawl_ok', {
                        "Errors": {
                            'Code': 'Error',
                            "Message": err.message
                        }
                    });
                }

                var bodySkustock = [];
                skuStocksArr.forEach(function (val) {
                    val = _.trim(val, 'c(')
                    val = _.trim(val, ')')
                    val = JSON.parse(val);

                    _(val).forEach(function (skuval, skukey) {
                        skuval.id = skukey;
                        bodySkustock.push(skuval)
                    })
                })
                bodySkustock.forEach(function (sku) {
                    if ((itemIndex = _.findIndex(itemInfo.Items, {"Unique": "cn.jd." + sku.id})) != -1) {
                        if (sku.StockStateName == '无货' && !isYuyue) {
                            delete  itemInfo.Items[itemIndex];
                        }
                    }
                })
                itemInfo.Items = itemInfo.Items.filter(function (val) {
                    if (val) return val;
                });
                if (itemInfo.Items.length <= 0) {
                    itemInfo.Status = 'outOfStock';
                }

                return event.emit('crawl_ok');
            } catch (e) {
                return event.emit('crawl_ok', {
                    "Errors": {
                        'Code': 'Error',
                        "Message": e.message
                    }
                });
            }
        })
    }, function (err) {
        return event.emit('crawl_ok', {
            "Errors": {
                'Code': 'Error',
                "Message": err.message
            }
        });
    })

    var times = 0;
    event.on('crawl_ok', function (error) {
        if (error) {
            times = -100;
            return callback(error);
        }
        times++;
        if (times >= 4) {
            //并发取图片
            if (colorSkus.length > 0 && itemInfo.Status == 'inStock') {
                var crawlColorSkusErr = false;
                var ep = new eventproxy();

                ep.after('colorSkus', colorSkus.length, function (colorSkusItems) {
                    if (crawlColorSkusErr) {
                        return callback({
                            "Errors": {
                                'Code': 'Error',
                                "Message": crawlColorSkusErr
                            }
                        });
                    }

                    colorSkusItems.sort(function (a, b) {
                        return a[0] > b[0];
                    })
                    colorSkusItems.forEach(function (colorSkusItem) {
                        if ((colorIndex = _.findIndex(color.Values, {"ValueId": colorSkusItem[0]})) != -1) {
                            var ImageUrls = [];
                            colorSkusItem[1].wareInfo.basicInfo.wareImage.forEach(function (v) {
                                ImageUrls.push(v.big.replace(/\.webp/g, ""));
                            })
                            color.Values[colorIndex].ImageUrls = ImageUrls;
                        }
                    })

                    //返回数据
                    if (isColor) itemInfo.Variations.push(color);
                    if (isSize) itemInfo.Variations.push(size);
                    if (isSpec) itemInfo.Variations.push(spec);

                    //检测价格
                    var isbreak = false;
                    _.forEach(itemInfo.Items, (val) => {
                        if (val.Offers[0].List[0].Price <= 0){
                            isbreak = true;
                            callback({
                                "Errors": {
                                    'Code': 'Error',
                                    "Message": 'Price is 0'
                                }
                            });
                            return false;
                        }
                    })

                    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                    if (!isbreak) {
                        return callback(null, itemInfo);
                    }
                })

                colorSkus.forEach(function (colorSku) {
                    getHtml('http://cdnware.m.jd.com/c1/skuDetail/apple/5.4.1/' + colorSku[1] + '.json', function (body, err) {
                        if (err) {
                            crawlColorSkusErr = err.message;
                        }
                        if (!fun.isJson(body)) {
                            crawlColorSkusErr = 'color api not a json';
                            body = null;
                        } else {
                            body = JSON.parse(body);
                        }

                        ep.emit('colorSkus', [colorSku[0], body]);
                    });
                })
            } else {
                //返回数据
                if (isColor) itemInfo.Variations.push(color);
                if (isSize) itemInfo.Variations.push(size);
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                return callback(null, itemInfo);
            }
        }
    });
}


/*
 *获取html
 **/
function getHtml(urlStrs, callback) {
    if (typeof urlStrs != 'object') {
        urlStrs = [urlStrs];
        var isString = true;
    } else {
        var isString = false;
    }

    var urlLen = urlStrs.length;
    var urlLenFlag = 0;
    var hasErr = false;
    var hasBody = [];
    urlStrs.forEach(function (urlStr) {
        var options = {
            url: urlStr,
            timeout: 6000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
                "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                "Accept-Encoding": "deflate,sdch",
                "Accept-Language": " zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Cookie": 'JAMCookie=true; abtest=20171111200228762_79; __jdv=181809404|www.kaluli.com|-|referral|-|1513584901084; USER_FLAG_CHECK=186afa1515905721eed63d12af618a9f; warehistory="19196697635,"; __jda=181809404.1509329702322636854580.1509329702.1514442236.1514449227.15; __jdb=181809404.8.1509329702322636854580|15.1514449227; __jdc=181809404; mba_muid=1509329702322636854580; mba_sid=15144492270307356968612668602.8; sid=2646216d07d8ccd89e8893e396d84c82'
            }
        };
        if (urlStr.indexOf('stocks') != -1) {
            options.headers['Accept-Encoding'] = 'gzip, deflate, br';
            options['gzip'] = true;
            options['encoding'] = null;
        }
        if (urlStr.indexOf('coupon') != -1) {
            realRequest = proxyRequestOrigin;
        } else {
            realRequest = proxyRequest;
        }
        realRequest(options, function (error, response, body) {
            if (urlStr.indexOf('stocks') != -1) {
                buffer = new Buffer(body);
                body = iconv.decode(buffer, 'gbk')
            }
            urlLenFlag++;
            if (error) {
                hasErr = error;
                if (urlLenFlag == urlLen) {
                    callback(null, error);
                }
            } else {
                if (isString) {
                    hasBody = body;
                } else {
                    hasBody.push(body);
                }

                if (urlLenFlag == urlLen) {
                    if (hasErr) {
                        callback(null, error);
                    } else {
                        callback(hasBody);
                    }
                }
            }
        })
    })
}

