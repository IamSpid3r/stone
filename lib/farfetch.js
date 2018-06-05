const request = require('request');
const url  = require('url');
const querystring = require('querystring');
const cheerio = require('cheerio');
const md5 = require('md5');
const _ = require('lodash');
const eventproxy = require('eventproxy');
const fun = require('./fun');

const proxyRequest = require('./proxyRequest2');

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        //https://www.farfetch.com/cn/shopping/men/nike-air-vapormax-flyknit--item-12624677.aspx
        ///cn/shopping/men/swear-nori-sneakers-item-12934772.aspx
        if(urlInfo.host == 'www.farfetch.com'){
            var exp = /cn\/.*?item-(\d*)\.aspx/ig;
            var res = exp.exec(urlInfo.path);
            var productId = res[1];

            return getItemInfo(urlStr, productId, callback);
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
                "Message": 'Url Error'
            }
        });
    }
}

/*
 *内容处理
 **/
function getItemInfo(urlStr, productId, callback) {
    var itemInfo = {
        Unique: '',
        Md5: '',
        Status: 'inStock',
        Url: urlStr,
        ItemAttributes: {
            Title: '',
            ShopName : 'farfetch',
            ShopId: 'cn.farfetch',
            ImageUrl: '',
        },
        Variations: [],
        Items: [],
        Coupon:[]
    };

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

    (async () => {
        try {
            var allSkuResults = [];

            //当前页面的数据
            var body = await getHtml(urlStr);

            //没有找到页面
            if (body.toString().indexOf('没有找到页面') > -1) {
                itemInfo.Status = 'notFind';
                return callback(null, itemInfo);
            }

            var $ = cheerio.load(body);
            var patternSku = /__initialState_slice-pdp__\'\] = ([^<]+);<\/script/
            if (skuResult = patternSku.exec(body)) {
                skuResult = JSON.parse(skuResult[1]);

                //写入所有sku数组
                allSkuResults.push(skuResult);
            } else {
                throw new Error('body not found sku!');
            }

            //style
            let styleRequest = 'https://www.farfetch.com/cn/'+skuResult.requests.getSameStyleProducts;
            var styleBody = await getHtml(styleRequest);
            styleBody = JSON.parse(styleBody);

            //all style body
            if (styleBody.length > 0) {
                let urlStrs = [];
                styleBody.forEach(function (val) {
                    if (val.productId != productId) {
                        urlStrs.push('https://www.farfetch.com'+val.link.href);
                    }
                })

                //get body
                if (urlStrs.length > 0) {
                    var allBodys = await getHtml(urlStrs);
                    allBodys.forEach(function (body) {
                        if (skuResult = patternSku.exec(body)) {
                            skuResult = JSON.parse(skuResult[1]);

                            allSkuResults.push(skuResult);
                        } else {
                            throw new Error('body not found sku!');
                        }
                    })
                }
            }

            //return callback(null, allSkuResults);
            //items 排序保证即使填的子商品不一样md5一致
            allSkuResults.sort(function (a, b) {
                return a.productViewModel.details.productId -  b.productViewModel.details.productId;
            })
            var firstProductId = allSkuResults[0].productViewModel.details.productId;
            allSkuResults.forEach(function (result) {
                let productViewModel = result.productViewModel;
                var tmpImgs = [];
                productViewModel.images.main.forEach(function (val) {
                    tmpImgs.push(val[600]);
                })

                color.Values.push({
                    ValueId: result.productViewModel.details.productId,
                    Name: productViewModel.details.colors,
                    ImageUrls : tmpImgs
                })
                _colorIndex = color.Values.length - 1;
                _(productViewModel.sizes.available).forEach(function (val, sizeKey) {
                    if (val.quantity > 0) {
                        if (-1 == (_sizeIndex = _.findIndex(size.Values, {Name : val.description}))) {
                            size.Values.push({
                                ValueId:  size.Values.length + 1,
                                Name: val.description
                            })
                            _sizeIndex  = size.Values.length - 1;
                        }

                        //item
                        price =  sizeKey in productViewModel.priceInfo
                            ? productViewModel.priceInfo[sizeKey].finalPrice
                            : productViewModel.priceInfo.default.finalPrice;
                        itemInfo.Items.push({
                            Unique: 'cn.farfetch.' +color.Values[_colorIndex].ValueId+'.'+size.Values[_sizeIndex].ValueId,
                            Attr: [
                                {
                                    'Nid': 1,
                                    'N': '颜色',
                                    'Vid': color.Values[_colorIndex].ValueId,
                                    'V':  color.Values[_colorIndex].Name
                                },{
                                    'Nid': 2,
                                    'N': '尺码',
                                    'Vid':  size.Values[_sizeIndex].ValueId,
                                    'V':  size.Values[_sizeIndex].Name
                                }
                            ],
                            Offers: [{
                                Merchant: {
                                    Name: 'farfetch',
                                },
                                List: [{
                                    Price: price,
                                    Type: 'RMB'
                                }]
                            }]
                        })
                    }
                })
            })

            if (itemInfo.Items.length == 0) {
                itemInfo.Status = 'outOfStock';
                return callback(null, itemInfo);
            }
            //属性
            itemInfo.Unique = 'cn.farfetch.' + firstProductId;
            itemInfo.Variations.push(color);
            itemInfo.Variations.push(size);
            //基本信息
            itemInfo.ItemAttributes.Title =  skuResult.productViewModel.details.shortDescription;
            itemInfo.ItemAttributes.ImageUrl = color.Values[0].ImageUrls[0];

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
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
                    "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    "Accept-Encoding": "deflate,sdch",
                    "Accept-Language": " zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                    "Referer": "https://www.vmall.com/product/10086000689735.html",
                    "Cookie" : 'Hm_lvt_a08b68724dd89d23017170634e85acd8=1527762808; UM_distinctid=163b5c26ecc1162-05e9e37c992ce7-336d7704-fa000-163b5c26ecd206; _dmpa_ref=%5B%22%22%2C%22%22%2C1527762809%2C%22https%3A%2F%2Fwww.google.com.hk%2F%22%5D; _dmpa_ses=3536e8a31cbce8d38a759e5768b9edef984cbac4; _pk_hi_ssid=26b1ba5569ec41b59c0e7601499f1ff3; euid=9971d0ddc54644ec9eb5b49bb93b245b; deviceid=bbc0db1118b64bb6b7aeb85b795a273e; TID=5766391ee6fa4d5788cfe7f68421dfdb; cps_orderid=; _pk_ref.m.vmall.com.9771=%5B%22%22%2C%22%22%2C1527762984%2C%22https%3A%2F%2Fwww.vmall.com%2Fproduct%2F10086000689735.html%22%5D; _pk_cvar.m.vmall.com.9771=%7B%7D; _pk_ses.m.vmall.com.9771=*; Hm_lvt_fe2b46caf2fee4e4b483b4c75f784be9=1527762985,1527762991; Hm_lpvt_fe2b46caf2fee4e4b483b4c75f784be9=1527762991; _pk_id.m.vmall.com.9771=7ddb2497b37d3a9d.1527762984.1.1527762991.1527762984.; Hm_lpvt_a08b68724dd89d23017170634e85acd8=1527763555; _dmpa_ses_time=1527765355247; _dmpa_id=101910f9bddf2b95ef4475787402341527762772553.1527763552.0.1527763555..'
                }
            };
            request(options, function (err, response, body) {
                console.log(urlStr, err);
                ep.emit('getHtml', {
                    err : err,
                    body : body,
                });
            })
        })
    })
}
