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

        var a = "all"
            , c = 1;
        var h = tbAPI.lib.mtop.request(params);

        h.then(function(l) {
            var apiUrl = 'https:' + l.data.url;
            //console.log(apiUrl)
            var requestCookie = globalCookies;

            var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';

            var urlParsed = url.parse(apiUrl);
            var proxyHost = "http-dyn.abuyun.com";
            var proxyPort = "9020";
            var proxyUser = "H1B70L4D3801OSOD";
            var proxyPass = "96FA7DBB0020A1E6";

            var options = {};
            options.headers = {
                'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding':'gzip, deflate, br',
                'Accept-Language':'zh-CN,zh;q=0.8,en;q=0.6,ja;q=0.4',
                'Cache-Control':'no-cache',
                'User-Agent':'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36',
                 Cookie : requestCookie
            };
            options.headers['Proxy-Switch-Ip'] = "yes";
            var proxyUrl = "http://" + proxyUser + ":" + proxyPass + "@" + proxyHost + ":" + proxyPort;
            options.proxy = proxyUrl;
            options.url = apiUrl;
            options.gzip = true;

            request(options, function (error, response, body) {
                if(error) {
                    callback(null, error);
                }else{
                    let resStr = response.body.replace('mtopjsonp1(','')
                    let res = resStr.substring(0,resStr.length-1)
                    let resJson = JSON.parse(res);

                    switch (params.api) {
                        //商品详情页
                        case 'mtop.taobao.detail.getdetail':
                            if (resJson.ret instanceof Array && resJson.ret[0].indexOf('代理软件') == -1) {
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
