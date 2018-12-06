var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');
var fun = require('./fun.js');


exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host.indexOf('du') != -1){
            var id = urlInfo.query.id;
        }else{
            throw new Error();
        }


        //请求api
        var apiUrl = 'https://m.poizon.com/product/skuDetail?id='+id;
        getHtml(apiUrl, function(body, err){
            if(err){
                callback({
                    "Errors":{'Code': 'error', "Message": err}
                });
                return '';
            }

            //回调
            if(body && body.status == 200){
                getItemInfo({id:id, body:body, url:urlStr} , callback);
            }else{
                callback({
                    "Errors":{'Code': 'Error', "Message": "Body data error"}
                });
                return ;
            }
        })
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error '+exception
            }
        });
        return '';
    }

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var id = params.id;
    var body = params.body;
    var urlStr = params.url;

    var Data = body.data.Data;

    var itemInfo = {
        Unique: 'cn.du.' + id,
        Md5: '',
        Status: Data.Status == 'inStock' ? 'inStock' : 'outOfStock',
        Url: urlStr,
        ItemAttributes: {
            Title: Data.ItemAttributes.Title,
            ShopName: '毒',
            ShopId: 'cn.du',
            ImageUrl: Data.ItemAttributes.ImageUrl,
            ImageUrls: Data.ItemAttributes.ImageUrls,
            OfficialPrice: Data.ItemAttributes.OfficialPrice
        },
        Variations: Data.Variations,
        Items: Data.Items,
        Coupon: Data.Coupon
    };

    var n = j = i = h = f = 0;
    var type = {'color':1, 'size': 2};                  //类型对应id
    var color = {
        "Id": 1 ,
        "Name":"颜色",
        "Values":[]
    };
    var size = {
        "Id": 2 ,
        "Name":"尺码",
        "Values":[]
    };

    if(itemInfo.Items.length <= 0){
        itemInfo.Status = 'outOfStock';
    }

    //优惠券
    /*
    * 满600减30. http://du.hupu.com/mdu/activity/shcoupon.html?couponId=225
满1000减60. http://du.hupu.com/mdu/activity/shcoupon.html?couponId=226
满1500减100  http://du.hupu.com/mdu/activity/shcoupon.html?couponId=227
满2300减160. http://du.hupu.com/mdu/activity/shcoupon.html?couponId=228
满3000减210 http://du.hupu.com/mdu/activity/shcoupon.html?couponId=229
    * */
    itemInfo.Md5 = md5(JSON.stringify(itemInfo))
    callback(null, itemInfo);
    return ;
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    request({url : urlStr, timeout: 5000},function(err,response,body){
        if (!err && response.statusCode == 200) {
            body = JSON.parse(body);
            callback(body);
        }else{
            callback(null ,err || 'get error');
        }
    })
}
