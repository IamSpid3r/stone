/**
 * Created by libin on 2018/6/18.
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

exports.getInfo = function(urlStr,callback) {
    var urlInfo = url.parse(urlStr);
    var patt = /\/([0-9]+).html/ig
    result = patt.exec(urlInfo.path);
    if (!result) {
        callback({
            "Errors": {
                'Code': 'Fatal',
                "Message": 'url error no math goods id'
            }
        });
        return;
    }

    var goods_id = result[1];
    getHtml(urlStr,urlStr,function(body,err,response) {
        if(err) {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": err
                }
            });
            return;
        }
        var regexp = /(var GOODS_CONF = [\s\S]*?)<\/script>/ig;
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
        res = GOODS_CONF;

        var apiUrl = "https://m.wandougongzhu.cn/Product/ajaxMultiSpec?goods_id=" + goods_id+"&attr_group_id="+res.attr_group_id;
        getHtml(apiUrl,urlStr,function(body,err,response) {
            if(err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }

            console.log(body);
            text = _.trim(body);
            text = JSON.parse(text);

            var itemInfo = {
                Unique: 'cn.wandougongzhu.' + res.attr_group_id,
                Md5: '',
                Status: 'inStock',
                Url: url,
                ItemAttributes: {
                    Title: text.data.attr_group_name,
                    ShopName: '豌豆公主',
                    ShopId: 'cn.wandougongzhu',
                    ImageUrl: res.img,
                    Tax: 1
                },
                Variations: [],
                Items: [],
                Coupon: ''
            };



            callback(null,itemInfo);
        });





    })

}




function getHtml(urlStr,host,callback) {
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
            "Pragma": "no-cache",
            "Cookie": "user_key=f7cf3c1c0f3aed31b0e1e831c8c1c9b9; UM_distinctid=164126abcf540a-0cafb96919069d-2d604637-4a574-164126abcf6339; token=FXsnJRFfxZHGP2DL3hNkPjmrzp9E9vvoOklKZ1sWSVNnulhQBDWAaSZU3gTXgpum; CNZZDATA1257364836=1067237085-1529312793-%7C1529323587",
            "referer" : host
        }
    }, function (error, response, body) {
        callback(body, error);
    })
}