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
                Title: ''
            },
            Variations: [],
            Items: []
        };

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

        callback({
            "Errors":{
                'Code': 'Error',
                "Message": '6pm new'
            }
        });
        return '';
    }
}



function oldRun(params, callback) {
    var regExp = /(\/\/ TODO: use this for more private variables on the page[\s|\S]*?)z.facelift = false;/g
    var result = regExp.exec(params.res);
    //将最核心的页面js 匹配出来进行注入
    try {
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
            Title: subCategory + " " + brandName + " " + productGender + " " + productName
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


    //是否有尺寸参数
    var isDimensions = false;
    dimensions.forEach(function(val){
        if(dimensionIdToNameJson [val] == 'size'){
            isDimensions = val;
            return ;
        }
    })

    stockJSON.forEach(function(stockSku){
        var d2 = stockSku.color;   //color
        var d3='';      //size
        //var d4='';      //other

        if(isDimensions){
            var d3 = stockSku[isDimensions];      //size
            console.log(d3);
            //var d4 = stockSku.d4;      //other
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
            if(d3 && (sizeIndex = _.findIndex(size.Values, {ValueId: d3})) == -1){
                sizeValueId = d3;
                sizeValueName = valueIdToNameJSON[sizeValueId].value;

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
                colorName = color.Values[colorIndex].name;
                sizeId = size.Values[sizeIndex].ValueId;
                sizeName = size.Values[sizeIndex].name;

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
                colorName = color.Values[colorIndex].name;
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
    if(isDimensions) itemInfo.Variations.push(size);
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
            'X-Forwarded-For': Math.random() * 225 + '.' + Math.random() * 225 + '.' + Math.random() * 225 + '.' + Math.random() * 225
        },
        // proxy: 'http://172.16.13.177:8888'
    }, function(error, response, body, callbackStatus) {
        //如果是限制ip了就返回false
        if(!error){
            if (body.indexOf("The semaphore timeout period has expired") != -1) {
                console.log('again');
                callbackStatus(false)
            } else {
                callbackStatus(true)
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
