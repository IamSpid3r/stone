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
        //https://www.finishline.com/store/product/mens-nike-air-force-1-07-lv8-utility-casual-shoes/prod2783266?styleId=AJ7747&colorId=100
        if(urlInfo.host.indexOf('finishline') != -1){
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
            ShopName : 'finishline',
            ShopId: 'usa.finishline',
            ImageUrl: '',
        },
        Variations: [],
        Items: [],
        Coupon:[]
    };
    (async () => {
        try {

            //https://www.finishline.com/store/product/mens-nike-air-force-1-07-lv8-utility-casual-shoes/prod2783266?styleId=AJ7747&colorId=100
            let exp = /product\/.*\/(prod\d*)/ig;
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

            //当前页面的数据
            var body = await getHtml(urlStr);
            body = body[0];
            //没有找到页面
            if (body.toString().indexOf('No matches found for') > -1) {
                itemInfo.Status = 'notFind';
                return callback(null, itemInfo);
            }
            var $ = cheerio.load(body);
            //sku库存数据
            var sizeAvailableUrl = 'https://www.finishline.com/store/browse/json/productSizesJson.jsp?productId='+productId;
            var sizeAvailableBody = await getHtml(sizeAvailableUrl);
            sizeAvailableBody = JSON.parse(sizeAvailableBody);

            var title = _.trim($('#title').text());

            //商品信息
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
            var n = m =  0;
            var gender = $('#sizeChart').attr('data-gender');
            if (typeof gender == 'undefined') {
                if (typeof $('#sizeChartModal').attr('class') == "undefined") {
                    return  callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": 'Gender erorr'
                        }
                    });
                } else {
                    gender = null;
                }
            }

            var priceAll = {};
            $('div[itemprop="offers"]').each(function () {
                let price = $(this).find('[itemprop="price"]').text();
                let styleid = $(this).find('[itemprop="model"]').text();
                priceAll[styleid] = price;
            })

            //尺码
            var suffixImg = '';
            var midlleImg = '';
            $('#mobileAlternateColorsFLSlider a').each(function (){
                //配色
                var skuIdTmp = $(this).attr('data-styleid');
                var colorName = $(this).find('img').attr('alt');

                //图片
                var ImageUrls = [];
                $('#productImageLayout img').each(function (j) {
                    if (j == 0) {//todo  暂时取第一个
                        if (suffixImg == '') {
                            let imgPath = 'http:'+$(this).attr('src');
                            suffixImg  = imgPath.substring(imgPath.indexOf("$"))
                            midlleImgReg = /\d+_\d+_([a-z])\d/ig;
                            midlleImgReslut = midlleImgReg.exec(imgPath);
                            if (midlleImgReslut) {
                                midlleImg  =  midlleImgReslut[1];
                            }
                        }
                        skuIdTmp2 = skuIdTmp.replace(/-/g,'_');
                        ImageUrls.push(`http://images.finishline.com/is/image/FinishLine/${skuIdTmp2}_${midlleImg}${j+1}?${suffixImg}`);
                    }
                })

                m++;
                colors.Values.push({
                    ValueId: skuIdTmp,
                    Name:  colorName,
                    ImageUrls : ImageUrls
                });

                var price = priceAll[skuIdTmp];
                sizeAvailableBody.productSizes.forEach(sizeVal => {
                    if (sizeVal.productId == skuIdTmp && sizeVal.sizeClass == '') {
                        let sizeName = gender+' '+sizeVal.sizeValue;

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
                            Unique: 'usa.finishline.' + skuIdTmp+'.'+sizes.Values[sizeIndex].ValueId,
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
                                    Name: 'finishline',
                                },
                                List: [{
                                    Price: price,
                                    Type: 'USD'
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
            itemInfo.Variations.push(colors);
            itemInfo.Variations.push(sizes);


            //属性
            itemInfo.Unique = 'usa.finishline.'+productId;
            //基本信息
            let imageUrl = colors.Values[0].ImageUrls[0];
            itemInfo.ItemAttributes.Title =  title;
            itemInfo.ItemAttributes.ImageUrl = imageUrl;
            itemInfo.ItemAttributes.Gender= gender;

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
                timeout: 8000,
                headers: {
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
                    "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    "accept-encoding": "gzip, deflate, br",
                    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
                    "cache-control": "no-cache",
                    cookie:''
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


