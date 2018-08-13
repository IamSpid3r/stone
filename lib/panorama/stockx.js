const request = require('request');
const url  = require('url');
const querystring = require('querystring');
const cheerio = require('cheerio');
const md5 = require('md5');
const _ = require('lodash');
const eventproxy = require('eventproxy');

const proxyRequest = require('../proxyRequestGuowai').proxyRequest;
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
    (async () => {
        try {
            var itemInfo = {
                Md5: '',
                Status: 'inStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: '',
                    ShopName : 'stockx',
                    ShopId: 'usa.stockx',
                    ImageUrl: '',
                    ImageUrls: [],
                },
            };


            //当前页面的数据
            let realPath = urlStr.replace(/buy\//,'');
            let body = await getHtml(realPath);
            let titleReg = /<title>(.*)<\/title>/
            let titleMatch = titleReg.exec(body);
            if (!titleMatch) {
                throw new Error('没有找到标题');
            }
            let title = titleMatch[1];
            if (title.indexOf('StockX: ') != -1) {
                throw new Error('不存在的商品');
            }

            let imageReg = /class="image-container">(.*?)<\/div>/;
            let imageMatch = imageReg.exec(body);
            if (!imageMatch) {
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                return callback(null, itemInfo);
            }
            let images = imageMatch[1];
            var $ = cheerio.load(images);
            $('img').each(function () {
                itemInfo.ItemAttributes.ImageUrls.push($(this).attr('src'));
                if (!itemInfo.ItemAttributes.ImageUrl) {
                    itemInfo.ItemAttributes.ImageUrl = $(this).attr('src');
                }
            })


            //基本信息
            itemInfo.ItemAttributes.Title =  title;
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
