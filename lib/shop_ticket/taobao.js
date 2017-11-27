var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var fs = require('fs');
var runList = require('./runList.js');
var proxyRequest = require('../proxyRequest2');

exports.getInfo = function(urlstr,  itemId, callback) {

    var urlInfo = url.parse(urlstr, true);
    var taobaoReg = /(taobao|tmall)\.com/ig;

    if (taobaoReg.exec(urlstr)) {
        getItemInfo(urlstr, itemId, callback);
    } else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}

function getItemInfo(urlstr, itemId, callback){
    Q('uid').then(function () {
        var defer = Q.defer();

        request({url: urlstr}, function (err, body) {
            if(err){
                defer.reject(err);
            }else{
                defer.resolve(body);
            }
        })
        
        return defer.promise;
    }).then(function (body) {
        var defer = Q.defer();

        var  exp1 = /<meta[^>]*content=\"[^>]*shopId=(\d*)[^>]*userId=(\d*).*?\"/ig;
        var  res1 = exp1.exec(body);
        if(res1){
            var  userId = res1[2];
            var  shopId = res1[1];

            runList(userId, 2, function (ret, err) {
                if(err){
                    defer.reject(err);
                    return ;
                }

                var itemInfo = {
                    ShopId:  shopId,
                    UserId:  userId,
                    IsAlimama : false,
                    Status: false,
                    Coupon: {
                        List: [],
                    }
                };

                var data = ret.data;
                // callback(ret);
                // return ;
                data.coupons.forEach(function (coupons) {
                    if('couponList' in coupons){
                        txtAmount = /订单金额满(\d*)元可使用/
                        txtDate = /有效期([\d\.]*)-([\d\.]*)/


                        if(coupons.title == '店铺优惠券') {
                            coupons.couponList.forEach(function (coupon) {
                                try {
                                    fulfilAmount = txtAmount.exec(coupon.subtitles[0])[1];

                                    Dates = txtDate.exec(coupon.subtitles[1]);
                                    startTime = Dates[1].replace(/\./g, '-')+' 00:00:00';
                                    endTime = Dates[2].replace(/\./g, '-')+' 23:59:59';

                                    item = {
                                        Id : coupon.uuid,
                                        Amount : [coupon.title, fulfilAmount],
                                        Date: [startTime, endTime],
                                        Category : 'normal'
                                    };

                                    itemInfo.Coupon.List.push(item)
                                } catch (exception){
                                    console.log(exception)
                                }
                            })
                        }
                    }
                })


                if(itemInfo.Coupon.List.length > 0) {
                    itemInfo.Status = true;
                }
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))

                defer.resolve(itemInfo);
            });

        }else{
            defer.reject('host not found');
        }

        return defer.promise;
    },function (err) {
        callback({
            "Errors":{'Code': 'Error', "Message": err}
        })
    }).then(function (itemInfo) {
        // callback(null, itemInfo);
        // return;
        isAlimama(itemInfo, itemId, callback)
    },function (err) {
        callback({
            "Errors":{'Code': 'Error', "Message": err}
        })
    })

}

function isAlimama(itemInfo, itemId, callback) {
    if(itemInfo.Status) {
        var activityId = itemInfo.Coupon.List[0].Id;

        var url = 'https://uland.taobao.com/cp/coupon?activityId='+activityId+'&itemId='+itemId;
        request({url: url}, function (err, body) {
            if(err){
                callback({
                    "Errors":{'Code': 'Error', "Message": err}
                })
                return false;
            }

            body = JSON.parse(body);
            if(body.success){
                if(body.result.item.clickUrl != ''){
                    itemInfo.IsAlimama = true;
                }
            }

            callback(null, itemInfo);
            return;
        })
    }else{
        callback(null, itemInfo);
        return;
    }
}

/*
 *获取html
 **/
var maxRequestNum = 2;
var requestNum = 0;
function request(options, callback){
    options.headers = {};
    options.headers['refer'] = 'https://auxdq.m.tmall.com/shop/shop_auction_search.htm?spm=a320p.7692171.0.0&suid=1035757927&sort=d';
    options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    options.headers['Accept-Encoding'] = "deflate, sdch";
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8";
    options.headers['Cookie'] = "cna=fR+hDeeT50ICATr3cloaZbmD; miid=6345998908287345826; x=e%3D1%26p%3D*%26s%3D0%26c%3D0%26f%3D0%26g%3D0%26t%3D0%26__ll%3D-1%26_ato%3D0; lzstat_uv=8629291913329613887|2144678; tracknick=hxl724753832; _cc_=VT5L2FSpdA%3D%3D; tg=0; thw=cn; v=0; cookie2=1c7bbf9e1215cb87b08ec21f399c6498; t=17cb7c33aba0dc662a5d8eb53fdf6401; uc1=cookie14=UoWxMPWZEssQOQ%3D%3D; _tb_token_=qJoDmUMIJFXz9c3; mt=ci%3D-1_0; l=Ajg4Vmc1KX4VL9QVWo/j-16oiOjKoZwr";

    proxyRequest(options,function(error,response,body) {
        if (!error) {
            callback(null, body, response);
        }else{
            callback(error, null, null);
        }
    })
}
