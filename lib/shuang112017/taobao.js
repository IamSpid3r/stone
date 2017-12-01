var request = require('request');
var _ = require('lodash');
var url = require('url');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');
var proxyRequest = require('../proxyRequest2');
var md5 = require('md5');
exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);
    if (urlInfo.host == 'item.taobao.com' && urlInfo.pathname == '/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else if (urlInfo.host == 'detail.tmall.com' &&  urlInfo.pathname == '/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else if (urlInfo.host == 'detail.tmall.hk' &&  urlInfo.pathname == '/hk/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    }else {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
        return ;
    }
}

function getItemInfo(urlInfo, callback) {
    var api = 'mtop.taobao.detail.getdetail';
    var version = '6.0';
    var params = {
        "api" : api,
        'v' : version,
        "ecode" : 0,
        "ttid" : "2016@taobao_h5_2.0.0",
        "data" : {"itemNumId" : urlInfo.query.id},
    };

    var cookiePath = 'cookieV3.txt';
    taobaoToken(params , cookiePath, function (body, err) {
        if (err) {
            callback(err)
            return;
        }
        responseFirstJson = body;
        // callback(null, body);
        // return;

        var itemInfo = {
            Unique: 'cn.taobao.' + urlInfo.query.id,
            Status: false,
            Coupon: {
                List: []
            },
            Price : null,
            DepositPrice: [],
        };
        if ('trade' in responseFirstJson.data && 'redirectUrl' in responseFirstJson.data.trade) {
            callback(null, itemInfo);
            return;
        }
        if (responseFirstJson.data.seller.sellerType == 'B') {
            var store = '天猫';
        } else {
            var store = '淘宝';
        }

        var apiStackValue = JSON.parse(responseFirstJson.data.apiStack[0].value);
        // callback(null, apiStackValue);
        // return;
        if (store == '淘宝') {
            if ('resource' in apiStackValue && 'shopProm' in apiStackValue.resource) {
                var jianianhuaReg = /12\/12-12\/12每满(.*)减(.*),上不封顶/;

                // var ishashongbao = false;
                // if ('coupon' in apiStackValue.resource) {
                //     apiStackValue.resource.coupon.couponList.forEach(function (val) {
                //         ishashongbao = val.title;
                //         return;
                //     })
                // }
                apiStackValue.resource.shopProm.forEach(function (row) {
                    if (row.iconText == '跨店满减') {
                        result = jianianhuaReg.exec(row.content[0]);
                        if (result){
                            item = {
                                Id : md5(row.content[0]),
                                Amount : [result[2], result[1]],
                                Date: ['2017-12-12 00:00:00', '2017-12-12 23:59:59'],
                                Category : 'none',
                                Args : {
                                    ApplyText: '此商品将参加淘宝1212，快加购',
                                    Subtitles: [
                                        row.content[0],
                                        //ishashongbao ? ishashongbao : ''
                                    ],
                                },
                                Type : 'jianianhua'
                            };

                            itemInfo.Coupon.List.push(item);
                            itemInfo.Status = true;
                        }
                        return;
                    }
                })
            }

            //双11价格
            var s11Price = null;
            if ('extraPrices' in apiStackValue.price) {
                apiStackValue.price.extraPrices.forEach(function (val) {
                    if (val.priceTitle == '1212价') {
                        s11Price = val.priceText;
                        return;
                    }
                })
            }
            itemInfo.Price = s11Price;

            //定金
            if ('depositPrice' in apiStackValue.price) {
                var depositPriceReg = /定金￥(\d*)，可抵￥(\d*)/;
                result = depositPriceReg.exec(apiStackValue.price.depositPrice.priceDesc)
                if (result){
                    itemInfo.DepositPrice = [result[1], result[2]];
                }
            }

            callback(null, itemInfo);
            return;
        } else {
            if ('resource' in apiStackValue
                && 'coupon' in apiStackValue.resource
                && 'couponList' in apiStackValue.resource.coupon
            ) {
                var jintieReg = /11\.11当天每满(.*)减(.*),可跨店/;

                apiStackValue.resource.coupon.couponList.forEach(function (row) {
                    result = jintieReg.exec(row.title);
                    if (result){
                        item = {
                            Id : md5(row.title),
                            Amount : [result[2], result[1]],
                            Date: ['2017-11-11 00:00:00', '2017-11-11 23:59:59'],
                            Category : 'none',
                            Args : {
                                ApplyText: '双11购物津贴',
                                Subtitles: [
                                    row.title
                                ],
                            },
                            Type : 'jintie'
                        };

                        itemInfo.Coupon.List.push(item);
                        itemInfo.Status = true;
                    }
                    return;
                })
            }

            //双11价格
            var s11Price = null;
            if ('extraPrices' in apiStackValue.price) {
                apiStackValue.price.extraPrices.forEach(function (val) {
                    if (val.priceTitle == '1212价') {
                        s11Price = val.priceText;
                        return;
                    }
                })
            }
            itemInfo.Price = s11Price;

            //定金
            if ('depositPrice' in apiStackValue.price) {
                var depositPriceReg = /定金￥(\d*)，可抵￥(\d*)/;
                result = depositPriceReg.exec(apiStackValue.price.depositPrice.priceDesc)
                if (result){
                    itemInfo.DepositPrice = [result[1], result[2]];
                }
            }

            callback(null, itemInfo);
            return;
        }
    })
}

/*
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        headers: {
            'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache",
            'cookie':'cna=wUEmEDfrSXICAXTpm2vXEC1F; OZ_1U_1761=vid=v7de9ef0516c43.0&ctime=1474207521&ltime=1474207510; _m_user_unitinfo_=unit|unsz; _m_h5_tk=98be544d5acf014a07efab3faaf4f8fe_1477974426277; _m_h5_tk_enc=c6453c0b64e0797fb4f3211f004d1553; cookie1=BxuXsvQYNBRkeKpwXKczWSkrGNNnzIrQu7EEuyjbinE%3D; unb=761008464; skt=b4b211745fdcff77; _l_g_=Ug%3D%3D; _nk_=hxl724753832; cookie17=VAcPTBfHdD5t; uc1=cookie15=U%2BGCWk%2F75gdr5Q%3D%3D&existShop=false; login=true; _m_unitapi_v_=1477903139376; uss=BdLVZ962l1%2FM6X1lh7dNg%2B6X7916qolA0bHT0jbR7ptnL%2B750Y5QHMwP0A%3D%3D; hng=CN%7Czh-cn%7CCNY; uc3=nk2=CzU40LsQJv8VSkPW&id2=VAcPTBfHdD5t&vt3=F8dARHKvyrBOd56KP2o%3D&lg2=Vq8l%2BKCLz3%2F65A%3D%3D; lgc=hxl724753832; tracknick=hxl724753832; cookie2=3cdeec1bf34c3e21ab6919aac18e2f81; t=a4508d1c5e995d36c219759503a616f2; _tb_token_=ps8na8eJLaLz; ucn=unsz; l=AlFRjWNYA/QHnpQeORNl0KsQ4UbrvsUw; isg=Ary8y8VFyFee0_Oz5lfdmnlQjVw4OGDfLzPuJpY9yKeKYVzrvsUwbzLTMzPm',
        },
        // proxy: 'http://172.16.13.177:8888',
        encoding: null
    }, function(error, response, body) {
        callback(body, error);
    })
}
