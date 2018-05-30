var request = require('request');
var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
const fun = require(process.cwd()+"/apps/lib/fun.js");
var eventproxy = require('eventproxy')
var fs = require('fs');
var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : ''
var tablestoreTicket = require(process.cwd()+'/apps/lib//tablestoreTicket.js').tableStore;
var taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');
var cookiePath = [
    'taobaoCookieShihuo.txt',
    'taobaoCookiePaobu.txt',
    'taobaoCookieKaluli.txt'
];
var cookiePathStatus = {};
exports.getInfo = function(urlStr, shopId, callback) {
    var urlInfo = url.parse(urlStr, true);
    if (urlInfo.query.id) {
        getItemInfo(urlInfo, shopId, callback);
    } else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}

function getItemInfo(urlInfo, shopId,  callback){
    (async () => {
        try {
            //有店铺看是否有优惠券
            if (shopId) {
                var ticket = await getTableTicket(shopId);
                if (ticket) {
                    return callback(null, JSON.parse(ticket));
                }
            }
            //抓取优惠券
            var api = 'mtop.tmall.detail.couponpage';
            var version = '1.0';
            var params = {
                "api" : api,
                'v' : version,
                'jsv' : '2.4.8',
                "ecode" : 0,
                "ttid" : "tmalldetail",
                "data" :{"itemId": Number(urlInfo.query.id),"source":"tmallH5"},
            };
            var cookiePath = getCookirPath();
            if (!cookiePath) {
                fun.stoneLog('merchant_ticket', 'error', {
                    "param": 'miss cookiePath',
                })
               return callback('miss cookiePath');
            }
            console.log(cookiePath)
            taobaoToken(params , cookiePath, function (body, err) {
                if(err){
                    if ('抓取服务器错误' == err) {
                        fun.stoneLog('merchant_ticket', 'error', {
                            "param": '抓取服务器错误',
                        })
                        cookiePathStatus[cookiePath] = {};
                        cookiePathStatus[cookiePath].time = Date.now();
                    }
                    return callback(err);
                }
                //return {err:null, ticket:body};

                var itemInfo = {
                    Status: false,
                    Coupon: {
                        List: [],
                    }
                };
                var coupons  = body.data.coupons;
                coupons.forEach(function (coupon) {
                    if(coupon.arg1 == 'CategoryCoupon'){
                        coupon.couponList.forEach(function (val) {
                            var textFee = /满(\d*)元/.exec(val.subtitles[0]);
                            var textDate = /有效期：([\d-]*)至([\d-]*)/.exec(val.subtitles[1]);
                            if(textFee && textDate){
                                startFee = textFee[1];
                                startTime = textDate[1]+' 00:00:00';
                                endTime = textDate[2]+' 23:59:59';

                                item = {
                                    Id : md5(val.uuid),
                                    Amount : [val.title, startFee],
                                    Date: [startTime, endTime],
                                    Category : 'none',
                                    Args : {
                                        ApplyText: val.applyText,
                                        Subtitles: val.subtitles,
                                    },
                                    Type : 'category'
                                };

                                itemInfo.Coupon.List.push(item)
                            }
                        })
                    }

                    // if(coupon.arg1 == 'TmallGuaguaka'){
                    //     coupon.couponList.forEach(function (val) {
                    //         var applyText = val.applyText.replace('%d', val.pointConsume).replace('\n','');
                    //         item = {
                    //             Id : md5(applyText),
                    //             Amount : [ ],
                    //             Date: [],
                    //             Category : 'none',
                    //             Args : {
                    //                 ApplyText: applyText,
                    //                 Subtitles: val.subtitles,
                    //             },
                    //             Type : 'guaguaka'
                    //         };
                    //
                    //         itemInfo.Coupon.List.push(item)
                    //     })
                    // }

                    if(coupon.arg1 == 'ShopCoupon'){
                        coupon.couponList.forEach(function (val) {
                            var discountReg = /满(\d*)使用/.exec(val.subtitles[0]);
                            var dateReg = /有效期 ([\.\d]*)-([\.\d]*)/.exec(val.subtitles[1]);

                            if(discountReg && dateReg){
                                discount = discountReg[1];
                                startTime = dateReg[1].replace(/\./g, '-')+" 00:00:00";
                                endTime = dateReg[2].replace(/\./g, '-')+" 23:59:59";

                                item = {
                                    Id : val.uuid,
                                    Amount : [val.title, discount],
                                    Date: [startTime, endTime],
                                    Category : 'normal',
                                    Args : {
                                        ApplyText:val.applyText,
                                        Subtitles: val.subtitles,
                                    },
                                    Type : 'item'
                                };

                                itemInfo.Coupon.List.push(item)
                            }
                        })
                    }
                })

                //cookiepath
                if (cookiePathStatus.hasOwnProperty(cookiePath)) {
                    delete cookiePathStatus[cookiePath];
                }
                if(itemInfo.Coupon.List.length > 0) {
                    itemInfo.Status = true;
                }
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                //写入tablestore
                if (shopId) {
                    saveTableTicket(shopId, [{'ticket': JSON.stringify(itemInfo)}]);
                }
                return callback(null, itemInfo);
            })
        } catch (err) {
            fun.stoneLog('merchant_ticket', 'error', {
                "param": typeof err == 'object' ? err.message : err,
            })

            return callback(typeof err == 'object' ? err.message : err);
        }
    })();
}


//获取cookie路径
function getCookirPath() {
    var cuerrentPath = '';
    tmpCookiePath = _.shuffle(cookiePath);

    for (var i=0; i<tmpCookiePath.length; i++) {
        tmpPath = tmpCookiePath[i];
        if (!cookiePathStatus.hasOwnProperty(tmpPath)) {
            cuerrentPath = tmpPath;
            break;
        }
        console.log(Date.now(), cookiePathStatus[tmpPath].time, tmpPath);
        if (cookiePathStatus.hasOwnProperty(tmpPath) && Date.now() - cookiePathStatus[tmpPath].time  > (5*60*1000)) {
            cuerrentPath = tmpPath;
            break;
        }
    }

    return cuerrentPath;
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
                reject(err) ;
            } else {
                var ticket = '';
                var fiveHour = 5*60*60*1000;
                if (body.hasOwnProperty('attributes')) {
                    for(var i=0; i<body.attributes.length; i++) {
                        if (body.attributes[i].columnName == 'ticket') {
                            time = (body.attributes[i].timestamp.toString(10));
                            //更新不足五小时立即返回
                            if (Date.now() - time < fiveHour) {
                                ticket = body.attributes[i].columnValue;
                                break;
                            }
                        }
                    }
                }
                resolve(ticket);
            }
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
