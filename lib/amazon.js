var aws = require("aws-lib");
var url = require('url');
var http = require('http');
var https = require('https');
var _ = require('lodash');
var qs = require("querystring");
var utils = require('./utils');
var xml2js = require("xml2js");
var request = require('request');
var Q = require('q');
var md5 = require('md5');
var cheerio = require('cheerio');



exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);

    var patt = /\/(B0[0-9,A-Z]{8})/g;

    result = patt.exec(urlInfo.path);
    if (!result) {
        callback('url error no math ASIN')
        return;
    }
    var asin = result[1];

    var getParentAsin = function(asin) {
        var defer = Q.defer();
        proxyRequest({
            url: 'http://www.amazon.cn/dp/' + asin
        }, function(err, response, body, checkCallbak) {
            if (err) {
                return defer.reject(err);
            }
            checkCallbak(true)
        }, function(err, response, body) {
            if (err) {
                return defer.reject(err);
            }
            var patt = /\"parentAsin\":\"(B0[0-9,A-Z]{8})\"/g;
            result = patt.exec(body);
            if (result) {
                return defer.resolve({
                    parentAsin: result[1],
                    body: body
                });
            } else {
                return defer.resolve({
                    parentAsin: asin,
                    body: body
                });
                // return defer.reject('no find parentAsin');
            }
        })
        return defer.promise;
    }

    getParentAsin(asin).then(function(json) {
        var parentAsin = json.parentAsin;
        // var parentAsin = 'B00X7HO1OO'; 

        //多个key防止出现过多请求禁止
        // var keyLoop = Math.floor(Math.random() * (awsAccessKeyArray.length))
        // var awsAccesskey = awsAccessKeyArray[keyLoop];
        var awsAccesskey = getAssessKey();

        if (urlInfo.host == 'www.amazon.cn') {
            prodAdv = createProdAdvClient(awsAccesskey[0], awsAccesskey[1], 'cn', {
                region: 'cn',
                host: 'webservices.amazon.cn',
                version: '2011-08-01'
            });
        } else {
            callback('url error host www.amazon.cn');
            return;
        }

        var webPageBody = json.body;
        prodAdv.call("ItemLookup", {
            IdType: "ASIN",
            ItemId: parentAsin,
            ResponseGroup: "ItemAttributes,Variations,Offers,Images,OfferFull"
        }, function(err, ProductOriginalData) {
            if (err) {
                callback(err, {});
                return;
            }
            var itemInfo = {
                Unique: 'cn.amazon.' + parentAsin,
                Md5: '',
                Status: 'inStock',
                Url: 'http://www.amazon.cn/gp/product/' + parentAsin + '/',
                ItemAttributes: {
                    Title: ''
                },
                Variations: [],
                Items: []
            }
            // callback(null, {
            //     'itemInfo': itemInfo,
            //     'ProductOriginalData': ProductOriginalData.ItemLookupResponse.Items[0].Item[0]
            // });
            // return;
            // console.log(ProductOriginalData);
            if ('Errors' in ProductOriginalData.ItemLookupResponse.Items[0].Request[0]) {
                if (ProductOriginalData.ItemLookupResponse.Items[0].Request[0].Errors[0].Error[0].Message[0].indexOf('is not a valid value for ItemId') > 0) {
                    itemInfo.Status = 'notFind';
                    callback(null, itemInfo)

                } else if (ProductOriginalData.ItemLookupResponse.Items[0].Request[0].Errors[0].Error[0].Code[0] == 'AWS.ECommerceService.ItemNotAccessible') {
                    //通过网页形式活的iteminfo
                    getItemInfoByWebPage(webPageBody, parentAsin).then(function(itemInfo) {
                        callback(null, itemInfo);
                    }, function(error) {
                        callback({
                            Errors: [{
                                Code: 'getAmazonByWebPageError',
                                Message: 'getAmazonByWebPageError error' + error
                            }]
                        })
                    })

                } else {
                    callback({
                        Errors: [{
                            Code: 'getAmazonApiError',
                            Message: 'getAmazonApi error' + ProductOriginalData.ItemLookupResponse.Items[0].Request[0].Errors[0].Error[0].Message[0]
                        }]
                    })
                }
                return;
            }
            var amzProductData = ProductOriginalData.ItemLookupResponse.Items[0].Item[0];

            itemInfo.ItemAttributes.Title = amzProductData.ItemAttributes[0].Title[0];
            // if(amzProductData.Variations)
            // if()
            //循环亚马逊商品

            
            if ("Variations" in amzProductData) {
                for (var i = 0; i < amzProductData.Variations[0].Item.length; i++) {
                    // itemInfo.Variations[]
                    var amzItem = amzProductData.Variations[0].Item[i];
                    var item = {
                            Unique: "cn.amazon." + amzItem.ASIN[0],
                            Attr: [],
                            Offers: []
                        }
                        //循环当前亚马逊商品的属性
                    for (var j = 0; j < amzItem.VariationAttributes[0].VariationAttribute.length; j++) {
                        var itemAttr = amzItem.VariationAttributes[0].VariationAttribute[j];
                        var index = _.findIndex(itemInfo.Variations, {
                                'Name': itemAttr.Name[0]
                            })
                            //查找当前属性在 熟悉结果中是否存在
                        if (index == -1) {
                            var newAttr = {
                                Id: itemInfo.Variations.length + 1,
                                Name: itemAttr.Name[0],
                                Values: [{
                                    ValueId: (itemInfo.Variations.length + 1) * 1000 + 1,
                                    Name: itemAttr.Value[0]
                                }]
                            }
                            if (itemAttr.Name == 'Color') {
                                newAttr.Values[0].ImageUrl = amzItem.LargeImage[0].URL[0];
                            }
                            itemInfo.Variations.push(newAttr);

                            var attrNid = newAttr.Id;
                            var attrName = newAttr.Name;
                            var attrVid = newAttr.Values[0].ValueId;
                            var attrV = newAttr.Values[0].Name;

                        } else {
                            var nameIndex = _.findIndex(itemInfo.Variations[index].Values, {
                                'Name': itemAttr.Value[0]
                            })
                            if (nameIndex == -1) {
                                var newAttrValue = {
                                    ValueId: (itemInfo.Variations[index].Id) * 1000 + (itemInfo.Variations[index].Values.length + 1),
                                    Name: itemAttr.Value[0]
                                };
                                if (itemAttr.Name == 'Color') {
                                    newAttrValue.ImageUrl = amzItem.LargeImage[0].URL[0];
                                }
                                itemInfo.Variations[index].Values.push(newAttrValue)
                                var attrVid = itemInfo.Variations[index].Values[0].ValueId;
                                var attrV = itemInfo.Variations[index].Values[0].Name;
                            } else {
                                var attrVid = itemInfo.Variations[index].Values[nameIndex].ValueId;
                                var attrV = itemInfo.Variations[index].Values[nameIndex].Name;
                            }
                            var attrNid = itemInfo.Variations[index].Id;
                            var attrName = itemInfo.Variations[index].Name;
                        }
                        item.Attr.push({
                            Nid: attrNid,
                            N: attrName,
                            Vid: attrVid,
                            V: attrV
                        })
                    }
                    var Offer = {
                        "Merchant": {
                            "Name": amzItem.Offers[0].Offer[0].Merchant[0].Name[0]
                        },
                        "List": [{
                            Price: amzItem.Offers[0].Offer[0].OfferListing[0].Price[0].Amount / 100,
                            Type: "RMB"
                        }]
                    }
                    item.Offers.push(Offer);
                    itemInfo.Items.push(item);
                }
            }else{

                //单个商品
                var item = {
                    Unique: "cn.amazon." + parentAsin,
                    Attr: [],
                    Offers: []
                }
                
                var Offer = {
                    "Merchant": {
                        "Name": amzProductData.Offers[0].Offer[0].Merchant[0].Name[0]
                    },
                    "List": [{
                        Price: amzProductData.Offers[0].Offer[0].OfferListing[0].Price[0].Amount / 100,
                        Type: "RMB"
                    }]
                }
                item.Offers.push(Offer);
                itemInfo.Items.push(item);
            }

            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            callback(null, itemInfo);
            // callback(null, {
            //     'itemInfo': itemInfo,
            //     'ProductOriginalData': ProductOriginalData.ItemLookupResponse.Items[0].Item
            // });
        })
    }, function(error) {
        callback({
            Errors: [{
                Code: 'getParentAsinError',
                Message: 'getParentAsin error' + error
            }]
        })
    })
}
var getItemInfoByWebPage = function(webPageBody, parentAsin) {
    var defer = Q.defer();
    setTimeout(function() {
        var itemInfo = {
            Unique: 'cn.amazon.' + parentAsin,
            Md5: '',
            Status: 'inStock',
            Url: 'http://www.amazon.cn/gp/product/' + parentAsin + '/',
            ItemAttributes: {
                Title: ''
            },
            Variations: [],
            Items: []
        }
        var patt = /function\(A, \$, imageBlockATF, cf\){([\s\S]*?)return data;/g;
        result = patt.exec(webPageBody);
        if (!result) {
            return defer.reject('no find title');
        }
        try {
            eval(result[1]);
        } catch (exception) {
            return defer.reject('js error' + exception);
        }
        var itemData = data;
        itemInfo.ItemAttributes.Title = itemData.title;

        var patt = /P\.register\('twister-js-init-mason-data', function\(\) {([\s|\S]*?)return dataToReturn;/
        result = patt.exec(webPageBody);
        if (!result) {
            return defer.reject('no find dataToReturn');
        }
        try {
            eval(result[1]);
        } catch (exception) {
            return defer.reject('js error' + exception);
        }
        // console.log(itemData);
        var itemAttrData = dataToReturn;


        // console.log(itemAttrData);
        // variation_values = {"size_name":["35 (UK 3-)","36","36 (UK 4)","37","37 (UK 4-)","37.5","37.5 (UK 5)","38","38 (UK 5-)","39 (UK 6)","40 (UK 7)"],"color_name":["纯质灰/亮白/粉黄","学院藏青蓝/亮白/浅闪光绿","深靛蓝/深靛蓝/浅闪光橙"]}
        for (i in itemAttrData.variation_values) {
            // "variationDisplayLabels":{"size_name":"尺寸","color_name":"颜色"}
            var itemAttr = {
                Id: itemInfo.Variations.length + 1,
                Name: itemAttrData.variationDisplayLabels[i],
                Values: []
            }
            for (var j = 0; j < itemAttrData.variation_values[i].length; j++) {
                var itemAttrVal = {
                    ValueId: j,
                    Name: itemAttrData.variation_values[i][j]
                };
                itemAttr.Values.push(itemAttrVal);
            };
            itemInfo.Variations.push(itemAttr);
        };
        var asinPromise = [];
        for (i in itemAttrData.asinToDimIndexMapData) {
            asinPromise.push(getSingleItemOffersInfo(i));
            var item = {
                Unique: 'cn.amazon.' + i,
                Attr: [],
                Offers: []
            }
            for (var j = 0; j < itemAttrData.asinToDimIndexMapData[i].length; j++) {
                var attr = {
                    Nid: j + 1,
                    N: itemInfo.Variations[j].Name,
                    Vid: itemAttrData.asinToDimIndexMapData[i][j],
                    V: itemInfo.Variations[j].Values[itemAttrData.asinToDimIndexMapData[i][j]].Name
                }
                item.Attr.push(attr)
            };
            itemInfo.Items.push(item);
        }
        //并行获取全部自商品的数据
        Q.all(asinPromise).then(function(data) {
            for (i in data) {
                var amzProductData = data[i].ItemLookupResponse.Items[0].Item[0];
                var index = _.findIndex(itemInfo.Items, {
                        Unique: 'cn.amazon.' + amzProductData.ASIN
                    })
                    // console.log(amzProductData.Offers[0].Offer[0].OfferListing[0].Price[0].Amount[0]/100)
                    // console.log(amzProductData.Offers[0].Offer[0].Merchant[0].Name[0])
                try {
                    //价格存在的话
                    // console.log(typeof(amzProductData.Offers[0].Offer))
                    if (typeof(amzProductData.Offers[0].Offer) == 'object') {
                        var offer = {
                            Merchant: amzProductData.Offers[0].Offer[0].Merchant[0].Name[0],
                            List: [{
                                Price: amzProductData.Offers[0].Offer[0].OfferListing[0].Price[0].Amount[0] / 100,
                                Type: 'RMB'
                            }]
                        }
                        itemInfo.Items[parseInt(index)].Offers.push(offer)
                    } else {
                        console.log('del' + index)
                            //这个是亚马逊自营无货了
                        itemInfo.Items.splice(index, 1)
                    }
                } catch (e) {
                    console.log('getSingleItemOffersInfo' + e)
                }

            }
            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            return defer.resolve(itemInfo);
        })
    }, 10)
    return defer.promise;
}

function getSingleItemOffersInfo(asin) {
    var defer = Q.defer();
    // var keyLoop = Math.floor(Math.random() * (awsAccessKeyArray.length))
    var awsAccesskey = getAssessKey();
    var prodAdv = createProdAdvClient(awsAccesskey[0], awsAccesskey[1], 'cn', {
        region: 'cn',
        host: 'webservices.amazon.cn',
        version: '2011-08-01'
    });
    prodAdv.call("ItemLookup", {
        IdType: "ASIN",
        ItemId: asin,
        ResponseGroup: "OfferFull"
    }, function(err, ProductOriginalData) {
        if (err) {
            return defer.reject(err);
        }
        return defer.resolve(ProductOriginalData);
    })
    return defer.promise;
}
// function getSingleItemOPriceInfo(asin,parentAsin)
// {
//     var defer = Q.defer();
//     return defer.promise
// }   


var awsAccessKeyArray = [];
// // fu05537337@163.com
awsAccessKeyArray.push(['AKIAJLI3P6QPMBYAJ7FA', 'rNccWDknFN+qph5ETRB/rSxlF59SKYAERUgNQuDI']);
awsAccessKeyArray.push(['AKIAIZKPG3MS5DTWZRMA', 'cdlPAnw5GHf5aqPHUYQd94Km80HxUlb7IpOJ1tkp']);
// kemen230397@163.com
awsAccessKeyArray.push(['AKIAJ32XDMJK4R27YAPA', 'j7ip0ABNlHMIVw+S+ttDtg3Y46R3Zkse5rDtYOQl']);
awsAccessKeyArray.push(['AKIAITYYUHJICYZUJ3LQ', 'SOZfMCv7MJ6sC/rWouiu4hyPFeps0O4TaLFQy9sD']);
// paidu52196763@163.com
awsAccessKeyArray.push(['AKIAIELJZPQQFVATWFLQ', 'K9RlnyE7oBzffVCvJ6B1di5qTfShODV0FMz3THvq']);
awsAccessKeyArray.push(['AKIAIOPWGC7XCKLNSBGA', 'K0RKDGRGwTHSxFXQYL6gOK8dnPAGhq7aKGEtYiH/']);

// zhanxiabuxin@163.com
awsAccessKeyArray.push(['AKIAIOJSFVH5EBLMVBUQ', 'w0YCCaeBrVyKZ7KIrdb4f3QpsiJD+ViTiQfxrwfq']);
awsAccessKeyArray.push(['AKIAIPFVDY3VQJD2J4RA', 'dr8vNnHmxQSpEGJdDXecK3uKmrXWLTXBRP1Iq0T9']);
//wotao638071@163.com
awsAccessKeyArray.push(['AKIAITUPGZSF5WT7U5WA', '1BYOhlTUMiYl8cM1N+o09Y3REVkiJFCsYSP4RgPT']);
awsAccessKeyArray.push(['AKIAIMPL6OIPGSXLE2CA', 'qfjKMQTQpOkxdfbVOJISMdy8fjqdWyBFr0u23HOY']);

//yilanzigubei@163.com
awsAccessKeyArray.push(['AKIAIETM3HKZQLEDQ6IQ', 'umDhZLW0vZ7xBeMsdf++ZX3y9G2Gfv7BelcPqHiw']);
awsAccessKeyArray.push(['AKIAJMDMGN67WA2UZWBA', '4ZUr9eHo64wuEiu4Pq2MKVMTYKC9cbNzQ9//Sube']);

//shijiao790901@163.com
awsAccessKeyArray.push(['AKIAJPDPK6VEIDAZ6AOA', '8pMwqXPJms9sGisB0wOpcyF8wsq2thwmh7eqmd4o']);
awsAccessKeyArray.push(['AKIAJ4LBHGK7IIRCFMNA', 'k7McfIwPbAHnRKY24laRPpmA3PLPq6ftNOf8ifgL']);

//caoliao2292304@163.com
awsAccessKeyArray.push(['AKIAIMYGA4HGDHGCY5VQ', 'QSkCWaKE/mCVoDWw9oAwFLZ6qiiFppFQK4icedPo']);
awsAccessKeyArray.push(['AKIAI7G5XTA24JEFJEGQ', 'oO7xBSmCVVjIZGdt9o5wnHtKFPtydz3C+CI5ZJTi']);
//aozhidu147251@163.com
awsAccessKeyArray.push(['AKIAJ3SDUOZV5STZ52WQ', 'TXHO8i3nV9QW2w0d6LWJdtFqO/Pf7Le7frA3qB4X']);
awsAccessKeyArray.push(['AKIAJ4SRUYSPCFKXD4QA', 'hqCDsx9riFhe4HFwbaeSG3F5fbMPW/YazfVQLOKm']);
//yongjiao9776@163.com
awsAccessKeyArray.push(['AKIAJBKZMNHQNWXKHAUQ', 'PTTf+q/CEpM2GemDrmogzpDcGXArIK2EaHFtMNeR']);
awsAccessKeyArray.push(['AKIAJRZW4SY5YYKNYZ4Q', 'JUl4EhmU2GtN+DdJT5m/cmu6J7mGJEqwZQD5pVat']);
//guatui81372@163.com
awsAccessKeyArray.push(['AKIAJX2PKN7VBOV7UUCQ', 'H5/o/pcA3yQYehXMY46n78ZunwclO4j0v7fgLI0b']);
awsAccessKeyArray.push(['AKIAJRKT3BHQMI3XD6KQ', 'wOM0m+EDYhW5a5hYYqKlWVZ7VQSTkItyfN3tJ/Er']);
//shizi17686@163.com
awsAccessKeyArray.push(['AKIAIRSEO4EMZBPIX6MA', 'CVhPz3yKNWJCxYqByIu27A8sBRwCbIEvdxf1aEA+']);
awsAccessKeyArray.push(['AKIAJDEO4Q33YJKIV6SA', 'P1ekDU3yqS9lT6mWi8JN4ge5SBbTT/msXzxIA/ja']);

awsAccessKeyArray.push(['AKIAJH23B5BLTVD5IUYQ', 'bSfCfLO04aj1sI5+VnGgfIr1cegVv8VedpaPhaZW']);
awsAccessKeyArray.push(['AKIAI5UMDQ4AZLY7OM5A', 'w4Hct1xPZC5km+1DtcM9RkJTiIMEsc+fl4iGAmyX']);
awsAccessKeyArray.push(['AKIAJTCB3B47BZFVYA7A', '/ZAG8117O16TgH1zhY8s78eQk5w809enriN1lBiw']);
awsAccessKeyArray.push(['AKIAIEG4G7W3X3JW5VZA', 'gUBQAobA0y5TA+1NlKUS7XENZ9dm/xmk7HRunwn0']);
awsAccessKeyArray.push(['AKIAJ2I4NE2KMK367CAA', 'TImFtwfxX7orMyHLrs37ukgSE5V2WetwEtu3F3xU']);
awsAccessKeyArray.push(['AKIAIB5AEYADK2PZEIOQ', '3YiwFqCOt2bSjcb10rbIfNTAuzTgRpuaiPyJJqJk']);
awsAccessKeyArray.push(['AKIAI5ZNLN7Z3UJXCDFA', 'o6FxgRaecR+GFaNAxzZhfeq5wwpJHlqgspqXqC3f']);
awsAccessKeyArray.push(['AKIAJXRDJHLN265GY56A', '2mX4dXKV5QxLoqMRqCads3qjuwPKHb4I6bqTOSWf']);
awsAccessKeyArray.push(['AKIAJPMZ5HYOWKXC766A', '5oUE7CdrvipwhYmGjdbR4sjrQgPMrL7KnOGLQBQV']);
var lastAwsAccessId = 0

function getAssessKey()
{
    if(lastAwsAccessId + 1 > awsAccessKeyArray.length)
    {
        lastAwsAccessId = 0;
    }
    return awsAccessKeyArray[lastAwsAccessId++];
}

//亚马逊无须代理请求只需延迟请求
var proxyRequest = function(options, testCallback, callback) {
    var run = function() {
        request('http://60.12.156.242:3333/proxyGet', function(err, response, body) {
            if (err) {
                callback(err)
                return;
            }
            var data = JSON.parse(body);
            // data = {status:"ok",Ip:{Ip:''}}
            // data.Ip.Ip = "222.189.183.119";

            if (data.status == 'notIp') {
                setTimeout(function() {
                    run()
                }, 1000);
                console.log('setTimeout')

                return;
            }
            if (data.Ip.Ip) {
                options.proxy = 'http://' + data.Ip.Ip + ':4321';
                console.log('proxy ' + options.proxy)
                options.timeout = 10000;
                request(options, function(error, response, body) {
                    if (error) {
                        console.log('proxyRequest error' + error);
                        proxyRequest(options, testCallback, callback);
                        return;
                    }
                    //抓取结果进行 testCallback 处理 根据 testCallback 来决定
                    testCallback(error, response, body, function(status, modifyOptions) {
                        if (status == true) {
                            callback(error, response, body)
                        } else {
                            //post error ip
                            console.log('retry')
                                // request.post({
                                //     url:'http://60.12.156.242:3333/proxyDel',
                                //     form:{'ip':data.Ip.Ip}
                                // },function(err,response,body){
                                //     if(err)
                                //     {
                                //         console.log('change ip error',err)
                                //     }
                                //     if(typeof modifyOptions == 'object')
                                //     {
                                //         options = _.assign(options,modifyOptions);
                                //     }
                                //     proxyRequest(options,testCallback,callback);
                                // })
                            proxyRequest(options, testCallback, callback);
                        }
                    }, options)
                })
            }
        })
    }
    run();
}

//
function readCredentials(obj, cb) {
    var lapse = obj.expires == null ? 0 : +new Date() - Date.parse(obj.expires);
    if (obj.secretAccessKey == null || obj.accessKeyId == null || lapse > 0) {
        var md = init();
        md().call({
            endpoint: 'iam/security-credentials/'
        }, function(err, res) {
            if (err) return cb(err);
            if (typeof res === 'undefined') return cb(new Error('metadata API response undefined'));
            md().call({
                    endpoint: 'iam/security-credentials/' + res.split('\n')[0]
                },
                function(err, res) {
                    try {
                        res = JSON.parse(res);
                    } catch (e) {
                        return cb(e);
                    }
                    if (res.SecretAccessKey === null)
                        return cb(new Error("secretAccessKey and accessKeyId not provided and could not be determined."));
                    obj.secretAccessKey = res.SecretAccessKey;
                    obj.accessKeyId = res.AccessKeyId;
                    obj.token = res.Token;
                    obj.expires = res.Expiration;
                    cb(null, obj);
                });
        });
    } else {
        cb(null, obj);
    }
}

function createProdAdvClient(accessKeyId, secretAccessKey, associateTag, options) {
    options = options || {};
    var client = genericAWSClient({
        host: options.host || "ecs.amazonaws.com",
        path: options.path || "/onca/xml",
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        secure: options.secure
    });

    return {
        client: client,
        call: call
    };

    function call(action, query, callback) {
        query["Operation"] = action
        query["Service"] = "AWSECommerceService"
        query["Version"] = options.version || '2009-10-01'
        query["AssociateTag"] = associateTag;
        query["Region"] = options.region || "US"
        return client.call(action, query, callback);
    }
}

function genericAWSClient(obj) {
    var securityToken = obj.token;
    var signHeader = obj.signHeader;
    var host = obj.host;
    var accessKeyId = obj.accessKeyId;
    var path = obj.path;
    var agent = obj.agent;
    var secretAccessKey = obj.secretAccessKey;
    var secure = obj.secure == null ? true : false;
    var connection = secure ? https : http;

    return {
        call: call
    };

    function call(action, query, callback) {
        // Wrap the callback to event it from being called multiple times.
        callback = (function(next) {
            var isCalled = false;
            return function() {
                if (isCalled) return;
                isCalled = true;
                next.apply(null, arguments);
            }
        })(callback)

        // Try to set credentials with metadata API if no credentials provided
        readCredentials(obj, function(err) {
            if (err) return callback(err);
            var date = new Date();
            query = addQueryProperties(query, securityToken, accessKeyId, date);
            var body = qs.stringify(query);
            var headers = createHeaders(host, body.length, date, securityToken, accessKeyId, secretAccessKey);
            sendRequest();
            return;

            function sendRequest() {
                var options = {
                    host: host,
                    path: path,
                    agent: agent,
                    method: 'POST',
                    headers: headers
                };
                options.body = body;
                options.url = (secure ? 'https' : 'http') + '://' + host + path;

                proxyRequest(options, function(err, response, body, checkCallbak) {
                            if (err) {
                                console.log(err)
                            }
                            if (body.indexOf('Please retry your requests at a slower rate') > 0) {
                                console.log(body)
                                checkCallbak(false);
                            } else {
                                checkCallbak(true);
                            }
                        },
                        function(err, response, body) {
                            var parser = new xml2js.Parser();
                            parser.addListener('end', function(result) {
                                if (typeof result != "undefined") {
                                    var err = result.Error || (result.Errors ? result.Errors.Error : null)
                                    if (err) {
                                        callback(new Error(err.Message), result)
                                    } else {
                                        callback(null, result)
                                    }
                                } else {
                                    callback(new Error('Unable to parse XML from AWS.'))
                                }
                            });
                            parser.parseString(body)
                        }
                    )
                    // return;
                    //旧的亚马逊官网的抓取方式
                    // var req = connection.request(options, function (res) {
                    //   var data = '';
                    //   //the listener that handles the response chunks
                    //   res.addListener('data', function (chunk) {
                    //     data += chunk.toString()
                    //   })
                    //   res.addListener('end', function() {
                    //     var parser = new xml2js.Parser();
                    //     parser.addListener('end', function(result) {
                    //       if (typeof result != "undefined") {
                    //         var err = result.Error || (result.Errors ? result.Errors.Error : null)
                    //         if (err) {
                    //           callback(new Error(err.Message), result)
                    //         } else {
                    //           callback(null, result)
                    //         }
                    //       } else {
                    //         callback(new Error('Unable to parse XML from AWS.'))
                    //       }
                    //     });
                    //     parser.parseString(data);
                    //   })
                    //   res.addListener('error', callback)
                    // });
                    // req.write(body)
                    // req.addListener('error', callback)
                    // req.end()
            }
        });
    }

    function addQueryProperties(query, securityToken, accessKeyId, date) {
        var extendedQuery = _.clone(query);
        if (securityToken) extendedQuery["SecurityToken"] = securityToken;
        extendedQuery["Timestamp"] = date.toISOString();
        extendedQuery["AWSAccessKeyId"] = accessKeyId;
        extendedQuery["Signature"] = signQuery(extendedQuery);
        return extendedQuery;
    }

    function createHeaders(host, bodyLength, date, securityToken, accessKeyId, secretAccessKey) {
        var headers = {
            "Host": host,
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "Content-Length": bodyLength
        };

        if (signHeader) {
            headers["Date"] = date.toUTCString();
            if (securityToken !== undefined) headers["x-amz-security-token"] = securityToken;
            headers["x-amzn-authorization"] =
                "AWS3-HTTPS " +
                "AWSAccessKeyId=" + accessKeyId + ", " +
                "Algorithm=HmacSHA256, " +
                "Signature=" + utils.hmacSha256(secretAccessKey, date.toUTCString());
        }
        return headers;
    }

    function signQuery(query) {
        var keys = []
        var sorted = {}

        for (var key in query)
            keys.push(key)

        keys = keys.sort()

        for (var n in keys) {
            var key = keys[n]
            sorted[key] = query[key]
        }
        var stringToSign = ["POST", host, path, qs.stringify(sorted)].join("\n");

        // Amazon signature algorithm seems to require this
        stringToSign = stringToSign.replace(/!/g, "%21");
        stringToSign = stringToSign.replace(/'/g, "%27");
        stringToSign = stringToSign.replace(/\*/g, "%2A");
        stringToSign = stringToSign.replace(/\(/g, "%28");
        stringToSign = stringToSign.replace(/\)/g, "%29");

        return utils.hmacSha256(secretAccessKey, stringToSign);
    }
}