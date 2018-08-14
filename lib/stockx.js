const request = require('request');
const url  = require('url');
const querystring = require('querystring');
const cheerio = require('cheerio');
const md5 = require('md5');
const _ = require('lodash');
const eventproxy = require('eventproxy');
const fun = require('./fun');

const proxyRequest = require('./proxyRequestGuowai').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        //https://stockx.com/buy/air-jordan-1-retro-high-alternate-black-royal
        //https://stockx.com/air-jordan-11-retro-low-university-blue
        if(urlInfo.host.indexOf('stockx') != -1){
            return getItemInfo(urlStr, urlInfo, callback);
        } else {
            return  callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'Host Error'
                }
            });
        }
    } catch (exception) {
        return  callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error:'+exception.message
            }
        });
    }
}

/*
 *内容处理
 **/
function getItemInfo(urlStr, urlInfo,  callback) {
    var itemInfo = {
        Unique: '',
        Md5: '',
        Status: 'inStock',
        Url: urlStr,
        ItemAttributes: {
            Title: '',
            ShopName : 'stockx',
            ShopId: 'usa.stockx',
            ImageUrl: '',
        },
        Variations: [],
        Items: [],
        Coupon:[]
    };
    (async () => {
        try {
            let exp = /com\/buy\/(.*)/;
            if (urlStr.indexOf('buy') == -1) {
                exp = /com\/(.*)/;
            }
            //image-container 360全景图片的储存地方

            //https://stockx.com/buy/air-jordan-1-retro-high-alternate-black-royal
            var match = exp.exec(urlStr);
            var goodsName = match[1];
            var realPath = 'https://stockx.com/api/products/'+goodsName+'?includes=market,360';

            //当前页面的数据
            var body = await getHtml(realPath);
            //没有找到页面
            if (body.toString().indexOf('The requested product was not found') > -1) {
                itemInfo.Status = 'notFind';
                return callback(null, itemInfo);
            }

            var result = JSON.parse(body);
            var Product = result.Product;
            //return callback(null, allSkuResults);

            //配色
            var productId = md5(Product.id).substr(8, 16);
            itemInfo.Variations.push({
                Id :  1,
                Name : "颜色",
                Values : [
                    {
                        ValueId: productId,
                        Name:  Product.colorway + " ("+Product.styleId+")",
                        ImageUrls : [
                            Product.media.imageUrl
                        ]
                    }
                ]
            });
            //尺码
            itemInfo.Variations.push({
                Id :  2,
                Name : "尺码",
                Values : []
            })
            _(Product.children).forEach((row, key) => {
                let size = 'U.S '+ Product.gender+ ' '+row.shoeSize;
                let price = row.market.lowestAsk;
                let sizeId = md5(row.id).substr(8, 16);

                if (price > 0) {
                    itemInfo.Variations[1].Values.push( {
                        ValueId: sizeId,
                        Name:  size,
                    })

                    itemInfo.Items.push({
                        Unique: 'usa.stockx.' + sizeId,
                        Attr: [
                            {
                                'Nid': 1,
                                'N': '颜色',
                                'Vid': productId,
                                'V':  Product.colorway
                            },{
                                'Nid': 2,
                                'N': '尺码',
                                'Vid':  sizeId,
                                'V':  size
                            }
                        ],
                        Offers: [{
                            Merchant: {
                                Name: 'stockx',
                            },
                            List: [{
                                Price: price,
                                Type: 'USD'
                            }]
                        }]
                    })
                }
            })

            if (itemInfo.Items.length == 0) {
                itemInfo.Status = 'outOfStock';
                return callback(null, itemInfo);
            }
            //属性
            itemInfo.Unique = 'usa.stockx.' +md5(Product.id).substr(8, 16);
            //基本信息
            itemInfo.ItemAttributes.Title =  Product.title;
            itemInfo.ItemAttributes.ImageUrl = Product.media.imageUrl;
            itemInfo.ItemAttributes.Gender= Product.gender;

            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            return callback(null, itemInfo);
        } catch(e) {
            return  callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": e.message
                }
            });
        }
    })()
}


function getHtml(urlStrs) {
    return new Promise((resolve, reject) => {
        if (typeof urlStrs != 'object') {
            urlStrs = [urlStrs];
        }
        //wait all requests
        var ep = new eventproxy();
        ep.after('getHtml', urlStrs.length, function (body) {
            var contents = [];
            var isError = false;
            for (let i=0;i<body.length;i++) {
                if (body[i].err) {
                    isError = body[i].err;
                    break;
                } else {
                    contents.push(body[i].body)
                }
            }

            if (isError) {
                reject(isError);
            } else {
                resolve(contents);
            }
        })

        //request
        urlStrs.forEach(function (urlStr) {
            let options = {
                url: urlStr,
                gzip: true,
                timeout: 10000,
                headers: {
                    'authority' : 'stockx.com',
                    'x-requested-with' : 'XMLHttpRequest',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
                    "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    "accept-encoding": "gzip, deflate, br",
                    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
                    "cache-control": "no-cache",
                    "jwt-authorization": "false",
                    "pragma": "no-cache",
                    'appos' : 'web',
                    'appversion' : '0.1',
                    'referer' : 'https://stockx.com',
                }
            };

            proxyRequest(options, function (err, response, body) {
                console.log(urlStr)
                ep.emit('getHtml', {
                    err : err,
                    body : body,
                });
            })
        })
    })
}
