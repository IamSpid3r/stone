/**
 * Created by libin on 2018/6/11.
 */
var request = require('request');
var url = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy');
var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function (urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    var patt = /\/goods\/(.*)/ig;
    result = patt.exec(urlInfo.pathname);
    if (!result) {
        callback({
            "Errors": {
                'Code': 'Fatal',
                "Message": 'url error no math xiaohongshu'
            }
        });
        return;
    }

    var goods_id = result[1];

    getHtml(urlStr, function (body, err, response) {
        if (err) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err
                }
            });
            return;
        }
        var regexp = /window.__INITIAL_SSR_STATE__=(.*)<\/script>/ig;
        result2 = regexp.exec(body);
        if (!result2) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": "网站内容错误"
                }
            });
            return;
        }

        var itemInfo = {
            Unique: 'cn.xiaohongshu.' + goods_id,
            Md5: '',
            Status: 'inStock',
            Url: url,
            ItemAttributes: {
                Title: "",
                ShopName: '小红书',
                ShopId: 'cn.xiaohongshu',
                ImageUrl: "",
                Tax: 1
            },
            Variations: [],
            Items: [],
            Coupon: ''
        };

        text = _.trim(result2[1]);
        text = JSON.parse(text);
        //sku组合
        var skuOptions = text.Main.basicData.skuOptions;
        var items = text.Main.basicData.items;
        //获取标题和图片
        var title = text.Main.basicData.items[0].shortName;
        var img = text.Main.basicData.items[0].shareInfo.image;
        itemInfo.ItemAttributes.Title = title;
        itemInfo.ItemAttributes.ImageUrl = "http:"+img;
        var variations = [];
        //拼接组合
        skuOptions.forEach(function (option, n) {
            var variation = {};
            variation.Id = n + 1;
            variation.Name = option.name;
            variation.Values = [];
            option.values.forEach(function (val, vn) {
                var value = {};
                value.ValueId = (n + 1) * 1000 + vn;
                value.Name = val;
                variation.Values.push(value);
            });
            variations.push(variation);
        })
        itemInfo.Variations = variations;
        //拼接sku
        var apiUrl = "https://www.xiaohongshu.com/api/store/pd/" + goods_id;

        getHtml(apiUrl,function(body,err,response) {
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }

            text = _.trim(body);
            text = JSON.parse(text);
            var priceItems = text.data.items;

            items.forEach(function (i) {
                if (i.couponText == "") {
                    var item = {
                        "Unique": "cn.xiaohongshu." + i.id,
                        "Attr": [],
                        "Offers": [{
                            "Merchant": {
                                "Name": "xiaohongshu"
                            },
                            "List": [
                                {
                                    "Price": "",
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };

                    //循环设置价格
                    priceItems.forEach(function (pv) {
                        if (pv.id == i.id) {
                            item.Offers[0].List[0].Price = pv.price.sale_price.price;
                        }
                    });


                    //循环设置attr
                    i.variants.forEach(function (v) {
                        var attr = {};
                        variations.forEach(function (vv) {
                            if (v.name == vv.Name) {
                                vv.Values.forEach(function (vvv) {
                                    if (v.value == vvv.Name) {
                                        attr.Nid = vv.Id;
                                        attr.N = vv.Name;
                                        attr.Vid = vvv.ValueId;
                                        attr.V = vvv.Name;
                                        return false;
                                    }
                                })
                                return false;
                            }
                        })
                        item.Attr.push(attr);
                    })
                    itemInfo.Items.push(item);
                }
            });
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null, itemInfo);

        });



    });


}


function getHtml(urlStr, callback) {
    proxyRequest({
        url: urlStr,
        timeout: 5000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding": "deflate, sdch",
            "Accept-Language": "zh-CN,zh;q=0.8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Pragma": "no-cache"
        }
    }, function (error, response, body) {
        callback(body, error);
    })
}
