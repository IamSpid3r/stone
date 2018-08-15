/**
 * Created by libin on 2018/6/12.
 */
var request = require('request');
var url = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy');
// var proxyRequest = require('./proxyRequest2');
var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function (urlStr, callback) {
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
        try {
            var regexp = /(var _goodsData = [\s\S]*?)var storage/ig;
            result = regexp.exec(body);
            if (!result) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": '页面结构错误'
                    }
                });
                return;
            }
            eval(result[1]);
            res = _goodsData;
            var itemInfo = {
                Unique: 'cn.sasa.' + res.id,
                Md5: '',
                Status: 'inStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: res.brand + " " + res.name,
                    ShopName: '香港莎莎网',
                    ShopId: 'cn.sasa',
                    ImageUrl: res.imgUrl,
                    Tax: 1
                },
                Variations: [],
                Items: [],
                Coupon: ''
            };
            $ = cheerio.load(body);
            if ($(".productsize").text() != "") {
                //非秒杀类
                var urls = [];
                $(".productsize").find("li").each(function () {
                    var url = {};
                    if(_.trim($(this).find("a").attr("href")) == "javacript:void(0);") {
                        url.herf = urlStr;
                    } else {
                        url.herf = "http://www.sasa.com" + $(this).find("a").attr("href");
                    }
                    url.attr = $(this).find("a").text().replace(/\n|\t|\r/g, "");
                    urls.push(url);
                });
                var ep = new eventproxy();
                ep.after('items', urls.length, function (currentItems) {
                    var variation = {};
                    variation.Id = 1;
                    variation.Name = "规格";
                    var values = [];
                    var items = [];
                    currentItems.forEach(function(i) {
                        var value = {};
                        value.ImageUrls = [];
                        value.ValueId = i.id;
                        value.Name = i.variation;
                        value.ImageUrls.push(i.imgUrl);
                        values.push(value);
                        //拼接item
                        var item = {
                            "Unique": "cn.sasa." + i.id,
                            "Attr": [],
                            "Offers": [{
                                "Merchant": {
                                    "Name": "sasa"
                                },
                                "List": [
                                    {
                                        "Price":i.price,
                                        "Type": "RMB"
                                    }
                                ]
                            }]
                        };
                        var attr = {};
                        attr.Nid = 1;
                        attr.N = "规格";
                        attr.Vid = i.id;
                        attr.V = i.variation;
                        item.Attr.push(attr);
                        items.push(item);
                    })
                    variation.Values = values;
                    itemInfo.Variations.push(variation);
                    itemInfo.Items = items;
                    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                    callback(null, itemInfo);

                });
                //并发取数据
                urls.forEach(function (currentUrl) {
                    getHtml(currentUrl.herf,function(body,err,response) {
                        if (err) {
                            callback({
                                "Errors": {
                                    'Code': 'Error',
                                    "Message": err
                                }
                            });
                            return;
                        }
                        var regexp = /(var _goodsData = [\s\S]*?)var storage/ig;
                        result = regexp.exec(body);
                        if (!result) {
                            callback({
                                "Errors": {
                                    'Code': 'Error',
                                    "Message": '页面结构错误'
                                }
                            });
                            return;
                        }
                        eval(result[1]);
                        res = _goodsData;
                        res.variation = currentUrl.attr;
                        ep.emit('items', res);
                    });

                });


            } else {
                //秒杀类

                var regexp = /\"sc_priceRMB\":\"([0-9]+)\"/ig;
                result = regexp.exec(body);
                var price = result[1];
                var attr = [];//获取属性存储
                var item = {};
                item.Attr = attr;//获取属性名
                item.Unique = "cn.sasa." + res.id;
                item.Offers = [{//获取金额字段
                    "Merchant": {
                        "Name": "sasa"
                    },
                    "List": [
                        {
                            // "Price": res.product_price_cny,
                            "Price": price,
                            "Type": "RMB"
                        }
                    ]
                }];
                itemInfo.Items.push(item);
                if (itemInfo.Items.length > 0 && $("#seckill_btn div").attr('class') != "btn-over") {
                    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                } else {
                    itemInfo.Status = 'outOfStock';
                }

                itemInfo.Md5 = md5(JSON.stringify(itemInfo));

                $ = cheerio.load(body);

                callback(null, itemInfo);

            }
        } catch (exception) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": exception.message
                }
            });
            return '';
        }

    })


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