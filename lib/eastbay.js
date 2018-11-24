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
        //https://www.eastbay.com/product/model:301937/sku:88016001/jordan-retro-13-mcs-mens/black/
        if(urlInfo.host.indexOf('eastbay') != -1){
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
            ShopName : 'eastbay',
            ShopId: 'usa.eastbay',
            ImageUrl: '',
        },
        Variations: [],
        Items: [],
        Coupon:[]
    };
    (async () => {
        try {
            let exp = /product\/model:(\d*)\/sku:([^\/]*)\//;

            // https://www.eastbay.com/product/model:301937/sku:88016001/jordan-retro-13-mcs-mens/black/
            // https://www.eastbay.com/product/model:303684/sku:37697GW1/nike-nba-champions-t-shirts-mens/golden-state-warriors/blue/
            var match = exp.exec(urlStr);
            if (!match) {
                return  callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": 'Url erorr'
                    }
                });
            }
            var productId = match[1];
            var skuId = match[2];

            //当前页面的数据
            var body = await getHtml(urlStr);
            //没有找到页面
            if (body.toString().indexOf('Eastbay: Gear Up Your Game') > -1) {
                itemInfo.Status = 'notFind';
                return callback(null, itemInfo);
            }

            //商品信息
            let modelReg = /var model = ([\s\S]*?)var model_/ig;
            let modelResult = modelReg.exec(body);
            let modelBody = _.trim(modelResult[1]);
            modelBody = _.trim(modelBody, ';');
            modelBody = JSON.parse(modelBody);
            //sku信息
            let styleReg = /var styles = ([\s\S]*?)var styles_/ig;
            let styleResult = styleReg.exec(body);
            let styleBody = _.trim(styleResult[1]);
            styleBody = _.trim(styleBody, ';');
            styleBody = JSON.parse(styleBody);

            var gender = modelBody.GENDER_AGE;
            var productType = modelBody.PROD_TP;
            var colors = {
                Id :  1,
                Name : "颜色",
                Values : []
            };
            var sizes = {
                Id :  2,
                Name : "尺码",
                Values : []
            };
            var n = 0;
            //return callback(null, styleBody);

            //return callback(null, allSkuResults);
            //尺码
            var objKeys= Object.keys(styleBody);
            (function(watchLength){
                var current=0;

                _(styleBody).forEach(async function (row, skuIdTmp) {
                    //图片
                    var imgUrl = 'https://images.eastbay.com/is/image/EBFL2/'+skuIdTmp+'?req=set,json&handler=s';
                    var imgBody = await getHtml(imgUrl);
                    imgBody = _.trim(_.trim(imgBody, '/*jsonp*/s('), ',"");');
                    imgBody = JSON.parse(imgBody)
                    var ImageUrls = [];
                    _(imgBody.set.item).forEach((tv)=>{
                        imgPath = 'https://images.eastbay.com/is/image/'+tv.i.n;
                        ImageUrls.push(imgPath);
                    })

                    //配色
                    var colorName = row[15];
                    colors.Values.push({
                        ValueId: skuIdTmp,
                        Name:  colorName,
                        ImageUrls : ImageUrls
                    });

                    row[7].forEach(val => {
                        //todo
                        let tmpSize = _.trim(_.trim(_.trim(val[0]), '0'), '.');
                        if (productType == 'Shoes') {
                            var sizeName = `${gender} ${tmpSize}`;
                        } else {
                            var sizeName = tmpSize;
                        }
                        let price = val[2];
                        if((sizeIndex = _.findIndex(sizes.Values, {"Name": sizeName})) == -1){
                            //获取所有的尺寸
                            n++;
                            let sizeId = _.padStart(n, 6, '0');
                            sizes.Values.push( {
                                ValueId: sizeId,
                                Name:  sizeName,
                            })

                            sizeIndex = sizes.Values.length -1;
                        }

                        itemInfo.Items.push({
                            Unique: 'usa.eastbay.' + skuIdTmp+' '+sizes.Values[sizeIndex].ValueId,
                            Attr: [
                                {
                                    'Nid': 1,
                                    'N': '颜色',
                                    'Vid': skuIdTmp,
                                    'V':  colorName
                                },{
                                    'Nid': 2,
                                    'N': '尺码',
                                    'Vid':  sizes.Values[sizeIndex].ValueId,
                                    'V':  sizes.Values[sizeIndex].Name,
                                }
                            ],
                            Offers: [{
                                Merchant: {
                                    Name: 'eastbay',
                                },
                                List: [{
                                    Price: price,
                                    Type: 'USD'
                                }]
                            }]
                        })
                    })

                    current++;
                    if (current === watchLength) {
                        if (itemInfo.Items.length == 0) {
                            itemInfo.Status = 'outOfStock';
                            return callback(null, itemInfo);
                        }
                        itemInfo.Variations.push(colors);
                        itemInfo.Variations.push(sizes);


                        //属性
                        itemInfo.Unique = 'usa.eastbay.'+productId;
                        //基本信息
                        let imageUrl = `https://images.eastbay.com/is/image/EBFL2/${skuId}_a1?fit=constrain,1&wid=500&hei=500&fmt=jpg`;
                        itemInfo.ItemAttributes.Title =  modelBody.NM;
                        itemInfo.ItemAttributes.ImageUrl = imageUrl;
                        itemInfo.ItemAttributes.Gender= gender;

                        itemInfo.Md5 = md5(JSON.stringify(itemInfo))
                        return callback(null, itemInfo);
                    }
                })
            }(objKeys.length))
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
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
                    "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    "accept-encoding": "gzip, deflate, br",
                    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
                    "cache-control": "no-cache",
                    "jwt-authorization": "false",
                    "pragma": "no-cache",
                    "cookie": "",
                }
            };

            request(options, function (err, response, body) {
                console.log(urlStr)
                ep.emit('getHtml', {
                    err : err,
                    body : body,
                });
            })
        })
    })
}
