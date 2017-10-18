var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy');
var Q = require('q');

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

        getItemInfo({body:body, pid:pid, url:urlStr},  callback);
    })
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid,
        body = params.body,
        url = params.url;

    try{
        body = JSON.parse(body);
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception
            }
        });
        return '';
    }
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
            StageInfo:'',
        },
        Variations: [],
        Items: []
    };


    if(body.code == 25){//未获得信息
        itemInfo.Status = 'notFind'
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return '';
    } else if(body.code != 0){//抓取失败
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": "Crawl Error"
            }
        });
        return '';
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
        itemInfo.ItemAttributes.VenderType  =  wareInfo.shopInfo.shop.venderType == 1 ? '自营' : '普通';
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

    //分期
    var getStageInfo = function() {
        var defer = Q.defer();

        getHtml('https://item.m.jd.com/product/'+pid+'.html', function(body, err){
            if(!err){
                var $ = cheerio.load(body);
                console.log($('.prod-whitebar-txt').text())
                if($('.prod-whitebar-txt').text() != ''){
                    itemInfo.ItemAttributes.StageInfo = $('.prod-whitebar-txt').text();
                }
            }

            return defer.resolve({});
        })

        return defer.promise;
    };

    //取价格
    getStageInfo().then(function() {
        getHtml('http://p.3.cn/prices/mgets?type=1&skuIds='+priceSkus.join(), function(bodyPrices, err){
            if(err){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return '';
            }
            try{
                bodyPrices = JSON.parse(bodyPrices);
            }catch(e){
                callback('price not json');
                return '';
            }

            bodyPrices.forEach(function(bodyPrice){
                if((itemIndex = _.findIndex(itemInfo.Items, {"Unique": "cn.jd."+ _.trimStart(bodyPrice.id,'J_')})) != -1){
                    if(bodyPrice.p != -1){
                        itemInfo.Items[itemIndex].Offers[0].List[0].Price = bodyPrice.p;
                    }else{//下架
                        itemInfo.Status = 'outOfStock';
                        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                        callback(null, itemInfo);
                        return false;
                    }
                }
            })


            if(itemInfo.Status == 'inStock'){
                //并发取图片
                if(colorSkus.length > 0){
                    var ep = new eventproxy();
                    ep.after('colorSkus', colorSkus.length, function (colorSkusItems) {
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
                        callback(null, itemInfo);
                        return ;
                    })


                    colorSkus.forEach(function (colorSku) {
                        getHtml('http://cdnware.m.jd.com/c1/skuDetail/apple/5.4.1/'+colorSku[1]+'.json', function(body, err){
                            if(err){
                                callback({
                                    "Errors":{
                                        'Code': 'Error',
                                        "Message": err
                                    }
                                });
                                return '';
                            }

                            try{
                                body = JSON.parse(body);
                            }catch(e){
                                callback('color api not json');
                                return ;
                            }

                            ep.emit('colorSkus', [colorSku[0], body]);
                        });
                    })
                }else{
                    //返回数据
                    if(isColor) itemInfo.Variations.push(color);
                    if(isSize) itemInfo.Variations.push(size);
                    itemInfo.Md5 = md5(JSON.stringify(itemInfo));

                    callback(null, itemInfo);
                    return ;
                }
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
            "Connection":"keep-alive",
            "Pragma":"no-cache",
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

