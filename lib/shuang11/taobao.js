var request = require('request');
var _ = require('lodash');
var url = require('url');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');

var proxyRequest = require('../proxyRequest').proxyRequest;

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
    getHtml('https://detail.tmall.com/item.htm?id=' + urlInfo.query.id , function(body ,err){
        if(err){
            callback(err);
            return ;
        }

        var itemInfo = {
            Status: false,
            UniqueId:  urlInfo.query.id,
            ItemAttributes: {
                Price: null
            }
        };

        var body = iconv.decode(body, 'GBK');
        var patt = /(_DATA_Mdskip = [\s|\S]*?)\<\/script\>/
        result = patt.exec(body);
        if(result){
            try {
                eval(result[1]);
            } catch (exception) {
                callback('eval error');
                return ;
            }

            var data = _DATA_Mdskip;
            if(typeof data.defaultModel.itemPriceResultDO.priceInfo != 'undefined'){
                priceInfo =  data.defaultModel.itemPriceResultDO.priceInfo;
                _(priceInfo).forEach(function (priceDetail) {
                    if(typeof priceDetail.suggestivePromotionList != 'undefined'
                        && priceDetail.suggestivePromotionList.length > 0
                    ){
                        priceDetail.suggestivePromotionList.forEach(function(suggestPrice){
                            if(suggestPrice.type == '双11全球狂欢节'){
                                itemInfo.Status = true,
                                    itemInfo.ItemAttributes.Price = suggestPrice.price;
                            }
                        })
                    }
                    return ;
                })
            }

            callback(null, itemInfo);
            return;
        }else{
            callback('not found "_DATA_Mdskip"');
            return ;
        }
    });
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
    }, function(error, response, body, callbackStatus) {
        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        }else{
            console.log(error)
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
