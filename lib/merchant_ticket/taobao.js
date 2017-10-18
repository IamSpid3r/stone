var request = require('request');
var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var fs = require('fs');
var taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);
    if (urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}

function getItemInfo(urlInfo, callback){
    var api = 'mtop.tmall.detail.couponpage';
    var version = '1.0';
    var params = {
        "api" : api,
        'v' : version,
        "ecode" : 0,
        "ttid" : "tmalldetail",
        "data" :{"itemId": Number(urlInfo.query.id),"source":"tmallH5"},
    };

    var cookiePath = 'taobaoLogin.txt';
    taobaoToken(params , cookiePath, function (body, err) {
        if(err){
            callback(err);
            return;
        }

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

            if(coupon.arg1 == 'TmallGuaguaka'){
                coupon.couponList.forEach(function (val) {
                    var applyText = val.applyText.replace('%d', val.pointConsume).replace('\n','');
                    item = {
                        Id : md5(applyText),
                        Amount : [ ],
                        Date: [],
                        Category : 'none',
                        Args : {
                            ApplyText: applyText,
                            Subtitles: val.subtitles,
                        },
                        Type : 'guaguaka'
                    };

                    itemInfo.Coupon.List.push(item)
                })
            }

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

        if(itemInfo.Coupon.List.length > 0) {
            itemInfo.Status = true;
        }
        itemInfo.Md5 = md5(JSON.stringify(itemInfo))

        callback(null, itemInfo);
        return ;
    })
}