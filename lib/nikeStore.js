var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');
var zlib = require('zlib');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(
        urlInfo.host == 'store.nike.com'
        || urlInfo.host == 'www.nike.com'
    ) {
        var exp_normal = /cn\/zh_cn\/pd\/([^\/]*?)\/pid-(\d*)(\/pgid-(\d*)){0,1}/ig;     //正常详情页a
        var exp_normal2 = /cn\/t\//ig;     //正常详情页b
        var exp_custom = /cn\/zh_cn\/product\/[^\/]*/ig;      //定制详情页

        //https://www.nike.com/cn/t/benassi-jdi-print-男子拖鞋-VrTWZxpo/631261-100
        //http://store.nike.com/cn/zh_cn/pd/lunarepic-flyknit-%25E7%2594%25B7%25E5%25AD%2590%25E8%25B7%2591%25E6%25AD%25A5%25E9%259E%258B/pid-10947705/pgid-11181105
        res_normal = exp_normal.exec(urlInfo.path);
        res_normal2 = exp_normal2.exec(urlInfo.path);
        res_custom = exp_custom.exec(urlInfo.path);
        if (res_normal) {
            getNormalItemInfo(urlStr, callback, res_normal);
        }else if (res_normal2) {
            getNormal2ItemInfo(urlStr, callback, res_normal2);
        } else if (res_custom) {
            getCustomItemInfo(urlStr, callback, res_custom);
        } else {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'Goods Not Found'
                }
            });
            return;
        }

    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Host error is not nikestore hostname'
            }
        });
        return ;
    }
}

function getNormal2ItemInfo(urlStr,callback,res_normal2) {
    getHtml(urlStr, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        var $ = cheerio.load(body);
        if($('.not-found').text() == '您当前查找的产品已不再供应'){
            var itemInfo = {
                Unique: '',
                Md5: '',
                Status: 'outOfStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: '',
                    ShopName : 'NIKE官网',
                    ShopId: 'cn.nikestore',
                    ImageUrl: ''
                },
                Variations: [],
                Items: []
            };

            callback(null, itemInfo);
            return '';
        }

        var window = {};
        var regSku = /window\.INITIAL_REDUX_STATE=(.*);window\.__REACT_ASYNC_COMPONENTS_STATE/ig;
        regSku = /(eval\("window\.INITIAL_REDUX_STATE=.*?;window\.__REACT_ASYNC_COMPONENTS_STATE.*?;"\))/ig;
        var resSku = regSku.exec(body);
        if (resSku) {
            // resSku[1] = 'resSkuStr='+resSku[1];
            eval(resSku[1]);

            //console.log(window.INITIAL_REDUX_STATE)
            // callback(null, window.INITIAL_REDUX_STATE);
            // return '';
            var skuInfo = window.INITIAL_REDUX_STATE;
            var itemInfo = {
                Unique: '',
                Md5: '',
                Status: 'inStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: '',
                    ShopName : 'NIKE官网',
                    ShopId: 'cn.nikestore',
                    ImageUrl: ''
                },
                Variations: [],
                Items: []
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


            if ('Threads' in skuInfo) {
                var skuStateArr = {};
                skuInfo.Threads.dev.objects.forEach(function (object) {
                    if ('availableSkus' in object.productInfo[0]) {
                        object.productInfo[0].availableSkus.forEach(function (available) {
                            skuStateArr[available.skuId] = available.available;
                        })
                    }
                })

                _(skuInfo.Threads.products).forEach(function (product) {
                    if (n == 0) {
                        itemInfo.ItemAttributes.Title = product.title;
                        itemInfo.ItemAttributes.ImageUrl = product.firstImageUrl;
                        itemInfo.Unique = 'cn.nikestore.' + product.productGroupId;

                        n++;
                    }

                    if (product.state == 'IN_STOCK') {
                        color.Values.push({
                            "ValueId": product.productId,
                            "Name": product.colorDescription,
                            "ImageUrls":[product.firstImageUrl]
                        });

                        product.skus.forEach(function (sizeAttr) {
                            if (sizeAttr.skuId in skuStateArr && skuStateArr[sizeAttr.skuId]) {
                                if ((sizeIndex = _.findIndex(size.Values, {Name:sizeAttr.localizedSize})) == -1) {
                                    j++;
                                    valueId = type.size+_.padStart(j, 6, 0);

                                    size.Values.push({
                                        "ValueId": valueId,
                                        "Name": sizeAttr.localizedSize,
                                    })

                                    sizeIndex = size.Values.length -1;
                                }

                                colorIdIndex = color.Values.length-1;
                                colorId      = color.Values[colorIdIndex].ValueId;
                                colorName    = color.Values[colorIdIndex].Name;
                                sizeId       = size.Values[sizeIndex].ValueId;
                                sizeName     = size.Values[sizeIndex].Name;

                                //保存商品信息
                                itemInfo.Items.push({
                                    "Unique":"cn.nikestore."+sizeAttr.id,
                                    "Attr":[
                                        {
                                            "Nid": color.Id,
                                            "N":   color.Name,
                                            "Vid": colorId,
                                            "V":   colorName
                                        },
                                        {
                                            "Nid": size.Id,
                                            "N":   size.Name,
                                            "Vid": sizeId,
                                            "V":   sizeName
                                        }
                                    ],
                                    "Offers": [{
                                        "Merchant": {
                                            "Name":"nikeStore"
                                        },
                                        "List":[
                                            {
                                                "Price": product.currentPrice,
                                                "Type": 'RMB'
                                            }
                                        ]
                                    }]
                                })
                            }
                        })
                    }
                })
            }

            itemInfo.Variations.push(color);
            itemInfo.Variations.push(size);
            if (itemInfo.Items.length <= 0) {
                itemInfo.Status = 'outOfStock';
            }
            itemInfo.Md5 = md5(JSON.stringify(itemInfo))

            callback(null, itemInfo);
            return ;
        } else {
            var errMsg = body.indexOf('iframe') != -1 ? 'iframe sick' : 'Not found sku info'

            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": errMsg
                }
            });
            return '';
        }

    })
}


/*
*正常内容处理
**/
function getNormalItemInfo(urlStr,callback,res_normal) {
    getHtml(urlStr, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        var $ = cheerio.load(body);
        var res = $('#product-data').html();
        var notFound = $('.product-not-found-header').html(); //没有找到
        var uniqueId = (typeof res_normal[3] != 'undefined') ? res_normal[3]+'.'+ res_normal[1] : res_normal[1];

        if(res) {
            res = JSON.parse(res);
            var itemInfo = {
                Unique: 'cn.nikestore.' + res.productGroupId,
                Md5: '',
                Status: 'inStock',
                Url: res.url,
                ItemAttributes: {
                    Title: res.displayName,
                    ShopName: 'NIKE官网',
                    ShopId: 'cn.nikestore',
                    ImageUrl: res.imagesHeroMedium[0]
                },
                Variations: [],
                Items: []
            };

            var n = j = i = h = f = 0;
            var type = {'color': 1, 'size': 2};                  //类型对应id
            var color = {
                "Id": 1,
                "Name": "颜色",
                "Values": []
            };
            var size = {
                "Id": 2,
                "Name": "尺码",
                "Values": []
            };
            var nikeUrls = [];  //nike所有商品链接
            var nikeItems = [];  //nike所有商品


            if (!res['inStockColorways']) {//下架
                itemInfo.Status = 'outOfStock';
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                callback(null, itemInfo);
                return;
            }

            //获取所有的url
            for (var i in res['inStockColorways']) {
                if (
                    nikeUrls.indexOf(res['inStockColorways'][i].url) == -1
                ) {
                    nikeUrls.push(res['inStockColorways'][i].url);
                }
            }

            //掉新接口
            if (nikeUrls.length > 0) {
                getNormal2ItemInfo(nikeUrls[0], callback, res_normal);
                return;
            } else {
                itemInfo.Status = 'outOfStock';
                callback(null, itemInfo);
                return;
            }
        }else if(notFound){
            var itemInfo = {
                Unique: '',
                Md5: '',
                Status: 'outOfStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: '',
                    ShopName : '',
                    ShopId: '',
                    ImageUrl: ''
                },
                Variations: [],
                Items: []
            };

            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null ,itemInfo);
            return ;
        }else {
            getNormal2ItemInfo(urlStr,callback,res_normal);
            return;
        }
    })
}


/*
 *定制内容处理
 **/
function getCustomItemInfo(urlStr, callback, res_custom){
    getHtml(urlStr, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        var $ = cheerio.load(body);
        var content = JSON.parse($('#tmpData-pdpData').html());
        var title = $('meta[name="keywords"]').attr('content');
        var price = parseFloat($('meta[property="product:price:amount"]').attr('content'));

        if(title && price){
            var itemInfo = {
                Unique: 'cn.nikestore.pid.' + content.productId,
                Md5: '',
                Status: 'inStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: title,
                    ShopName : 'NIKE官网',
                    ShopId: 'cn.nikestore',
                    ImageUrl: 'http://ugc.nikeid.com/is/image/nike/ugc/'+content.prebuildId+'.tif?$NIKE_PWP_FTWR_GRAY$&wid=500&hei=500'
                },
                Variations: [],
                Items: []
            };

            itemInfo.Items.push({
                "Unique":"cn.nikestore.pid."+content.productId,
                "Attr":[
                ],
                "Offers": [{
                    "Merchant": {
                        "Name":"nikeStore"
                    },
                    "List":[
                        {
                            "Price": price,
                            "Type": "RMB"
                        }
                    ]
                }]
            })

            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            callback(null, itemInfo);
            return ;
        }else{
            var itemInfo = {
                Unique: 'cn.nikestore.pid.' + res_custom[1],
                Md5: '',
                Status: 'outOfStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: '',
                    ShopName : '',
                    ShopId: '',
                    ImageUrl: ''
                },
                Variations: [],
                Items: []
            };
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null, itemInfo);
            return ;
        }
    })
}

/*
*获取html
**/
function getHtml(urlStr, callback){
    urlStr = urlStr.indexOf('?') == -1 ? urlStr+'?t='+Math.random() : urlStr;
    console.log(urlStr)
    headers = {
        'User-Agent':' Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        "Accept":'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        "Accept-Encoding":"gzip, deflate, br",
        "Accept-Language":"zh-CN,zh;q=0.8,en;q=0.6,ja;q=0.4",
        "Cache-Control":"no-cache",
        "Pragma":"no-cache",
        "Upgrade-Insecure-Requests":1,
        "authority": 'www.nike.com',
    };

    proxyRequest({
        url: urlStr,
        gzip: true,
        headers:headers
        //encoding: null
    }, function(error, response, body){
        callback(body, error);
    })
}