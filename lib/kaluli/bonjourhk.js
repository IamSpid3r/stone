/**
 * Created by libin on 2018/6/15.
 */
var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');
var eventproxy = require('eventproxy');
var Q            = require('q');
// var proxyRequest = require('./proxyRequest2');
var proxyRequest = require('../proxyRequest').proxyRequest;
var iconv = require('iconv-lite');


exports.getInfo = function(urlStr,callback) {
    var urlInfo = url.parse(urlStr);
    var patt = /\/([0-9]+)/ig;
    result = patt.exec(urlInfo.path);

    var goods_id = result[1];
    getHtml(urlStr,function(body,err,response) {
        if (err) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err
                }
            });
            return;
        }
        var newBody = iconv.decode(body,"utf-8");
        $ = cheerio.load(body);
        var itemInfo = {
            Unique: 'cn.bonjourhk.' + goods_id,
            Md5: '',
            Status: 'inStock',
            Url: url,
            ItemAttributes: {
                Title: $(".band_name").text() + " " + $("h1.brand-title").text(),
                ShopName: '香港卓悦网',
                ShopId: 'cn.bonjourhk',
                ImageUrl: $(".item").eq(0).find("img").attr("src"),
                Tax: 1
            },
            Variations: [],

            Items: [],
            Coupon: ''
        };

        //卓越都是单规格装载规格
        var item = {
            "Unique": "cn.bonjourhk." + goods_id,
            "Attr": [],
            "Offers": [{
                "Merchant": {
                    "Name": "bonjourhk"
                },
                "List": [
                    {
                        "Price": cusstr($(".detail-price").find("price").text(),"(",1),
                        "Type": "HKD"
                    }
                ]
            }]
        };
        itemInfo.Items.push(item);
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null,itemInfo);
    });
}




function getHtml(urlStr, callback){
    proxyRequest({
        encoding: null,
        url: urlStr,
        timeout: 5000,
        header: {
            'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding':'gzip, deflate, br',
            'Accept-Language':'zh-CN,zh;q=0.8,en;q=0.6,ja;q=0.4',
            'Cache-Control':'no-cache',
            'User-Agent':'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36',
            'Cookie': 'PHPSESSID=67076afa0a8780244fe3ecf30bc9f6ed; region=1; language=zh-HK; currency=HKD; _ga=GA1.2.1850980833.1528772759; __zlcmid=mshPUOFrJMp63R; __cfduid=d13dbeaae45aeda9b5a30d5e1e7a3b8f61529044912; _gid=GA1.2.1922899637.1529303807; Hm_lvt_601a05fce633633f9350f7cad74a6bb8=1529303885; Hm_lpvt_601a05fce633633f9350f7cad74a6bb8=1529311857'
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}


function cusstr(str, findStr, num) {
    var idx = str.indexOf(findStr);
    var count = 1;
    while (idx >= 0 && count < num) {
        idx = str.indexOf(findStr, idx + 1);
        count++;
    }
    if (idx < 0) {
        return '';
    }
    return str.substring(0, idx);
}