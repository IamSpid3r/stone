var parseCookie = require('./parseCookie.js');
var initTbApi = require('./tbApi.js');
var request = require('request');
var fun = require(process.cwd()+'/lib/fun.js');
var Q = require('q');
var login = 0;
var url = require('url');
var lastLoginTime = 0;
var _ = require('lodash');
var proxyRequest2 = require(process.cwd()+'/lib/proxyRequest2');
var proxyRequest = require(process.cwd()+'/lib/proxyRequest').proxyRequest;

var runList = function(params, cookiePath, callback) {
    var requestNum = 0;
    var maxRequestNum = 3;
    var requestBody = function (globalCookies, requestProxy) {
        requestProxy = requestProxy || proxyRequest2;

        tbAPI = initTbApi(globalCookies);
        maxRequest = maxRequestNum;

        if(requestNum >= maxRequest){
            callback(null, 'max request');
            return;
        }else{
            requestNum++;
        }

        var a = "all", c = 1;
        var h = tbAPI.lib.mtop.request(params);

        h.then(function(l) {
            var apiUrl = 'https:' + l.data.url;
            if (params.api == 'mtop.taobao.detail.getdetail') {
                apiUrl = apiUrl.replace(/api\.m/g, 'h5api.\m');
            }
            if (params.api == 'mtop.macao.market.activity.applycoupon.querycouponsfordetail') {
                apiUrl = apiUrl.replace(/api\.m/g, 'acs.\m');
            }
            if (params.api == 'mtop.tmall.detail.couponpage') {
                apiUrl = apiUrl.replace(/api\.m\.taobao/g, 'h5api\.m\.tmall');
            }
            if (params.api == 'mtop.taobao.social.ugc.post.detail') {
                apiUrl = apiUrl.replace(/api\.m/g, 'h5api\.m');
            }
            if (params.api == 'mtop.taobao.rate.detail') {
                apiUrl = apiUrl.replace(/api\.m\.taobao/g, 'h5api\.m\.tmall');
            }
            if (params.api == 'mtop.taobao.social.feed.aggregate') {
                apiUrl = apiUrl.replace(/api\.m/g, 'acs\.m');
            }
            console.log(apiUrl);
            var requestCookie = globalCookies;

            options = {};
            options.gzip = true;
            options.url = apiUrl;
            options.timeout = 5000;
            //options.proxy = 'http://180.125.46.182:4321';
            options.headers = {
                'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding':'gzip, deflate, br',
                'Accept-Language':'zh-CN,zh;q=0.8,en;q=0.6,ja;q=0.4',
                'Cache-Control':'no-cache',
                'User-Agent':'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36',
                'Cookie' : requestCookie
            };
            requestProxy(options, function (error, response, body) {

                if(error) {
                    if (response && response.statusCode == 429) {
                        console.log(429, 'proxyRequest');
                        return requestBody(globalCookies, proxyRequest);
                    }
                    return callback(null, error.message);
                }else{
                    let resStr = response.body.replace('mtopjsonp1(','');
                    let res = resStr.substring(0,resStr.length-1);
                    try {
                        var resJson = JSON.parse(res);
                    } catch (e) {
                       return callback(null, 'jsonerror:'+res.substr(0, 100));
                    }

                    switch (params.api) {
                        //商品详情页
                        case 'mtop.taobao.detail.getdetail':
                            if (resJson.ret instanceof Array
                                && resJson.ret[0].indexOf('代理软件') == -1
                                && resJson.ret[0].indexOf('被挤爆啦') == -1
                                && resJson.ret[0].indexOf('FAIL_SYS_USER_VALIDATE') == -1
                            ) {
                                return callback(resJson);
                            }else{
                                if (response.headers['set-cookie']) {
                                    var sc = response.headers['set-cookie'];
                                    sc = sc.join('; ');
                                    let cookieObj = new parseCookie(sc).parsetoJSON();
                                    cookie = new parseCookie(cookieObj).parsetoSTR();

                                    fun.writeLog(cookiePath, cookie);
                                    requestBody(cookie);
                                }else{
                                    console.log(500, 'repeat crawl..');
                                    return requestBody(globalCookies, proxyRequest);
                                   // return callback(null, '抓取服务器错误');
                                }
                            }
                            break;
                        case 'mtop.alimama.union.hsf.coupon.get':
                            if (resJson.ret instanceof Array && resJson.ret[0].indexOf('SUCCESS') > -1) {
                                callback(resJson);
                            }else{
                                if (response.headers['set-cookie']) {
                                    var sc = response.headers['set-cookie'];
                                    sc = sc.join('; ');
                                    let cookieObj = new parseCookie(sc).parsetoJSON();
                                    cookie = new parseCookie(cookieObj).parsetoSTR();

                                    fun.writeLog(cookiePath, cookie);
                                    requestBody(cookie);
                                }else{
                                    callback(null, '抓取服务器错误');
                                }
                            }
                            break;
                        case 'mtop.taobao.rate.detail':
                            if (resJson.ret instanceof Array && resJson.ret[0].indexOf('SUCCESS') > -1) {
                                callback(resJson);
                            }else{
                                if (response.headers['set-cookie']) {
                                    var sc = response.headers['set-cookie'];
                                    sc = sc.join('; ');
                                    let cookieObj = new parseCookie(sc).parsetoJSON();
                                    cookie = new parseCookie(cookieObj).parsetoSTR();

                                    fun.writeLog(cookiePath, cookie);
                                    requestBody(cookie);
                                }else{
                                    callback(null, '抓取服务器错误');
                                }
                            }
                            break;
                        case 'mtop.tmall.detail.couponpage':
                            if (resJson.ret instanceof Array
                                && (
                                    resJson.ret[0].indexOf('SUCCESS') > -1
                                )
                            ) {
                                callback(resJson);
                            }else{
                                callback(null, '抓取服务器错误');
                            }
                            break;
                        case 'mtop.taobao.social.feed.aggregate':
                       
                            if (resJson.ret instanceof Array
                                && resJson.ret[0].indexOf('代理软件') == -1
                                && resJson.ret[0].indexOf('被挤爆啦') == -1
                                && resJson.ret[0].indexOf('FAIL') == -1
                            ) {
                                return callback(resJson);
                            }else{
                                if (response.headers['set-cookie']) {
                                    var sc = response.headers['set-cookie'];
                                    sc = sc.join('; ');
                                    let cookieObj = new parseCookie(sc).parsetoJSON();
                                    cookie = new parseCookie(cookieObj).parsetoSTR();
                                    console.log(cookie, 223333)
                                    fun.writeLog(cookiePath, cookie);
                                    requestBody(cookie);
                                }else{
                                    console.log(500, 'repeat crawl..');
                                    return requestBody(globalCookies, proxyRequest);
                                // return callback(null, '抓取服务器错误');
                                }
                            }
                            break;
                        //默认页面
                        default:
                            if (resJson.ret instanceof Array) {
                                callback(resJson);
                            }else{
                                callback(null, '抓取服务器错误');
                            }
                            break;
                    }
                }
            })
        })
    }

    var cookie = _.trim(fun.readLog(cookiePath));
    requestBody(cookie);
}

module.exports =  runList;
