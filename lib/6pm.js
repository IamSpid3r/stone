var request = require('request');
var url  = require('url');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');
var fs = require('fs');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    (async () => {
        try {
            var urlInfo = url.parse(urlStr, true, true);
            if(urlInfo.host == 'www.6pm.com'){
                var body = await getHtml(urlStr);

                getItemInfo({res:body, url:urlStr}, callback);
            } else {
                throw new Error('Url error')
            }
        } catch (e) {
            return callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": e.message
                }
            });
        }
    }) ()
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    try {
        var pattern = /(__INITIAL_STATE__ = [^<]*?)\<\/script/;
        var match = pattern.exec(params.res);
        if (match) {
            eval(match[1]);
        } else {
           throw new Error('not found __INITIAL_STATE__');
        }
        var $ = cheerio.load(params.res);
        var product = __INITIAL_STATE__.product;

        var itemInfo = {
            Unique: '',
            Md5: '',
            Status: 'inStock',
            Url: params.url,
            ItemAttributes: {
                Title:  '',
                ShopName: "6pm",
                ShopId: "com.6pm",
                ImageUrl: ""
            },
            Variations: [],
            Items: []
        };

        if (!('detail' in product)) {
            itemInfo.Status = 'outOfStock';
            return callback(null, itemInfo);
        }
        
        itemInfo.Unique = 'com.6pm.' + product.detail.productId;
        itemInfo.ItemAttributes.Title = $('title').text();

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
        

        var isSize = false; //是否有尺寸参数
        var isWidth = false; //是否有宽度参数

        product.detail.styles.forEach(function (val) {
            if((colorIndex = _.findIndex(color.Values, {ValueId: val.colorId})) == -1){
                if (val.onSale) {
                    color.Values.push({
                        "ValueId":val.colorId,
                        "Name": val.color,
                        "ImageUrls": [
                            'https://www.6pm.com'+val.imageUrl
                        ]
                    })
                }

                colorIndex = color.Values.length - 1;
            }

            //在线的配色
            if (colorIndex > -1) {
                val.stocks.forEach(function (sizeVal) {
                    if((sizeIndex = _.findIndex(size.Values, {ValueId: sizeVal.sizeId})) == -1){
                        size.Values.push({
                            "ValueId":sizeVal.sizeId,
                            "Name": sizeVal.size,
                        })

                        sizeIndex = size.Values.length - 1;
                    }

                    var attr = [];
                    attr.push({
                        "Nid": color.Id,
                        "N":   color.Name,
                        "Vid": color.Values[colorIndex].ValueId,
                        "V":   color.Values[colorIndex].Name
                    });
                    attr.push({
                        "Nid": size.Id,
                        "N":   size.Name,
                        "Vid": size.Values[sizeIndex].ValueId,
                        "V":   size.Values[sizeIndex].Name
                    });

                    itemInfo.Items.push({
                        "Unique":"com.6pm."+sizeVal.stockId,
                        "Attr": attr,
                        "Offers": [{
                            "Merchant": {
                                "Name":"6pm"
                            },
                            "List":[
                                {
                                    "Price": _.trim(val.price, '$'),
                                    "Type": "USD"
                                }
                            ]
                        }]
                    })
                })
            }
        })


        if(color.Values.length > 0) itemInfo.Variations.push(color);
        if(size.Values.length > 0) itemInfo.Variations.push(size);
        if(color.Values.length > 0) itemInfo.ItemAttributes.ImageUrl = color.Values[0]['ImageUrls'][0]

        if (itemInfo.Items.length <= 0) {
            itemInfo.Status = 'outOfStock';
        }
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
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


function getHtml(urlStr) {
    let options = {
        url: urlStr,
        timeout: 6000,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache"
        }
    };
    return new Promise((resolve, reject) => {
        proxyRequest(options, function (err, response, body) {
            if (err) {
                reject(err);
            } else {
                resolve(body)
            }
        })
    })
}

