var parseCookie = require('./parseCookie.js');
var initTbApi = require('./tbApi.js');
var request = require('request');
var fun = require(process.cwd()+'/lib/fun.js');
var Q = require('q');
var loginTabao = require(process.cwd()+'/tools/loginTabao/index')
var login = 0;
var url = require('url');
var lastLoginTime = 0;
var _ = require('lodash');
var proxyRequest2 = require(process.cwd()+'/lib/proxyRequest2');

var runList = function(params, cookiePath, callback) {
    var requestNum = 0;
    var maxRequestNum = 2;
    var requestBody = function (globalCookies) {
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

            var requestCookie = globalCookies;

            options = {};
            options.gzip = true;
            options.url = apiUrl;
            proxyRequest2(options, function (error, response, body) {
                if(error) {
                    return callback(null, error);
                }else{
                    let resStr = response.body.replace('mtopjsonp1(','')
                    let res = resStr.substring(0,resStr.length-1);
                    let resJson = JSON.parse(res);

                    switch (params.api) {
                        //商品详情页
                        case 'mtop.taobao.detail.getdetail':
                            if (resJson.ret instanceof Array && resJson.ret[0].indexOf('代理软件') == -1) {
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
                                    return callback(null, '抓取服务器错误');
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
                        //默认页面
                        default:
                            if (resJson.ret instanceof Array) {
                                if(resJson.ret[0].indexOf("SUCCESS") > -1 && 'coupons' in resJson.data){
                                    callback(resJson);
                                    return;
                                }else if(resJson.ret[0].indexOf("系统错误") > -1){
                                    callback(null, '不支持的商品');
                                    return;
                                }else{
                                    var timestamp = (new Date())/1000;
                                    if(timestamp - lastLoginTime > 300){
                                        lastLoginTime = timestamp;
                                        loginTabao();
                                    }
                                    callback(null, '正在登录,请稍后再试');
                                    return;
                                }
                            }else{
                                var timestamp = (new Date())/1000;
                                if(timestamp - lastLoginTime > 300){
                                    lastLoginTime = timestamp;
                                    loginTabao();
                                }
                                callback(null, '正在登录,请稍后再试');
                                return;
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
