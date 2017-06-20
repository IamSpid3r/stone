var request = require('request');
var url  = require('url');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');
var fs = require('fs');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'www.6pm.com'){
        getHtml(urlInfo, function(body, err){
            if(err){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return '';
            }

            if(body){
                getItemInfo({
                    res:body,
                    url:urlStr
                } , callback);
            }else{
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": 'Goods Not Found'
                    }
                });
                return ;
            }
        })
    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
        return '';
    }
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    //没有找到
    var res;
    var exp1 = /we were unable to find a result based on your search fo/g;
    var exp2 = /We are not able to find the page you requested/ig;

    res1 = exp1.exec(params.res);
    res2 = exp2.exec(params.res);
    if(res1 || res2){
        var itemInfo = {
            Unique: '',
            Md5: '',
            Status: 'notFind',
            Url: params.url,
            ItemAttributes: {
                Title: '',
                ShopName: "",
                ShopId: "",
                ImageUrl: ""
            },
            Variations: [],
            Items: []
        };

        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
    }


    var regExp = /(\/\/ TODO: use this for more private variables on the page[\s|\S]*?)z.facelift = false;/g
    var result = regExp.exec(params.res);
    if (result) {
        oldRun(params, callback)
    } else {
        console.log('new'+params.url);
        fs.writeFile('6pmnew.txt',params.res, function (err) {
            if (err) throw err;
        });

        var itemInfo = {
            Unique: '',
            Md5: '',
            Status: 'outOfStock',
            Url: params.url,
            ItemAttributes: {
                Title: '',
                ShopName: "",
                ShopId: "",
                ImageUrl: ""
            },
            Variations: [],
            Items: []
        };

        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
    }
}



function oldRun(params, callback) {
    var regExp = /(\/\/ TODO: use this for more private variables on the page[\s|\S]*?)z.facelift = false;/g
    var result = regExp.exec(params.res);
    //将最核心的页面js 匹配出来进行注入

    try {
        var z = {};
        eval(result[1])
    } catch (exception) {
        console.log("eval:");
        console.log(exception);
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception.message
            }
        });
        return;
    }
 
    if ('undefined' == typeof productId) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'No ProductId'
            }
        });
        return;
    }

    var itemInfo = {
        Unique: 'com.6pm.' + productId,
        Md5: '',
        Status: 'inStock',
        Url: params.url,
        ItemAttributes: {
            Title: subCategory + " " + brandName + " " + productGender + " " + productName,
            ShopName: '6pm',
            ShopId: 'com.6pm',
            ImageUrl: ""
        },
        Variations: [],
        Items: []
    };

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

    var isSize = false; //是否有尺寸参数
    var isWidth = false; //是否有宽度参数

    _(dimensionIdToNameJson).forEach(function(val){
        if(val == 'size'){
            isSize = val;
        }
        if(val == 'width'){
            isWidth = val;
        }
    })

    stockJSON.forEach(function(stockSku){
        var d2 = stockSku.color;     //color
        var d3='';                   //size
        var d4='';                   //width

        if(isSize){
            var d3 = stockSku['d3'];      //size
        }
        if(isWidth){
            var d4 = stockSku['d4'];      //width
        }


        if(typeof styleIds[d2] != 'undefined'){
            //颜色
            if((colorIndex = _.findIndex(color.Values, {ValueId: d2})) == -1){
                colorValueId = d2;
                colorValueName = colorNames[colorValueId];
                colorValueImg  = [];
                var imgOrder = ['p', '1', '2', '3', '4', '5', '6'];
                imgOrder.forEach(function(imgOrderLoop){
                    if (pImgs[styleIds[colorValueId]]['MULTIVIEW'][imgOrderLoop]) {
                        colorValueImg.push(pImgs[styleIds[colorValueId]]['MULTIVIEW'][imgOrderLoop])
                    }
                })

                currentColor = {
                    "ValueId":colorValueId,
                    "Name": colorValueName,
                    "ImageUrls":colorValueImg
                }
                color.Values.push(currentColor);

                colorIndex = color.Values.length -1;
            }



            //尺寸
            console.log(isSize, isWidth)
            if(d3 && (sizeIndex = _.findIndex(size.Values, {ValueId: d3})) == -1){
                sizeValueId = d3;
                sizeValueName = valueIdToNameJSON[sizeValueId].value;
                if(d4) sizeValueName += ' '+valueIdToNameJSON[d4].value;

                currentsize = {
                    "ValueId":sizeValueId,
                    "Name": sizeValueName
                }
                size.Values.push(currentsize);

                sizeIndex = size.Values.length -1;
            }

            //保存商品信息
            if(d3){
                colorId = color.Values[colorIndex].ValueId;
                colorName = color.Values[colorIndex].Name;

                sizeId = size.Values[sizeIndex].ValueId;
                sizeName = size.Values[sizeIndex].Name;

                if(_.findIndex(itemInfo.Items, {Unique: "com.6pm."+d2+'.'+d3}) == -1){
                    itemInfo.Items.push({
                        "Unique":"com.6pm."+d2+'.'+d3,
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
                                "Name":"6pm"
                            },
                            "List":[
                                {
                                    "Price": colorPrices[d2].nowInt,
                                    "Type": "USD"
                                }
                            ]
                        }]
                    })
                }
            }else{
                colorId = color.Values[colorIndex].ValueId;
                colorName = color.Values[colorIndex].Name;
                itemInfo.Items.push({
                    "Unique":"com.6pm."+d2,
                    "Attr":[
                        {
                            "Nid": color.Id,
                            "N":   color.Name,
                            "Vid": colorId,
                            "V":   colorName
                        }
                    ],
                    "Offers": [{
                        "Merchant": {
                            "Name":"6pm"
                        },
                        "List":[
                            {
                                "Price": colorPrices[d2].nowInt,
                                "Type": "USD"
                            }
                        ]
                    }]
                })
            }
        }
    })


    itemInfo.Variations.push(color);
    if(color.Values.length > 0) itemInfo.ItemAttributes.ImageUrl = color.Values[0]['ImageUrls'][0]
    if(isSize) itemInfo.Variations.push(size);

    itemInfo.Md5 = md5(JSON.stringify(itemInfo))
    callback(null, itemInfo);
    return ;
}

/*
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache"
        }
        // proxy: 'http://172.16.13.177:8888'
        //encoding: null
    }, function(error, response, body, callbackStatus) {
        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0) {
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

