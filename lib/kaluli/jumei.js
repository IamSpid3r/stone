/**
 * Created by libin on 2018/6/7.
 */
var request = require('request');
var url = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy');
var Q = require('q');
// var proxyRequest = require('./proxyRequest2');
var proxyRequest = require('../proxyRequest').proxyRequest;


exports.getInfo = function (urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if (urlInfo.host == 'item.jumeiglobal.com') {
        //极速免税店逻辑
        var patt = /(ht([0-9]+)p(.*))\.html/ig;
        result = patt.exec(urlInfo.path);
        //海外购
        if (!result) {
            var patt2 = /([0-9]+)\.html/ig;
            result2 = patt2.exec(urlInfo.path);
            if (!result2) {
                callback({
                    "Errors": {
                        'Code': 'Fatal',
                        "Message": 'url error no math jumeiglobal'
                    }
                });
                return;
            }
            var goods_id = result2[1];
            getItemInfo({goods_id: goods_id, type: 1, urlStr: urlStr}, urlInfo, callback);
        } else {
            var goods_id = result[1];
            getItemInfo({goods_id: goods_id, type: 2, urlStr: urlStr}, urlInfo, callback);
        }

    } else if (urlInfo.host == 'item.jumei.com') {
        //普通聚美
        var patt3 = /([0-9]+)\.html/ig;
        result3 = patt3.exec(urlInfo.path);
        if (!result3) {
            var patt4 = /\/(.*)\.html/ig;
            result4 = patt4.exec(urlInfo.path);
            if(!result4) {
                callback({
                    "Errors": {
                        'Code': 'Fatal',
                        "Message": 'url error no math jumei'
                    }
                });
                return;
            }
            var goods_id = result4[1];
            getItemInfo({goods_id: goods_id, type: 4, urlStr: urlStr}, urlInfo, callback);

        } else {
            var goods_id = result3[1];
            getItemInfo({goods_id: goods_id, type: 3, urlStr: urlStr}, urlInfo, callback);
        }


    } else {
        callback('host error is not jumei hostname');
    }

}


function getItemInfo(params, urlInfo, callback) {


    if (params.type == 1) { //海外购
        //先抓取页面
        getHtml(params.urlStr, function (body, err, response) {
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }
            $ = cheerio.load(body);
            var title = $(".deal_con_content").find('tr').children('td').eq(1).text();
            var img = $(".deal_con_content").find('tr').children('td').eq(2).find("img").attr("src");
            var itemInfo = {
                Unique: 'cn.jumei.' + params.goods_id,
                Md5: '',
                Status: 'inStock',
                Url: url,
                ItemAttributes: {
                    Title: title,
                    ShopName: '聚美优品',
                    ShopId: 'cn.jumei',
                    ImageUrl: img,
                    Tax: 1
                },
                Variations: [],
                Items: [],
                Coupon: ''
            };
            var apiUrl = "http://www.jumeiglobal.com/ajax_new/MallInfo?mall_id="+params.goods_id;
            getHtml(apiUrl, function (body, err, response) {
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
                //缺货处理
                if (text.sku_has_sellable != 1) {
                    itemInfo.Status = "outOfStock";
                    callback(null, itemInfo);
                }
                //聚美为1层，默认为型号,拼接variation
                var variation = {};
                variation.Id = 1;
                variation.Name = "型号";
                var values = [];
                text.sku_list[0].forEach(function (sku) {
                    var value = {};
                    value.ImageUrls = [];
                    value.ValueId = sku.sku_no;
                    value.Name = sku.sku_name;
                    value.ImageUrls.push(sku.sku_img);
                    values.push(value);
                    var item = {
                        "Unique": "cn.jumei." + sku.sku_no,
                        "Attr": [],
                        "Offers": [{
                            "Merchant": {
                                "Name": "jumei"
                            },
                            "List": [
                                {
                                    "Price": sku.jumei_price,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };
                    var attr = {};
                    attr.Nid = 1;
                    attr.N = "型号";
                    attr.Vid = sku.sku_no;
                    attr.V = sku.sku_name;
                    item.Attr.push(attr);
                    itemInfo.Items.push(item);
                });
                variation.Values = values;
                itemInfo.Variations.push(variation);
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                callback(null, itemInfo);
            });
        });
    } else if (params.type == 2) { //免税购
        //先抓取页面
        getHtml(params.urlStr, function (body, err, response) {
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }
            $ = cheerio.load(body);
            var title = $(".deal_con_content").find('tr').children('td').eq(1).text();
            var img = $(".deal_con_content").find('tr').children('td').eq(2).find("img").attr("src");
            var itemInfo = {
                Unique: 'cn.jumei.' + params.goods_id,
                Md5: '',
                Status: 'inStock',
                Url: url,
                ItemAttributes: {
                    Title: title,
                    ShopName: '聚美优品',
                    ShopId: 'cn.jumei',
                    ImageUrl: img,
                    Tax: 1
                },
                Variations: [],
                Items: [],
                Coupon: ''
            };
            //抓取
            var apiUrl = "http://www.jumeiglobal.com/ajax_new/dealinfo?hash_id="+params.goods_id;
            getHtml(apiUrl, function (body, err, response) {
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
                //缺货处理
                if (text.sku_has_sellable != 1) {
                    itemInfo.Status = "outOfStock";
                    callback(null, itemInfo);
                }
                //聚美为1层，默认为型号,拼接variation
                var variation = {};
                variation.Id = 1;
                variation.Name = "型号";
                var values = [];
                text.sku_list[0].forEach(function (sku) {
                    var value = {};
                    value.ImageUrls = [];
                    value.ValueId = sku.sku_no;
                    value.Name = sku.sku_name;
                    value.ImageUrls.push(sku.sku_img);
                    values.push(value);
                    var item = {
                        "Unique": "cn.jumei." + sku.sku_no,
                        "Attr": [],
                        "Offers": [{
                            "Merchant": {
                                "Name": "jumei"
                            },
                            "List": [
                                {
                                    "Price": sku.jumei_price,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };
                    var attr = {};
                    attr.Nid = 1;
                    attr.N = "型号";
                    attr.Vid = sku.sku_no;
                    attr.V = sku.sku_name;
                    item.Attr.push(attr);
                    itemInfo.Items.push(item);
                });
                variation.Values = values;
                itemInfo.Variations.push(variation);
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                callback(null, itemInfo);
            });
        });
    } else if (params.type == 3) { //普通聚美商品
        //先抓取页面
        getHtml(params.urlStr, function (body, err, response) {
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }
            $ = cheerio.load(body);
            var title = _.trim($(".parameter_table").find('tr').children('td').eq(1).text());
            if (!title) {
                title = _.trim($(".breadcrumbs a:last-child").text())
            }
            var img = $(".parameter_table").find('tr').children('td').eq(2).find("img").attr("src");
            var itemInfo = {
                Unique: 'cn.jumei.' + params.goods_id,
                Md5: '',
                Status: 'inStock',
                Url: url,
                ItemAttributes: {
                    Title: title,
                    ShopName: '聚美优品',
                    ShopId: 'cn.jumei',
                    ImageUrl: img,
                    Tax: 1
                },
                Variations: [],
                Items: [],
                Coupon: ''
            };
            //抓取sku信息
            //匹配品牌id
            var req = /search_brand_id=\"([0-9]+)\"/ig;
            result = req.exec(body);
            if (!result) {
                req = /\"brandId\":([0-9]+)/ig;
                result = req.exec(body);
                if (!result) {
                    callback({
                        "Errors": {
                            'Code': 'Error',
                            "Message": "brand not found"
                        }
                    });
                    return;
                }
            }
            var brandId = result[1];
            var apiUrl = "http://www.jumei.com/i/Static/getProductSameInfoByProductID?product_id=" + params.goods_id + "&brand_id=" + brandId;
            getHtml(apiUrl, function (body, err, response) {
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
                //缺货处理
                if (text.stoke.sellable != 0) {
                    itemInfo.Status = "outOfStock";
                    callback(null, itemInfo);
                    return '';
                }
                //聚美为1层，默认为型号,拼接variation
                var variation = {};
                variation.Id = 1;
                variation.Name = "型号";
                var values = [];
                text.stoke.skus.forEach(function (sku) {
                    var value = {};
                    value.ImageUrls = [];
                    value.ValueId = sku.sku_no;
                    value.Name = sku.attribute;
                    value.ImageUrls.push(sku.sku_img);
                    values.push(value);
                    var item = {
                        "Unique": "cn.jumei." + sku.sku_no,
                        "Attr": [],
                        "Offers": [{
                            "Merchant": {
                                "Name": "jumei"
                            },
                            "List": [
                                {
                                    "Price": sku.price.jumei_price,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };
                    var attr = {};
                    attr.Nid = 1;
                    attr.N = "型号";
                    attr.Vid = sku.sku_no;
                    attr.V = sku.attribute;
                    item.Attr.push(attr);
                    itemInfo.Items.push(item);
                });
                variation.Values = values;
                itemInfo.Variations.push(variation);
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                callback(null, itemInfo);
            });

        });
    } else if(params.type == 4) {//聚美活动
        console.log(111)
        //先抓取页面
        getHtml(params.urlStr, function (body, err, response) {
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }
            $ = cheerio.load(body);
            var title = _.trim($(".deal_con_content").find('tr').children('td').eq(1).text());
            var img = $(".deal_con_content").find('tr').children('td').eq(2).find("img").attr("src");
            var itemInfo = {
                Unique: 'cn.jumei.' + params.goods_id,
                Md5: '',
                Status: 'inStock',
                Url: url,
                ItemAttributes: {
                    Title: title,
                    ShopName: '聚美优品',
                    ShopId: 'cn.jumei',
                    ImageUrl: img,
                    Tax: 1
                },
                Variations: [],
                Items: [],
                Coupon: ''
            };
            //抓取sku信息
            var apiUrl = "http://www.jumei.com/i/static/getDealInfoByHashId?hash_id=" + params.goods_id;
            getHtml(apiUrl, function (body, err, response) {
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
                //缺货处理
                //聚美为1层，默认为型号,拼接variation
                var variation = {};
                variation.Id = 1;
                variation.Name = "型号";
                var values = [];
                text.sku_info.skus.forEach(function (sku) {
                    var value = {};
                    value.ImageUrls = [];
                    value.ValueId = sku.sku_no;
                    value.Name = sku.attribute;
                    value.ImageUrls.push(sku.sku_img);
                    values.push(value);
                    var item = {
                        "Unique": "cn.jumei." + sku.sku_no,
                        "Attr": [],
                        "Offers": [{
                            "Merchant": {
                                "Name": "jumei"
                            },
                            "List": [
                                {
                                    "Price": sku.price.jumei_price,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };
                    var attr = {};
                    attr.Nid = 1;
                    attr.N = "型号";
                    attr.Vid = sku.sku_no;
                    attr.V = sku.attribute;
                    item.Attr.push(attr);
                    itemInfo.Items.push(item);
                });
                variation.Values = values;
                itemInfo.Variations.push(variation);
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                callback(null, itemInfo);
                return;
            });

        });
    }

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