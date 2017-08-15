/**
 * @Author: songxiaoqiang
 * @Date:   2017-05-12T14:38:24+08:00
 * @Last modified by:   songxiaoqiang
 * @Last modified time: 2017-06-16T15:09:08+08:00
 */

var parseCookie = require('./parseCookie.js');
var initTbApi = require('./tbApi.js');
var request = require('request');
var fun = require('../fun.js');

var runList = function(sellerId, maxRequestNum, callback) {
    var requestNum = 0;
    var requestBody = function (globalCookies) {
        tbAPI = initTbApi(globalCookies);
        maxRequest = maxRequestNum;

        if(requestNum >= maxRequest){
            callback(null, 'max request');
            return;
        }else{
            requestNum++;
        }

        var a = "all"
            , c = 1
            , f = {
            "itemId":"8780523007",
            "sellerType":"c",
            "from":"detail",
            "sellerId": sellerId || "2559362420",
            "ttid":"2016@taobao_h5_2.0.0",
            "source":"","userId":""
        };
        var h = tbAPI.lib.mtop.request({
            //api: "mtop.order.queryBoughtList",
            api: "mtop.macao.market.activity.applycoupon.querycouponsfordetail",
            v: "1.0",
            data: f,
            ecode: 1,
        });

        h.then(function(l) {
            var apiUrl = 'https:' + l.data.url;
            var requestCookie = globalCookies;

            request({
                url:apiUrl,
                headers: {
                     Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                     'Accept-Encoding':'gzip, deflate, br',
                     'Accept-Language':'zh-CN,zh;q=0.8,en;q=0.6,ja;q=0.4',
                     'Cache-Control':no-cache,
                      Connection:keep-alive,
                      'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
                      Cookie : requestCookie
                }
            }, function (error, response, body) {
                let resStr = response.body.replace('mtopjsonp1(','')
                let res = resStr.substring(0,resStr.length-1)
                let resJson = JSON.parse(res);

                if (resJson.ret instanceof Array && resJson.ret[0].indexOf("SUCCESS") > -1) {
                    callback(resJson);
                }else{
                    if (response.headers['set-cookie']) {
                        var sc = response.headers['set-cookie'];
                        sc = sc.join('; ');

                        let cookieObj = new parseCookie(sc).parsetoJSON();

                        cookie = new parseCookie(cookieObj).parsetoSTR();

                        fun.writeLog('cookie.txt', cookie);

                        requestBody(cookie);
                    }else{
                        throw new Error;
                    }
                }
            })
        })
    }

    var cookie = fun.readLog('cookie.txt');

    requestBody(cookie);
}

module.exports =  runList;
