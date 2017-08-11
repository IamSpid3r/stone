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

var runList = function(activityId, sellerId, maxRequestNum, callback) {
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
            , f = {"uuid":activityId,"sellerId":sellerId,"queryShop":true};
        var h = tbAPI.lib.mtop.request({
            api: "mtop.taobao.couponMtopReadService.findShopBonusActivitys",
            v: "3.0",
            AntiFlood:true,
            ecode: 1,
            H5Request:true,
            data: f,
        });

        h.then(function(l) {
            var apiUrl = 'https:' + l.data.url;
            var requestCookie = globalCookies;

            request({
                url:apiUrl,
                headers: {
                    Cookie : requestCookie,
                }
            }, function (error, response, body) {
                let resStr = response.body.replace('mtopjsonp1(','')
                let res = resStr.substring(0,resStr.length-1)
                let resJson = JSON.parse(res);
                console.log(apiUrl, resJson)

                if (resJson.ret instanceof Array && resJson.ret[0].indexOf("SUCCESS") > -1) {
                    callback(resJson);
                }else{
                    if (response.headers['set-cookie']) {
                        var sc = response.headers['set-cookie'];
                        sc = sc.join('; ');

                        let cookieObj = new parseCookie(sc).parsetoJSON();

                        cookie = new parseCookie(cookieObj).parsetoSTR();

                        //fun.writeLog('./cookie.txt', cookie);

                        requestBody(cookie);
                    }else{
                        throw new Error;
                    }
                }
            })
        })
    }

    //var cookie = fun.readLog('cookie.txt');
    cookie = 'miid=8850501454137147645; UM_distinctid=15b227a7592639-02f64e6c2b194d-1d3d6850-fa000-15b227a759377f; l=AltbbMsKRa/p/wSS0Qr-oEtma7TFVG9v; hng=CN%7Czh-CN%7CCNY%7C156; thw=cn; ctoken=SanOd76wnzeMAYy0hGejiceland; v=0; _m_user_unitinfo_=unit|unsz; _m_unitapi_v_=1501149379477; existShop=MTUwMjI3NDQ1MA%3D%3D; cookie2=103d507309128f12fb7c1f7e10beca0b; mt=np=&ci=10_1&cyk=2_0; tg=0; uc2=wuf=https%3A%2F%2Fguanjia.1688.com%2Fpage%2Fconsignoffer.htm%3Fspm%3Da261y.7663282.0.0.9JB9eT; ali_ab=180.173.4.70.1502183557981.9; ockeqeudmj=rR7XPxc%3D; munb=761008464; WAPFDFDTGFG=%2B4cMKKP%2B8PI%2BNCvomScNS%2F3NP4Rjers%3D; _w_app_lg=21; uc3=sg2=BqQjfd2I48qNllplAP0PeqhHfMI0SbLlxBN6OKhHioY%3D&nk2=CzU40LsQJv8VSkPW&id2=VAcPTBfHdD5t&vt3=F8dBzWRNZP%2FQsAUU4dY%3D&lg2=VT5L2FSpMGV7TQ%3D%3D; lgc=hxl724753832; uss=U7BAM8XeyWkJ1tahxlxvCGJAcoo0CiUx%2FJU%2BSUE3OUtc66OUWin%2FEGXicQ%3D%3D; tracknick=hxl724753832; sg=24d; cookie1=BxuXsvQYNBRkeKpwXKczWSkrGNNnzIrQu7EEuyjbinE%3D; ntm=0; unb=761008464; skt=ab725f09d8c9c51b; t=a4508d1c5e995d36c219759503a616f2; _cc_=VT5L2FSpdA%3D%3D; _nk_=hxl724753832; _l_g_=Ug%3D%3D; cookie17=VAcPTBfHdD5t; uc1=cookie14=UoTcDU9FmmHI%2FQ%3D%3D&lng=zh_CN&cookie16=Vq8l%2BKCLySLZMFWHxqs8fwqnEw%3D%3D&existShop=true&cookie21=VT5L2FSpdet1FS8C2gIFaQ%3D%3D&tag=8&cookie15=VT5L2FSpMGV7TQ%3D%3D&pas=0; _tb_token_=e37ee0ff38568; linezing_session=dVt7FXjAySzBNnVEUCplvHUD_1502289827868S32U_39; isg=At7eZeuzC4JHtlFNGK3fnA8aL3LgN6J0tp4iBIhnTiEcq36F8C_yKQRL1YFc; _m_h5_tk=5859347499dbf6c8009180964b54df83_1502293190490; _m_h5_tk_enc=f2ad385f39a7cc5df78efbf98b45e7b4; cna=wUEmEDfrSXICAXTpm2vXEC1F';
    requestBody(cookie);
}

module.exports =  runList;
