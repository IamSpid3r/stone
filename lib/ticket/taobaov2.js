const request = require('request');
const md5 = require('md5');
const stringRandom = require('string-random');
const url = require('url');
const fun = require(process.cwd()+"/apps/lib/fun.js");
const NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : ''
const tablestoreTicket = require(process.cwd()+'/apps/lib//tablestoreTicket.js').tableStore;
const proxyRequest2 = require(process.cwd()+'/lib/proxyRequest').proxyRequest;
const taobaoToken = require(process.cwd() + '/tools/taobaoToken/runList.js');

//unb=336134075 munb=336134075
var xuid = "";
//cookie2=
var sid = "";

exports.getInfo = function (activityId, itemId, sellerId, key, callback) {
    if (activityId || key) {
        getItemInfo(activityId, itemId, sellerId, key, callback);
    } else {
        callback({
            "Errors": {
                'Code': 'Fatal',
                "Message": 'miss activityId or key'
            }
        });
    }
}



function getItemInfo(activityId, itemId, sellerId, key, callback) {
    //新的办法

    var api = 'mtop.alimama.union.hsf.coupon.get';
    var version = '1.0';
    if (activityId && itemId) {
        var data = {"itemId": itemId, "activityId": activityId, "pid": "X"};
    } else if (key) {
        var data = {"e": key, "pid": "mm_33231688_7050284_23466709"}
    } else if (activityId && sellerId) {
        return getItemInfoAll(activityId, sellerId, callback);
    } else {
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Too less params'
            }
        });
    }
    var params = {
        "api": api,
        'v': version,
        'jsv': '2.4.0',
        "AntiCreep": true,
        "AntiFlood": true,
        "data": data
    };
    var cookiePath = 'taobaoLogin2.txt';
    taobaoToken(params, cookiePath, function (body, err) {
        if (err) {
            return callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err.message
                }
            });
        }
        var data = body.data;
        var itemInfo = {
            Status: false,
            IsAlimama: false,
            Coupon: {
                List: [],
            },
            Info: JSON.stringify(body)
        };

        if (data.result.item.clickUrl) {   //粉丝福利购请求ok
            result = data.result;

            if (result.retStatus == 0 || result.retStatus == 13 || result.retStatus == 5) {
                coupon = {
                    Id: key ? key : activityId,
                    Amount: [result.amount, result.startFee],
                    Date: [result.effectiveStartTime, result.effectiveEndTime],
                    Category: key ? 'key' : 'normal'
                };
                itemInfo.Status = true;
                itemInfo.Coupon.List.push(coupon);
            } else {
                itemInfo.Status = false;
            }
            itemInfo.IsAlimama = true;
            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            return callback(null, itemInfo);
        } else {
            if (activityId && sellerId) { //普通优惠券地址
                return getItemInfoAll(activityId, sellerId, callback);
            } else {
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                return callback(null, itemInfo);
            }
        }
    })
}

//获取所有包含activityid的优惠券信息
async function getItemInfoAll(activityId, sellerId, callback) {
    var deviceId = stringRandom(44);
    var utdid = stringRandom(24);
    var appKey = "21646297";
    var lat = "30.91966";
    var lng ="121.614151";
    var ttid = "219201@taobao_android_7.6.0";
    var features = "27";
    var v = "3.0";
    var api = "mtop.taobao.couponmtopreadservice.findshopbonusactivitys";
    var t = Date.parse(new Date())/1000;

    var data_obj = {"uuid":activityId,sellerId: sellerId,"queryShop":true,"originalSellerId":"","marketPlace":""};
    var data = JSON.stringify(data_obj);

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
    param.push("shsid=1");

    //getsign
    try {
        let signArr = await getSign(param);
        let sign = signArr.sign;
        let signTime = signArr.time;
        let xuid = signArr.xuid;
        let sid = signArr.sid;

        //request
        var url = "http://guide-acs.m.taobao.com/gw/"+api+"/" + v + "/?data="+encodeURIComponent(data);
        var headers = {
            'x-appkey': appKey,
            'x-t':signTime,
            'x-pv':"5.2",
            "x-sign":sign,
            "x-features":features,
            "x-location":lng+"%2C"+lat,
            "x-ttid":ttid,
            "x-utdid":utdid,
            "x-devid":deviceId,
            "x-uid":xuid,
            "x-sid":sid
        };
        let apiData = await getApiData(url, headers, data);
        if (apiData.ret[0].indexOf('SUCCESS') == -1) {
            console.log('error2:', apiData.ret[0])
            return callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": apiData.ret[0]
                }
            });
        }

        //return itemInfo;
        var itemInfo = {
            Status: false,
            IsAlimama: false,
            Coupon: {
                List: [],
            },
            Info: JSON.stringify(apiData)
        };
        if (!('module' in apiData.data)) {
            itemInfo.Status = false;
        } else {
            let result = apiData.data.module[0];
            if (result.status == 1) {
                let startTime = (new Date(result.startTime)).getTime(),
                    endTime = (new Date(result.endTime)).getTime(),
                    now =  (new Date()).getTime();

                if (now>=startTime && now<=endTime) {
                    let coupon = {
                        Id:  activityId,
                        Amount: [result.discount/ 100, result.startFee / 100],
                        Date: [result.startTime, result.endTime],
                        Category: 'normal'
                    };
                    itemInfo.Status = true;
                    itemInfo.Coupon.List.push(coupon);
                }
            }
        }
        itemInfo.Md5 = md5(JSON.stringify(itemInfo))

        return callback(null, itemInfo);
    } catch (e) {
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": e.message
            }
        });
    }
}

//获取签名信息
function getSign(param) {
    return new Promise((resolve, reject) => {
        var maxRequestNum = 3;
        var currentRequest = 0;
        var rq = function () {
            console.log('getSign rq')
            request('http://van.shihuo.cn:7891/?'+param.join("&"), function (error, response, body) {
                if (error){
                    console.log('error:', error); // Print the error if one occurred

                    currentRequest++;
                    if (currentRequest < maxRequestNum) {
                        return rq();
                    } else {
                        return reject(error);
                    }
                }
                if (!fun.isJson(body)) {
                    currentRequest++;
                    if (currentRequest < maxRequestNum) {
                        return rq();
                     } else {
                        return reject(new Error('not a json'));
                    }
                }

                let arr = JSON.parse(body);
                return resolve(arr);
            });
        }

        //rq
        rq();
    })
}

//获取接口数据
function getApiData(url, headers, data) {
    return new Promise((resolve, reject) => {
        var maxRequestNum = 3;
        var currentRequest = 0;
        var rq = function () {
            console.log('getApiData rq')
            proxyRequest({
                method: 'get', url: url, headers: headers, form:{data:data}
            }, function (error, response, body) {
                if (error){
                    console.log('error:', error); // Print the error if one occurred

                    currentRequest++;
                    if (currentRequest < maxRequestNum) {
                        return rq();
                    } else {
                        return reject(error);
                    }
                }
                if (!fun.isJson(body)) {
                    currentRequest++;
                    if (currentRequest < maxRequestNum) {
                        return rq();
                    } else {
                        return reject(new Error('not a json'));
                    }
                }

                let arr = JSON.parse(body);
                return resolve(arr);
            });
        }
        //rq
        rq();
    })
}

/*
 *获取html
 **/
var maxRequestNum = 2;
var requestNum = 0;
function proxyRequest(options, callback) {
    if (!('headers' in options)) {
        options.headers = {};
        options.headers['refer'] = 'https://auxdq.m.tmall.com/shop/shop_auction_search.htm?spm=a320p.7692171.0.0&suid=1035757927&sort=d';
        options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
        options.headers['Accept-Encoding'] = "deflate, sdch";
        options.headers['Accept-Language'] = "zh-CN,zh;q=0.8";
        options.headers['Cookie'] = "cna=fR+hDeeT50ICATr3cloaZbmD; miid=6345998908287345826; x=e%3D1%26p%3D*%26s%3D0%26c%3D0%26f%3D0%26g%3D0%26t%3D0%26__ll%3D-1%26_ato%3D0; lzstat_uv=8629291913329613887|2144678; tracknick=hxl724753832; _cc_=VT5L2FSpdA%3D%3D; tg=0; thw=cn; v=0; cookie2=1c7bbf9e1215cb87b08ec21f399c6498; t=17cb7c33aba0dc662a5d8eb53fdf6401; uc1=cookie14=UoWxMPWZEssQOQ%3D%3D; _tb_token_=qJoDmUMIJFXz9c3; mt=ci%3D-1_0; l=Ajg4Vmc1KX4VL9QVWo/j-16oiOjKoZwr";
    }
    options.timeout = 5000;

    proxyRequest2(options, function (error, response, body) {
        callback(error, response, body);
    })
}