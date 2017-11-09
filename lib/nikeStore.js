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
    if(urlInfo.host == 'store.nike.com'){
        var exp_normal = /cn\/zh_cn\/pd.*pid-(\d*)(\/pgid-(\d*)){0,1}/ig;            //正常详情页
        var exp_custom = /cn\/zh_cn\/product\/(.*)\//ig;      //定制详情页

        //http://store.nike.com/cn/zh_cn/pd/lunarepic-flyknit-%25E7%2594%25B7%25E5%25AD%2590%25E8%25B7%2591%25E6%25AD%25A5%25E9%259E%258B/pid-10947705/pgid-11181105
        res_normal = exp_normal.exec(urlInfo.path);
        res_custom = exp_custom.exec(urlInfo.path);
        if(res_normal){
            getNormalItemInfo(urlStr, callback, res_normal);
        }else if(res_custom){
            getCustomItemInfo(urlStr, callback, res_custom);
        }else{
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'Goods Not Found'
                }
            });
            return ;
        }

    }else if(urlInfo.host == 'www.nike.com'){
        callback({
            "Errors":{
                'Code': 'Warning',
                "Message": 'Don\'t need to crawl'
            }
        });
        return ;
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

        if(res){
            res = JSON.parse(res);

            var itemInfo = {
                Unique: 'cn.nikestore.' + res.productGroupId,
                Md5: '',
                Status: 'inStock',
                Url: res.url,
                ItemAttributes: {
                    Title: res.displayName,
                    ShopName : 'NIKE官网',
                    ShopId: 'cn.nikestore',
                    ImageUrl: res.imagesHeroMedium[0]
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
            var nikeUrls  = [];  //nike所有商品链接
            var nikeItems = [];  //nike所有商品


            if(!res['inStockColorways']){//下架
                itemInfo.Status = 'outOfStock';
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                callback(null, itemInfo);
                return ;
            }

            //获取所有的url
            for(var i in res['inStockColorways']){
                if(
                    nikeUrls.indexOf(res['inStockColorways'][i].url) == -1
                    && res.productId != res['inStockColorways'][i].productId
                ){
                    nikeUrls.push(res['inStockColorways'][i].url);
                //     oldUrl = res['inStockColorways'][i].url;
                //     productId = res['inStockColorways'][i].productId;
                //     productGroupId = res['inStockColorways'][i].productGroupId;
                //     catalogId = res.catalogId;
                //     path = oldUrl.substr('http://store.nike.com'.length);
                //
                //     oldUrl = encodeURIComponent(oldUrl);
                //     path = encodeURIComponent(path);
                //
                //     nikeUrls.push('http://store.nike.com/html-services/templateData/pdpData?action=getPage&path='+path+'&productId='+productId+'&productGroupId='+productGroupId+'&catalogId='+catalogId+'&newUrl='+oldUrl+'&country=CN&lang_locale=zh_CN');
                //
                }
            }

            //取回数据统一处理
            var ep = new eventproxy();
            ep.after('nikeUrls', nikeUrls.length, function (nikeItems) {
                //下架的去掉
                outOfStockColorways = [];
                for(var i in res['outOfStockColorways']){
                    outOfStockColorways.push(res['outOfStockColorways'][i].productId);
                }
                if(outOfStockColorways.indexOf(res.productId) == -1){
                    nikeItems.unshift(res);
                }
                nikeItems.sort(function (a,b) {
                    aName =  a.colorDescription ? a.colorDescription : (a.styleNumber +'-'+ a.colorNumber);
                    bName =  b.colorDescription ? b.colorDescription : (b.styleNumber +'-'+ b.colorNumber);

                    return aName > bName;
                });

                nikeItems.forEach(function(nikeItem){
                    //获取所有的颜色
                    j++;
                    valueId = type.color+_.padStart(j, 6, 0);
                    colorName =  nikeItem.colorDescription ? nikeItem.colorDescription : (nikeItem.styleNumber +'-'+ nikeItem.colorNumber);
                    color.Values.push({
                        "ValueId": valueId,
                        "Name": colorName,
                        "ImageUrls":nikeItem.imagesHeroMedium
                    });

                    nikeItem.skuContainer.productSkus.forEach(function(productSkus){
                        if(productSkus.inStock){
                            if(
                                (sizeIndex = _.findIndex(size.Values, {"Name": productSkus.displaySize})) == -1
                            ){
                                //获取所有的尺寸
                                n++;
                                valueId = type.size+_.padStart(n, 6, 0);

                                size.Values.push({
                                    "ValueId": valueId,
                                    "Name": productSkus.displaySize
                                });

                                sizeIndex = size.Values.length -1;
                            }


                            trackingData = nikeItem.trackingData.product;           //商品详情
                            currency = nikeItem.crossSellConfiguration.currency == 'USD' ? 'USD' : 'RMB';

                            colorIdIndex = color.Values.length-1;
                            colorId      = color.Values[colorIdIndex].ValueId;
                            colorName    = color.Values[colorIdIndex].Name;
                            sizeId       = size.Values[sizeIndex].ValueId;
                            sizeName     = size.Values[sizeIndex].Name;

                            //保存商品信息
                            itemInfo.Items.push({
                                "Unique":"cn.nikestore."+nikeItem.productId+":"+sizeName,
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
                                            "Price": trackingData.price,
                                            "Type": currency
                                        }
                                    ]
                                }]
                            })
                        }
                    })
                })


                itemInfo.Variations.push(color);
                itemInfo.Variations.push(size);
                if (itemInfo.Items.length <= 0) {
                    itemInfo.Status = 'outOfStock';
                }
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))

                callback(null, itemInfo);
                return ;
            });


            //并发取数据
            nikeUrls.forEach(function (nikeUrl) {
                getHtml(nikeUrl, function(body, err){
                    if(err){
                        callback({
                            "Errors":{
                                'Code': 'Error',
                                "Message": err
                            }
                        });
                        return '';
                    }

                    $ = cheerio.load(body);
                    body = $('#product-data').html();
                    body = JSON.parse(body);
                    // callback(null, body);
                    // return ;
                    if(!body){
                        callback({
                            "Errors": {
                                'Code': 'Error',
                                "Message": 'Crawl Error'
                            }
                        });
                        return ;
                    }
                    ep.emit('nikeUrls', body);


                    // body = JSON.parse(body);
                    // if(body.success){
                    //     ep.emit('nikeUrls', body.response.pdpData);
                    // }else{
                    //     callback({
                    //         "Errors": {
                    //             'Code': 'Error',
                    //             "Message": 'Crawl Error'
                    //         }
                    //     });
                    //     return ;
                    // }
                });
            })
        }else if(notFound){
            var itemInfo = {
                Unique: 'cn.nikestore.' + uniqueId,
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
        }else{
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'Goods Not Found'
                }
            });
            return ;
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
    headers = {
        'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
        "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        "Accept-Encoding":"deflate, sdch, gzip",
        "Accept-Language":"zh-CN,zh;q=0.8,en;q=0.6,ja;q=0.4",
        "Cache-Control":"no-cache",
        "Pragma":"no-cache",
        "Upgrade-Insecure-Requests":1,
        "Host":"store.nike.com"
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