var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy');
var Q = require('q');
var fun = require('./fun');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'item.jd.com' || urlInfo.host == 'item.jd.hk'){
            var exp = /(\d*)\.html/ig;
            var res = exp.exec(urlInfo.path);
            var pid = res[1];
        }
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
        return '';
    }

    //get html
    getHtml('http://cdnware.m.jd.com/c1/skuDetail/apple/5.4.1/'+pid+'.json', function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        getItemInfo({body:body, pid:pid, url:urlStr}, urlInfo,  callback);
    })
}

/*
 *内容处理
 **/
function getItemInfo(params, urlInfo, callback) {
    var pid = params.pid, body = params.body, url = params.url;

    if (!fun.isJson(body)) {
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'body not a json'
            }
        });
    }

    body = JSON.parse(body);
    var itemInfo = {
        Unique: 'cn.jd.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName : '京东',
            ShopId: '',
            ImageUrl: '',
            VenderType:'普通',
            ShopType:'普通',
            StageInfo:'',
            Region: true,
        },
        Variations: [],
        Items: []
    };

    if(body.code == 25){//未获得信息
        itemInfo.Status = 'notFind'
        return callback(null, itemInfo);
    } else if(body.code != 0){//抓取失败
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": "Crawl Error"
            }
        });
    }

    var wareInfo =  body.wareInfo;
    var type = {'color':1, 'size': 2, "spec": 3};                  //类型对应id
    var color = {
        "Id": 1 ,
        "Name":"",
        "Values":[]
    };
    var size = {
        "Id": 2 ,
        "Name":"",
        "Values":[]
    };
    var spec = {
        "Id": 3 ,
        "Name":"",
        "Values":[]
    };
    var colorSkus=[];
    var priceSkus=[];
    var n = j = h =0; //标记位

    itemInfo.ItemAttributes.Title    =   wareInfo.basicInfo.name;
    itemInfo.ItemAttributes.ImageUrl =   wareInfo.basicInfo.wareImage[0].big;
    if(wareInfo.shopInfo.shop != null) {
        itemInfo.ItemAttributes.ShopId  = 'cn.jd.'+wareInfo.shopInfo.shop.shopId;
        itemInfo.ItemAttributes.ShopName  =  wareInfo.shopInfo.shop.name;
        if (wareInfo.shopInfo.shop.venderType == 1) {
            itemInfo.ItemAttributes.VenderType  =  '自营';
        }
    }
    if (wareInfo.basicInfo.service.service == '由京东发货并提供售后服务') {
        itemInfo.ItemAttributes.VenderType  =  '自营' ;
    }

    //数据处理
    var isColor = typeof  wareInfo.basicInfo.skuColorSize.colorSizeTitle['colorName'] != 'undefined'? true : false;
    var isSize  = typeof  wareInfo.basicInfo.skuColorSize.colorSizeTitle['sizeName'] != 'undefined' ? true : false;
    var isSpec  = typeof  wareInfo.basicInfo.skuColorSize.colorSizeTitle['specName'] != 'undefined' ? true : false;
    if(isColor){
        color.Name = wareInfo.basicInfo.skuColorSize.colorSizeTitle['colorName'];
    }
    if(isSize){
        size.Name = wareInfo.basicInfo.skuColorSize.colorSizeTitle['sizeName'];
    }
    if(isSpec){
        spec.Name = wareInfo.basicInfo.skuColorSize.colorSizeTitle['specName'];
    }

    if(wareInfo.basicInfo.skuColorSize.colorSize){//有属性
        wareInfo.basicInfo.skuColorSize.colorSize.forEach(function(val){
            var item = {
                "Unique":"cn.jd."+val.skuId,
                "Attr":[],
                "Offers": [{
                    "Merchant": {
                        "Name":"jd"
                    },
                    "List":[
                        {
                            "Price": 0,
                            "Type": "RMB"
                        }
                    ]
                }]
            };

            if(isColor){
                if((colorIndex = _.findIndex(color.Values, {"Name": _.trim(val.color,' \n\t')})) == -1){
                    n++;
                    var valueId = type.color+_.padStart(n, 6, 0);
                    var ImageUrls = [];

                    if(wareInfo.basicInfo.wareId == val.skuId){//当前skuid
                        wareInfo.basicInfo.wareImage.forEach(function(v){
                            ImageUrls.push(v.big);
                        })
                    }else{//除去当前skuid 集合
                        colorSkus.push([valueId, val.skuId]);
                    }


                    color.Values.push({
                        "ValueId": valueId,
                        "Name": _.trim(val.color,' \n\t'),
                        "ImageUrls": ImageUrls
                    });

                    colorIndex = color.Values.length - 1;
                }

                currentColor =  color.Values[colorIndex];
                item.Attr.push({
                    "Nid": color.Id,
                    "N":   color.Name,
                    "Vid": currentColor.ValueId,
                    "V":   currentColor.Name
                })
            }

            if(isSize){
                if((sizeIndex = _.findIndex(size.Values, {"Name": _.trim(val.size,' \n\t')})) == -1){
                    j++;
                    valueId = type.size+_.padStart(j, 6, 0);
                    size.Values.push({
                        "ValueId": valueId,
                        "Name": _.trim(val.size,' \n\t')
                    });

                    sizeIndex = size.Values.length - 1;
                }

                currentSize  =  size.Values[sizeIndex];
                item.Attr.push({
                    "Nid": size.Id,
                    "N":   size.Name,
                    "Vid": currentSize.ValueId,
                    "V":   currentSize.Name
                })
            }

            if(isSpec){
                if((specIndex = _.findIndex(spec.Values, {"Name": _.trim(val.spec,' \n\t')})) == -1){
                    h++;
                    valueId = type.spec+_.padStart(h, 6, 0);
                    spec.Values.push({
                        "ValueId": valueId,
                        "Name": _.trim(val.spec,' \n\t')
                    });

                    specIndex = spec.Values.length - 1;
                }

                currentSpec  =  spec.Values[specIndex];
                item.Attr.push({
                    "Nid": spec.Id,
                    "N":   spec.Name,
                    "Vid": currentSpec.ValueId,
                    "V":   currentSpec.Name
                })
            }

            //skuid集合
            priceSkus.push('J_'+val.skuId);

            //保存商品信息
            itemInfo.Items.push(item)
        });
    }else{//无属性
        var item = {
            "Unique":"cn.jd."+wareInfo.basicInfo.wareId,
            "Attr":[],
            "Offers": [{
                "Merchant": {
                    "Name":"jd"
                },
                "List":[
                    {
                        "Price": 0,
                        "Type": "RMB"
                    }
                ]
            }]
        };
        itemInfo.Items.push(item)

        //skuid集合
        priceSkus.push('J_'+wareInfo.basicInfo.wareId);
    }

    //页面信息
    var apiUrl = 'https://item.m.jd.com/product/'+pid+'.html';
    var getStageInfo = function(apiUrl, tryFun) {
        getHtml(apiUrl, function(body, err){
            if(err){
                return tryFun(err);
            }
            var $ = cheerio.load(body);
            if ($('#returnurl').val()) {
                apiUrl = 'https://mitem.jd.hk/ware/view.action?wareId='+pid;
                return getStageInfo(apiUrl, tryFun);
            }

            if($('.prod-whitebar-txt').text() != ''){
                itemInfo.ItemAttributes.StageInfo = $('.prod-whitebar-txt').text();
            }
            if ($('#isHk').val() == 'true') {
                itemInfo.ItemAttributes.ShopType  = '全球购';
                // 全球购的情况下在判断税费
                var tax = $(".oversea-tax").text();
                if(tax.indexOf("商家承担")>=0) {
                    itemInfo.ItemAttributes.Tax = 1;
                } else {
                    itemInfo.ItemAttributes.Tax = 1.119;
                }
            }else{
                itemInfo.ItemAttributes.Tax = 1;
            }
            //增加税费判断
            // var tax = $(".oversea-tax").text();
            // if(tax.indexOf("商家承担")>=0) {
            //     itemInfo.ItemAttributes.Tax = 1;
            // } else {
            //     itemInfo.ItemAttributes.Tax = 1.119;
            // }

            return tryFun(null, 'ok');
        })
    };

    //取价格
    getStageInfo(apiUrl, function (err, success) {
        if (err) {
            return callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": err.message
                }
            });
        }
        getHtml('http://p.3.cn/prices/mgets?type=1&skuIds='+priceSkus.join(), function(bodyPrices, err){
            if(err){
                return callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": err.message
                    }
                });
            }
            if (!fun.isJson(bodyPrices)) {
                return callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": 'price not a json'
                    }
                });
            }
            bodyPrices = JSON.parse(bodyPrices);
            bodyPrices.forEach(function(bodyPrice){
                if((itemIndex = _.findIndex(itemInfo.Items, {"Unique": "cn.jd."+ _.trimStart(bodyPrice.id,'J_')})) != -1){
                    if (bodyPrice.p != -1){
                        itemInfo.Items[itemIndex].Offers[0].List[0].Price = bodyPrice.p;
                    } else {
                        itemInfo.Status = 'outOfStock';
                    }
                }
            })

            if(itemInfo.Status == 'inStock'){
                //并发取图片
                if(colorSkus.length > 0){
                    var crawlColorSkusErr = false;
                    var ep = new eventproxy();

                    ep.after('colorSkus', colorSkus.length, function (colorSkusItems) {
                        if (crawlColorSkusErr) {
                            return callback({
                                "Errors":{
                                    'Code': 'Error',
                                    "Message": crawlColorSkusErr
                                }
                            });
                        }

                        colorSkusItems.sort(function(a,b){
                            return a[0] > b[0];
                        })
                        colorSkusItems.forEach(function(colorSkusItem){
                            if((colorIndex = _.findIndex(color.Values, {"ValueId": colorSkusItem[0]})) != -1){
                                var ImageUrls = [];
                                colorSkusItem[1].wareInfo.basicInfo.wareImage.forEach(function(v){
                                    ImageUrls.push(v.big);
                                })
                                color.Values[colorIndex].ImageUrls = ImageUrls;
                            }
                        })

                        //返回数据
                        if(isColor) itemInfo.Variations.push(color);
                        if(isSize) itemInfo.Variations.push(size);
                        if(isSpec) itemInfo.Variations.push(spec);
                        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                        return callback(null, itemInfo);
                    })

                    colorSkus.forEach(function (colorSku) {
                        getHtml('http://cdnware.m.jd.com/c1/skuDetail/apple/5.4.1/'+colorSku[1]+'.json', function(body, err){
                            if (err){
                                crawlColorSkusErr = err.message;
                            }
                            if (!fun.isJson(body)) {
                                crawlColorSkusErr = 'color api not a json';
                                body = null;
                            } else {
                                body = JSON.parse(body);
                            }

                            ep.emit('colorSkus', [colorSku[0], body]);
                        });
                    })
                }else{
                    //返回数据
                    if(isColor) itemInfo.Variations.push(color);
                    if(isSize) itemInfo.Variations.push(size);
                    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                    return callback(null, itemInfo);
                }
            }else {
                return callback(null, itemInfo);
            }
        })
    })
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        timeout: 15000,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Pragma":"no-cache",
            "Cookie" : 'JAMCookie=true; abtest=20171111200228762_79; __jdv=181809404|www.kaluli.com|-|referral|-|1513584901084; USER_FLAG_CHECK=186afa1515905721eed63d12af618a9f; warehistory="19196697635,"; __jda=181809404.1509329702322636854580.1509329702.1514442236.1514449227.15; __jdb=181809404.8.1509329702322636854580|15.1514449227; __jdc=181809404; mba_muid=1509329702322636854580; mba_sid=15144492270307356968612668602.8; sid=2646216d07d8ccd89e8893e396d84c82'
        }
        // proxy: 'http://172.16.13.177:8888'
        //encoding: null
    }, function(error, response, body, callbackStatus) {

        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0
                || body.indexOf('Direct connection failed, no parent proxy') > 0
            ) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}

