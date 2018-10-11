var request = require('request');
var md5 = require('md5');
var url = require('url');
var stringRandom = require('string-random');

const fun = require(process.cwd()+"/apps/lib/fun.js");
const NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : ''
const tablestoreTicket = require(process.cwd()+'/apps/lib//tablestoreTicket.js').tableStore;
const taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');
const proxyRequest = require('../proxyRequest').proxyRequest;

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

exports.getInfo = function(urlStr, shopId, sellerId, callback) {
    var urlInfo = url.parse(urlStr, true);
    if (urlInfo.query.id) {
        getItemInfo(urlInfo, shopId, sellerId, callback);
    } else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}

function getItemInfo(urlInfo, shopId = '103498548', sellerId = '1664752604', callback){
    (async () => {
        try {
            if (shopId) {
                var result = await getTableTicket(shopId);
                var ticket = result.ticket;
                var ticketTimeout = result.timeout;

                //未超时的优惠券直接返回
                if (ticket && !ticketTimeout) {
                    return callback(null, JSON.parse(ticket));
                }
            }

            var shopIdreal = shopId.split('.')[2];
            var appKey = "21646297";
            var lat = "30.91966";
            var lng ="121.614151";
            var ttid = "219201@taobao_android_7.6.0";
            // var ttid = "10001401@taobao_android_8.0.0";
            var features = "27";
            var v = "1.0";
            var api = "mtop.taobao.shop.geb.coupon.get";
            var t = Date.parse(new Date())/1000;
            var data_obj = {"sellerId":sellerId,"shopId":shopIdreal};
            var data = JSON.stringify(data_obj);
            Get_xsign(data, xuid, t, utdid, appKey, lat, lng, api, v, sid, ttid, deviceId, features,async function (err, signParams){
                var xsign = signParams.sign, signTime = signParams.time;
                var url = "http://guide-acs.m.taobao.com/gw/"+api+"/" + v + "/?data="+encodeURIComponent(data);

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
                    "x-sid":sid
                };

                async function c(error, response, body) {
                    if (error) {
                        return callback(error.message);
                    }
                    if (response.statusCode != 200) {
                        return callback('statusCode is '+response.statusCode);
                    }

                    var info = JSON.parse(body);
                    if (info.ret[0].indexOf('SUCCESS') == -1) {
                        return callback(info.ret[0]);
                    }

                    var itemInfo = {
                        Status: false,
                        IsAlimama : false,
                        Coupon: {
                            List: [],
                        }
                    };

                    var coupons  = info.data.result;
                    coupons.forEach(function (val) {
                        var discountReg = /满(\d*)可使用/.exec(val.displayName);

                        discount = discountReg[1];
                        startTime = fun.dateformat(new Date(val.startTime), 'yyyy-MM-dd hh:mm:ss');
                        endTime = fun.dateformat(new Date(val.endTime), 'yyyy-MM-dd hh:mm:ss');

                        item = {
                            Id : val.uuid,
                            Amount : [val.money, discount],
                            Date: [startTime, endTime],
                            Category : 'normal',
                            Type : 'item'
                        };

                        itemInfo.Coupon.List.push(item)
                    })

                    if(itemInfo.Coupon.List.length > 0) {
                        itemInfo.Status = true;
                    }
                    //是否是阿里妈妈
                    if (itemInfo.Status) {
                        itemInfo.IsAlimama = await isAlimama(itemInfo.Coupon.List[0].Id, urlInfo.query.id);
                    }
                    itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                    //写入tablestore
                    if (shopId) {
                        saveTableTicket(shopId, [{'ticket': JSON.stringify(itemInfo)}]);
                    }
                    console.log(itemInfo.Coupon.List.length)

                    return callback(itemInfo);
                }

                request({
                    method: 'get',
                    url: url,
                    headers: headers,
                    form:{data:data}
                }, c);
            })

            function Get_xsign(data, xuid, t, utdid, appKey, lat, lng, api, v, sid, ttid, deviceId, features ,call) {
                var param = [];
                param.push("data="+encodeURIComponent(data));
               // console.log(md5(Buffer.from(data, 'utf8')))
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
                //console.log('http://121.41.100.41:7891/?'+param.join("&"));
                request('http://van.shihuo.cn:7891?'+param.join("&"), function (error, response, body) {
                   // console.log('error:', error); // Print the error if one occurred
                    //console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                    //console.log('body:', body); // Print the HTML for the Google homepage.
                   console.log(body, error, shopId, shopIdreal)
                    var arr = JSON.parse(body);
                    //console.log("sign:"+arr.sign)
                    return call(error, {
                        sign:arr.sign,time: arr.time
                    })
                });
            }
        }catch (err) {
            fun.stoneLog('merchant_ticket', 'error', {
                "param": typeof err == 'object' ? err.message : err,
            })

            if( typeof ticket != 'undefined'){
                console.log('timeout ticket')
                return callback(null, JSON.parse(ticket));
            } else {
                return callback(typeof err == 'object' ? err.message : err);
            }
        }
    })()
}



//获取tablestore中的店铺ticket
function getTableTicket(shopId) {
    return new Promise((resolve, reject) => {
        //线下数据防污染线上
        shopId = NODE_ENV != '' ? shopId+'_dev' : shopId;
        tablestoreTicket.Query(shopId,  function (err, body) {
            if (err) {
                fun.stoneLog('merchant_ticket', 'error', {
                    "param": err.message,
                    "param1": 'tablestore',
                })
                return reject(err) ;
            }

            var ticket = '';
            var isTimeout = false;
            var fiveHour = 5*60*60*1000;
            if (body.hasOwnProperty('attributes')) {
                for(var i=0; i<body.attributes.length; i++) {
                    if (body.attributes[i].columnName == 'ticket') {
                        let time = (body.attributes[i].timestamp.toString(10));
                        //更新不足五小时
                        if (Date.now() - time > fiveHour) {
                            isTimeout = true;
                        }
                        ticket = body.attributes[i].columnValue;
                        break;
                    }
                }
            }
            return resolve({
                timeout : isTimeout,
                ticket : ticket,
            });
        })
    })
}

//保存到tablestore
function saveTableTicket(shopId, attr) {
    //线下数据防污染线上
    shopId = NODE_ENV != '' ? shopId+'_dev' : shopId;
    tablestoreTicket.Update(shopId,  attr, function (err, body) {
        if (err) {
            fun.stoneLog('merchant_ticket', 'error', {
                "param": err.message,
                "param1": 'tablestore',
            })
        }
    })
}

function isAlimama(activityId, itemId) {
    return new Promise((resolve, reject) => {
        var api = 'mtop.alimama.union.hsf.coupon.get';
        var version = '1.0';
        var data = {"itemId": itemId, "activityId": activityId, "pid": "X"};
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
                resolve(false);
            } else {
                if(body && body.data.success && body.data.result.item.clickUrl != ''){
                    resolve(true);
                } else {
                    resolve(false)
                }
            }
        })
    })
}


