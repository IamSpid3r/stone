var request = require('request');
var md5 = require('md5');
var stringRandom = require('string-random');
var _ = require('lodash');
var url = require('url');
var Q = require('q');
var iconv = require('iconv-lite');

//unb=336134075 munb=336134075
var xuid = "";
//cookie2=
var sid = "";

var deviceId = stringRandom(44);
var utdid = stringRandom(24);
// 3711462a1192aff07bab14f7f70bdd2a

// 48450020   3b48360e418685c130497a2d33f9ba0f
//_cc_=UIHiLt3xSw%3D%3D;_l_g_=Ug%3D%3D;_nk_=muskmelonz;_tb_token_=SrH7Ty2rlL5vud9;cookie1=B0BV2lD8s3ycyjvKFQKSXzgxM6Yl2rGJDElnJgmSf70%3D;cookie17=VyT3Hh0EHQU%3D;cookie2=3b48360e418685c130497a2d33f9ba0f;csg=95f5b163;lgc=muskmelonz;munb=48450020;sg=z05;skt=9e701cb46fb85362;t=8e049cd9fcf816bed743aef3b4f34106;tracknick=muskmelonz;uc1=cookie21=V32FPkk%2FgPzW&cookie15=WqG3DMC9VAQiUQ%3D%3D&cookie14=UoTfItFmYxslWg%3D%3D;uc3=vt3=F8dByRquF3QrI4y7uoQ%3D&id2=VyT3Hh0EHQU%3D&nk2=DkXelvN5w30ydQ%3D%3D&lg2=UIHiLt3xD8xYTw%3D%3D;unb=48450020;_m_h5_tk=4f7a935527bd15679bf22109effe8034_1539151423192;_m_h5_tk_enc=370df9ba5edc6e6c57425878ad3d0b8f;cna=XdZBFEpDBxACAWVQa35YQa7h;isg=BCAgnmJsb94hstPdonzxOXqy-yryKQTzoRCdc5ox7DvOlcC_QjnUg_YHKbsVPrzL;
// 1106513235   1d8b4f25227c938c98265baa95d65838
//_cc_=U%2BGCWk%2F7og%3D%3D;_l_g_=Ug%3D%3D;_nk_=wang101373952;_tb_token_=HBt7e2gmwTiNj7A;cookie1=VASilvCoYxrySWQ0saR2OvnOs5ZQmWxZHJ0h5rOgRSA%3D;cookie17=UoCJjiHYLJDNVA%3D%3D;cookie2=1d8b4f25227c938c98265baa95d65838;csg=9cba69d8;lgc=wang101373952;munb=1106513235;sg=25f;skt=f23485a3923740f1;t=7ecc7fce861792922c58ec41e4ffd2a2;tracknick=wang101373952;uc1=cookie21=U%2BGCWk%2F7pY%2FF&cookie15=VT5L2FSpMGV7TQ%3D%3D&cookie14=UoTfItFmYRoNfw%3D%3D;uc3=vt3=F8dByRquF3IkPBGCIR8%3D&id2=UoCJjiHYLJDNVA%3D%3D&nk2=FPjankqjkx8Up3SM7Q%3D%3D&lg2=WqG3DMC9VAQiUQ%3D%3D;unb=1106513235;isg=BGZmzEJLAUx3e9XoL1Esp8AAvdjoR6oBUKx8E1APUglk0wbtuNf6EUwDL0nf4KIZ;cna=5zY2FAupjjQCAbSrwYrrK5IZ;_m_h5_tk=4aafe75bf41e0b0cc0d70874d06e605d_1539173291147;_m_h5_tk_enc=2f32b21eab731ec1942d2376b4548457;
// 700527181  1480f31b61b1e664caac71bcbfa1e735
//_cc_=UIHiLt3xSw%3D%3D;_l_g_=Ug%3D%3D;_nk_=%5Cu6D45%5Cu7B11_%5Cu9189_%5Cu659C%5Cu9633;_tb_token_=KJG8drTuslDgPoA;cookie1=ACq7u9o0VM68opA%2FqT%2F9dsCwKA%2FWLbQHz%2BV%2FvcOJLUg%3D;cookie17=VAFf%2FEQTEPo0;cookie2=1480f31b61b1e664caac71bcbfa1e735;csg=f7955f83;lgc=%5Cu6D45%5Cu7B11_%5Cu9189_%5Cu659C%5Cu9633;munb=700527181;sg=%E9%98%B316;skt=0b3ea8403412d29b;t=4ee4a10976ca8acfe22b8381bef67c0e;tracknick=%5Cu6D45%5Cu7B11_%5Cu9189_%5Cu659C%5Cu9633;uc1=cookie21=WqG3DMC9Edo1TBf%2BcZ0sSw%3D%3D&cookie15=Vq8l%2BKCLz3%2F65A%3D%3D&cookie14=UoTfItFnTtWVgA%3D%3D;uc3=vt3=F8dByRquFDQ4PpIgL2A%3D&id2=VAFf%2FEQTEPo0&nk2=pNKc%2ByV%2BP4hvtHc%2F&lg2=VT5L2FSpMGV7TQ%3D%3D;unb=700527181;isg=BF9fYuazeKo08XydNdLLTlmP5LfpxLNmAh4dgfGs-45VgH8C-ZRDtt3TRtZbA4ve;_m_h5_tk=3b857be6ed7ba8a318ab83fd575eaf41_1539091630225;_m_h5_tk_enc=4b3df1f91b87a20588c78bfde5a31f71;cna=DsIeFAtqXTkCAXJZLuxkZCGZ;
// 336134075 1a9b0a62ec332d96fb3311c662187cf1
//_cc_=W5iHLLyFfA%3D%3D;_l_g_=Ug%3D%3D;_nk_=wp306561296;_tb_token_=qpS6O9jnd4UfSi9;cookie1=ACu%2F4cAemy8YXncXe29Y1R4hFpRywW%2FyNZQ%2BHcdn9eg%3D;cookie17=UNN78EuHg7xc;cookie2=1a9b0a62ec332d96fb3311c662187cf1;csg=d87c9814;lgc=wp306561296;munb=336134075;sg=659;skt=19712070f7de4e3a;t=49e86af5da1e90efc6d2c9a041f34333;tracknick=wp306561296;uc1=cookie21=UIHiLt3xSifiVqTH8o%2F0Qw%3D%3D&cookie15=WqG3DMC9VAQiUQ%3D%3D&cookie14=UoTfItFnTxFbGg%3D%3D;uc3=vt3=F8dByRquFDUWoHupTZw%3D&id2=UNN78EuHg7xc&nk2=FOnTGnmcCH1MABI%3D&lg2=VFC%2FuZ9ayeYq2g%3D%3D;unb=336134075;isg=BH5-hmqhqZRy2_2meJRJ0YnexZDAv0I5-rT2CSiH6kG8yx6lkE-SSaQrR1GOaDpR;cna=DagoFHgkeiQCAWVQa3+9OKuY;_m_h5_tk=ecbf5c2273a05d915415a95d2cd3680a_1539152541036;_m_h5_tk_enc=b42062a0cc4167964092eea409465aaa;
var appKey = "21646297";
var lat = "30.91966";
var lng ="121.614151";
var ttid = "10001401@taobao_android_8.0.0";
// var ttid = "10001401@taobao_android_8.0.0";
var features = "27";
var v = "1.0";
var api = "mtop.taobao.wsearch.appsearch";
var t = Date.parse(new Date())/1000;

exports.getInfo = function(urlstr, page,  callback) {
    proxyRequest({
        url: urlstr,
        headers: { 'User-Agent' : 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        var  exp1 = /<meta[^>]*content=\"[^>]*siteCategory=(\d*)[^>]*shopId=(\d*)[^>]*userId=(\d*).*?\"/ig;
        var  res1 = exp1.exec(body);
        if(res1){
            var  userId = res1[3];
            var  shopId = res1[2];
            var  siteCategory = res1[1];

            getItemInfo(
                {
                    userId:userId,
                    shopId:shopId,
                    siteCategory:siteCategory,
                    page:page
                },
                callback
            );
        }else{
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'host error is not taobao shop hostname'
                }
            });
        }
    })
}


function getItemInfo(params, callback){
    var  userId = params.userId;
    var  shopId = params.shopId;
    var  siteCategory = params.siteCategory;
    var  page =  Number(params.page);

    var data_obj = {
      "_inNestedEmbed": "true",
      "_page_home_isweex_": "true",
      "_page_inside_embed_": "true",
      "active_bd": "1",
      "apptimestamp": "1540895323",
      "areaCode": "CN",
      "brand": "OPPO",
      "clickFeature": "564495511334,50012031,309296494,0,1540893634,9;544007895653,50012031,1871303308,0,1540817320,5;578862656926,50012906,2262509082,1,1540483663,14;522067173659,50011980,2248304671,1,1540380982,64;574604278958,50011979,2226443848,1,1540380951,22;43934074987,50011980,2424298091,1,1540380907,28;577468124421,50012036,385132127,1,1540380895,4;578102201675,50012031,385132127,1,1540380870,13",
      "countryNum": "156",
      "device": "OPPO+R9s",
      "disablePromotionTips": "false",
      "editionCode": "CN",
      "filterEmpty": "true",
      "filterUnused": "true",
      "homePageVersion": "v5",
      "ignoreShopHeadEvent": "false",
      "imei": "864416033760896",
      "imsi": "85111OPPOR916ea",
      "inWeexShop": "true",
      "info": "wifi",
      "isMiniApp": "false",
      "isWeexShop": "true",
      "itemfields": "commentCount,newDsr",
      "latitude": "31.271687",
      "longitude": "121.475987",
      "m": "shopitemsearch",
      "miniAppCategoryUrl": "",
      "n": "20",
      "network": "wifi",
      "new_shopstar": "true",
      "page": page,
      "rainbow": "12880,12751,12827,12668,12820,11835,12704,12870",
      "searchFramework": "true",
      "search_wap_mall": "false",
      "sellerId": userId,
      "setting_on": "imgBanners,userdoc,tbcode,pricerange,localshop,smartTips,firstCat,dropbox,realsale,insertTexts,tabs",
      "shopId": shopId,
      "showspu": "true",
      "spm-cnt": "a2141.7631671.0.0",
      "sputips": "on",
      "style": "list",
      "sversion": "5.8",
      "ttid": "700407@taobao_android_8.1.0",
      "useIframeInWeb": "false",
      "utd_id": "WQSSdDeK6o8DAMA3e9F3dtgG",
      "vm": "nw",
      "weexShopTabId": "0.1",
      "weexShopTabIndex": "1",
      "weexShopToken": "bQl6utqeDVWqqa",
      "weexShopTransparentBG": "true",
      "wh_weex": "true"
    }
    var data = JSON.stringify(data_obj);

    Get_xsign(data, xuid, t, utdid, appKey, lat, lng, api, v, sid, ttid, deviceId, features,function(xsign,signTime){

        var url = "https://guide-acs.m.taobao.com/gw/"+api+"/" + v + "/?data="+encodeURIComponent(data);
        headers = {
            'x-appkey': appKey,
            'x-t':signTime,
            'x-pv':"5.2",
            "x-sign":xsign,
            "x-features":features,
            "x-location":lng+"%2C"+lat,
            "x-ttid":ttid,
            "x-utdid":utdid,
            "x-devid":deviceId,
            "x-uid":xuid,
            "x-sid":sid,
            "x-app-ver":'8.0.0',
            "f-refer": "mtop",
            "x-page-name": "com.taobao.tao.detail.activity.DetailActivity",
            "user-agent": "MTOPSDK/3.1.0.1+(Android;6.0.1;OPPO;OPPO+R9s)",
            "a-orange-q": "appKey=21646297&appVersion=8.0.0&clientAppIndexVersion=1120181015163318678&clientVersionIndexVersion=1220181015163318678",
            "x-nq": "WIFI",
            "x-mini-wua": "HHnB_Nf8Du2RkJSB0+tz5jpwigopZ3l266ZHwctgi5mc9K4cHWIaYXdbriLamYD/S06hCT2dViWcQTj5c4JMh4MRw/kp1odPfG5T4U0oXJixgT7KC863kI/Up+dXr8Z0AJxTv",
            "x-c-traceid": "WQSSdDeK6o8DAMA3e9F3dtgG15395925338750052112484",
            "x-page-url": "http://item.taobao.com/item.htm"
        };

        var j = request.jar();
        var cookie = request.cookie('imewweoriw=3%2FrNea0503NE6Wbc0to6cpPxvTCX7CEc3i4MKML5Bmc%3D; WAPFDFDTGFG=%2B4cMKKP%2B8PI%2BK02g89pKBNlp3DSK5w%3D%3D; _w_tb_nick=wp306561296; ockeqeudmj=ufDz%2BYA%3D; uc1=cookie21=UIHiLt3xSifiVqTH8o%2F0Qw%3D%3D&cookie15=WqG3DMC9VAQiUQ%3D%3D&cookie14=UoTfIta4TgyJUw%3D%3D; uc3=vt3=F8dByRmtYSpgwJzkIIA%3D&id2=UNN78EuHg7xc&nk2=FOnTGnmcCH1MABI%3D&lg2=U%2BGCWk%2F75gdr5Q%3D%3D; unb=336134075; sg=659; tracknick=wp306561296; t=cbe37ebcf315dc3da2938bb05628707a; _l_g_=Ug%3D%3D; skt=b0f049810f17194b; lgc=wp306561296; _cc_=UtASsssmfA%3D%3D; munb=336134075; _nk_=wp306561296; csg=6a4942d3; cookie2=1bde7dbc138beb8910f601273e545962; _tb_token_=ozRE0wuJMlszgr9; ti=700407%40taobao_android_8.0.0; cna=BkdMFG5maFYCAbSrwYo/brb8; _m_h5_tk=8bf1dd573d8f7520c65ff107bb24c832_1539670119038; _m_h5_tk_enc=fd4957d1040fa09833d89cdadf818019; cookie17=UNN78EuHg7xc; cookie1=ACu%2F4cAemy8YXncXe29Y1R4hFpRywW%2FyNZQ%2BHcdn9eg%3D; imewweoriw=3%2FrNea0503NE6Wbc0to6cpPxvTCX7CEc3i4MKML5Bmc%3D; WAPFDFDTGFG=%2B4cMKKP%2B8PI%2BK02g89pKBNlp3DSK5w%3D%3D; _w_tb_nick=wp306561296; ockeqeudmj=ufDz%2BYA%3D; uc1=cookie21=UIHiLt3xSifiVqTH8o%2F0Qw%3D%3D&cookie15=WqG3DMC9VAQiUQ%3D%3D&cookie14=UoTfIta4TgyJUw%3D%3D; uc3=vt3=F8dByRmtYSpgwJzkIIA%3D&id2=UNN78EuHg7xc&nk2=FOnTGnmcCH1MABI%3D&lg2=U%2BGCWk%2F75gdr5Q%3D%3D; unb=336134075; sg=659; tracknick=wp306561296; t=cbe37ebcf315dc3da2938bb05628707a; _l_g_=Ug%3D%3D; skt=b0f049810f17194b; lgc=wp306561296; _cc_=UtASsssmfA%3D%3D; munb=336134075; _nk_=wp306561296; csg=6a4942d3; cookie2=1bde7dbc138beb8910f601273e545962; _tb_token_=ozRE0wuJMlszgr9; ti=700407%40taobao_android_8.0.0; cna=BkdMFG5maFYCAbSrwYo/brb8; _m_h5_tk=8bf1dd573d8f7520c65ff107bb24c832_1539670119038; _m_h5_tk_enc=fd4957d1040fa09833d89cdadf818019; cookie17=UNN78EuHg7x');
        j.setCookie(cookie, 'http://trade-acs.m.taobao.com');
        request({
          method: 'get',
          url: url,
          headers: headers,
          form:{data:data},
          // jar:j
        }, function (error, response, body) {
          if (!error && response.statusCode == 200) {
                var itemInfo = {
                    Unique: 'cn.taobao.'+shopId,
                    Status: 'inStock',
                    Url: 'https://shop'+shopId+'.taobao.com',
                    ItemAttributes: {
                        UserId : userId,
                        ShopId:  shopId,
                        TotalPage: '',
                        CurrentPage: ''
                    },
                    Items: []
                };      

                text = JSON.parse(body);

               //页面抓取信息
                itemInfo.ItemAttributes.TotalPage = text.data.totalPage;
                itemInfo.ItemAttributes.CurrentPage = page;

                //获取正确的地址
                var store = 'taobao';
                if (siteCategory == 3) store = 'tmall';
                var items =[];

                text.data.itemsArray.forEach(function(item) {
                    if(item.title.indexOf('竞拍') > -1 || item.title.indexOf('拍卖') > -1){
                        
                    }else{
                        items.push({
                            Unique: 'cn.taobao.' + item.item_id,
                            Title: item.title,
                            Img: item.pic_path,
                            Url: getRealUrl(item.item_id, store),
                            Price: item.priceWap,
                            Sold: item.sold,
                            TotalSoldQuantity: item.quantity
                        })
                    }
                })

                itemInfo.Items = items;
                callback(null,itemInfo);
                return ;
          
          } else {
            callback(error);
            return ;
          }
        });
    })
   
}


/*
 *获取html
 **/
var maxRequestNum = 2;
var requestNum = 0;
function proxyRequest(options, callback){
    options.headers['refer'] = 'https://auxdq.m.tmall.com/shop/shop_auction_search.htm?spm=a320p.7692171.0.0&suid=1035757927&sort=d';
    options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    options.headers['Accept-Encoding'] = "deflate, sdch";
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8";
    options.headers['Cookie'] = "tk_trace=1; tkmb=e=9ZdxEOJsQoiymJZxCAKYIwHYsPpQBUD8uB80tNN3eIsfjC3u4uf6y4e8-TybEwi8DDzYZRlXmoSaSnZEjpXMTX9RbcEiqhG6WxeUuXCNpadmIMu_PEOir644MRH8Nq9U_dPpevtDL2U1AYSlWCzs3tnYsRuWdXnEqSSECCF4URLk0H8QOMkLOi3B2ZpjOPhzVwIpTEq06OExXEasESDKB2c_BW0xynBca7TT3t6OiZZ33oywoQmlYwNFvUS3Oncv&iv=0&et=1537241703&tk_cps_param=31576222&tkFlag=1; dnk=hupu0103; lid=hupu0103; cna=f65VFCXtHE0CAWVQa3/rxaEQ; _m_h5_tk=5763d557ed39d4b78099b382017ab743_1540792185273; _m_h5_tk_enc=3bf7f2951359730da4215c1be452caae; uc1=cookie16=URm48syIJ1yk0MX2J7mAAEhTuw%3D%3D&cookie21=W5iHLLyFe3xm&cookie15=UtASsssmOIJ0bQ%3D%3D&existShop=false&pas=0&cookie14=UoTYNkC84v%2Bbmw%3D%3D&tag=8&lng=zh_CN; uc3=vt3=F8dByRjI7Vfv3M2potE%3D&id2=UNDWqqkR6Sfmlw%3D%3D&nk2=r7kg%2BUUV%2FhZPNK%2FA&lg2=V32FPkk%2Fw0dUvg%3D%3D; tracknick=%5Cu5929%5Cu6C14%5Cu5F88%5Cu597D4166; _l_g_=Ug%3D%3D; unb=3028799993; lgc=%5Cu5929%5Cu6C14%5Cu5F88%5Cu597D4166; cookie1=B0b5kYQzKkawI2z5gFlVWHOWbzWf41B6nwo3jNvBQcU%3D; login=true; cookie17=UNDWqqkR6Sfmlw%3D%3D; cookie2=16f9d39a9ccfe5bfc2d41f93d8319e8d; _nk_=%5Cu5929%5Cu6C14%5Cu5F88%5Cu597D4166; t=006cd7601c8f9fc60c9941c91d082c6b;csg=bb42185a; skt=1e79be065355890c; _tb_token_=e135edb38ee35; x5sec=7b227477736d3b32223a223663346238393436366166383162396532383130666262313938613365313735434d762b32643446454b7968704950347649365758786f4d4d7a41794f4463354f546b354d7a7378227d; isg=BLS04T3vUzG1c8e92WsmhSz3hXSKnem9uXuhqE4VQD_CuVQDdp2oB2ozPbfEQRDP";

    var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
    Q('get').then(function(success){
        var defer = Q.defer();
        request({url:developUrl,timeout:2000}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if(body.status == 'ok'){
                    options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
                    //options.proxy = 'HTTP://172.16.15.139:8888';
                    console.log(options.proxy)
                    defer.resolve('success');
                }
            }else{
                defer.reject('代理服务器错误');
            }
        })
        return defer.promise;
    }).then(function(success){

        request(options,function(error,response,body) {
           // console.log(error)
            if (!error && response.statusCode == 200) {
                callback(null, body, response);
            }else{
                callback(error, null, null);
            }
        })
    },function(rejected){
        callback(rejected, null, null);
    })
}

var getRealUrl = function (item_id, store) {
    if(store == 'tmall'){
        return 'https://detail.tmall.com/item.htm?id='+item_id;
    }else{
        return 'https://item.taobao.com/item.htm?id='+item_id;
    }
}

function Get_xsign(data, xuid, t, utdid, appKey, lat, lng, api, v, sid, ttid, deviceId, features ,call) {
    var param = [];
    param.push("data="+encodeURIComponent(data));
    param.push("xuid="+xuid);
    param.push("t="+t);
    param.push("utdid="+utdid);
    param.push("appKey="+appKey);
    param.push("lat="+lat);
    param.push("lng="+lng);
    param.push("api="+api);
    param.push("v="+v);
    param.push("sid="+sid);
    param.push("ttid="+ttid);
    param.push("deviceId="+deviceId);
    param.push("features="+features);
    request('http://121.41.100.41:7891/?'+param.join("&"), function (error, response, body) {
      // console.log('error:', error); // Print the error if one occurred
      // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      // console.log('body:', body); // Print the HTML for the Google homepage.
      var arr = JSON.parse(body);
      //console.log("sign:"+arr.sign)
      call(arr.sign,arr.time)
    });
    // body...

}


