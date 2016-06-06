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
                Unique: 'cn.nikestore.' + uniqueId,
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
                callback(null, itemInfo);
                return ;
            }
            //获取所有的url
            nikeUrls.push(res.url);
            for(var i in res['inStockColorways']){
                if(nikeUrls.indexOf(res['inStockColorways'][i].url) == -1){
                    nikeUrls.push(res['inStockColorways'][i].url);
                }
            }

            //取回数据统一处理
            var ep = new eventproxy();
            ep.after('nikeUrls', nikeUrls.length, function (nikeItems) {
                nikeItems = nikeItems.map(function (body) {
                    $ = cheerio.load(body);
                    res = $('#product-data').html();

                    return JSON.parse(res);
                });

                nikeItems.forEach(function(nikeItem){
                    //获取所有的颜色
                    j++;
                    valueId = type.color+_.padStart(j, 6, 0);
                    color.Values.push({
                        "ValueId": valueId,
                        "Name":nikeItem.colorDescription,
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

                            colorIdIndex = _.findIndex(color.Values, {"Name": nikeItem.colorDescription});
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
                                            "Type": "RMB"
                                        }
                                    ]
                                }]
                            })
                        }
                    })
                })


                itemInfo.Variations.push(color);
                itemInfo.Variations.push(size);
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
                    ep.emit('nikeUrls', body);
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
        var title = $('meta[name="keywords"]').attr('content');
        var price = parseFloat($('meta[property="product:price:amount"]').attr('content'));

        if(title && price){
            var itemInfo = {
                Unique: 'cn.nikestore.piid.' + res_custom[1],
                Md5: '',
                Status: 'inStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: title,
                    ShopName : 'NIKE官网',
                    ShopId: 'cn.nikestore',
                    ImageUrl: ''
                },
                Variations: [],
                Items: []
            };

            itemInfo.Items.push({
                "Unique":"cn.nikestore.piid."+res_custom[1],
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
                Unique: 'cn.nikestore.piid.' + res_custom[1],
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
            callback(null, itemInfo);
            return ;
        }
    })
}

/*
*获取html
**/
function getHtml(urlStr, callback){

    proxyRequest({
        url: urlStr,
        gzip: true,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch, gzip",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            'Referer':'http://www.nike.com/cn/zh_cn/c/men',
            "Pragma":"no-cache",
         },
        //encoding: null
    }, function(error, response, body, callbackStatus) {
        //如果是限制ip了就返回false
        if(!error){
            if (body.indexOf("Sorry, this item isn't available") != -1) {
                callbackStatus(false)
            } else {
                callbackStatus(true);
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body){
        callback(body, error);
    })
}