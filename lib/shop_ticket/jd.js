var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var fs = require('fs');
var proxyRequest = require('../proxyRequest2');

exports.getInfo = function(urlstr,  itemId, callback) {
    var urlInfo = url.parse(urlstr, true);
    if (/(jd)\.com/.exec(urlInfo.host) && itemId) {
        getItemInfo(urlstr, itemId, callback);
    } else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not jd hostname or miss itemId '
            }
        });
    }
}

function getItemInfo(urlstr, itemId, callback){
    request({
        url : 'https://item.m.jd.com/coupon/coupon.json',
        method : 'POST',
        form: {wareId: itemId}
    }, function (err, response, body) {
        if (err) {
            callback(err);
            return;
        }

        var itemInfo = {
            ShopId:  null,
            UserId:  null,
            IsAlimama : false,
            Status: false,
            Coupon: {
                List: [],
            }
        };

        var couponData = JSON.parse(body);
        if ('coupon' in couponData) {
            try {
                couponData.coupon.forEach(function (row) {
                    if (row.couponKind == 3 || row.couponKind == 2) { //店铺券
                        startTime = row.beginTime.replace(/\./g, '-')+' 00:00:00';
                        endTime = row.endTime.replace(/\./g, '-')+' 00:00:00';

                        item = {
                            Id : row.encryptedKey ,
                            RoleId : row.roleId,
                            Amount : [row.discount, row.quota],
                            Date: [startTime, endTime],
                            Category : 'normal'
                        };

                        itemInfo.Coupon.List.push(item)
                    }
                })
            }catch (exception){
                console.log(exception)
            }
        }

        if(itemInfo.Coupon.List.length > 0) {
            itemInfo.Status = true;
        }
        itemInfo.Md5 = md5(JSON.stringify(itemInfo))
        callback(null, itemInfo);
        return;
    })
}

function request(options, callback){
    options.headers = {};
    options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    options.headers['Accept-Encoding'] = "deflate, sdch";
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8";
    options.headers['Cookie'] = "cna=fR+hDeeT50ICATr3cloaZbmD; miid=6345998908287345826; x=e%3D1%26p%3D*%26s%3D0%26c%3D0%26f%3D0%26g%3D0%26t%3D0%26__ll%3D-1%26_ato%3D0; lzstat_uv=8629291913329613887|2144678; tracknick=hxl724753832; _cc_=VT5L2FSpdA%3D%3D; tg=0; thw=cn; v=0; cookie2=1c7bbf9e1215cb87b08ec21f399c6498; t=17cb7c33aba0dc662a5d8eb53fdf6401; uc1=cookie14=UoWxMPWZEssQOQ%3D%3D; _tb_token_=qJoDmUMIJFXz9c3; mt=ci%3D-1_0; l=Ajg4Vmc1KX4VL9QVWo/j-16oiOjKoZwr";

    proxyRequest(options, function(error, response, body) {
        if (!error) {
            callback(null, response, body);
        }else{
            callback(error, null, null);
        }
    })
}
