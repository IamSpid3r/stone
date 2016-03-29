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
var awsAccessKeyArray = require('./amazonAccessKeys').awsAccessKeyArray;



exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);

    var patt = /\/(B0[0-9,A-Z]{8})/g;

    result = patt.exec(urlInfo.path);
    if (!result) {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'url error no math ASIN'
            }
        });
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
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'url error host www.amazon.cn'
                }
            });
            return;
        }

        var webPageBody = json.body;
        prodAdv.call("ItemLookup", {
            IdType: "ASIN",
            ItemId: parentAsin,
            ResponseGroup: "ItemAttributes,Variations,Offers,Images,OfferFull"
        }, function(err, ProductOriginalData) {
            if (err) {
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message":err
                    }
                });

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
            //     'ProductOriginalData': ProductOriginalData
            // });
            // return;
            // console.log(ProductOriginalData);
            if ('Errors' in ProductOriginalData.Items.Request) {
                if (ProductOriginalData.Items.Request.Errors.Error.Message.indexOf('is not a valid value for ItemId') > 0) {
                    itemInfo.Status = 'notFind';
                    callback(null, itemInfo)

                } else if (ProductOriginalData.Items.Request.Errors.Error.Code == 'AWS.ECommerceService.ItemNotAccessible') {
                    //通过网页形式活的iteminfo
                    // console.log('fetch page')
                    getItemInfoByWebPage(webPageBody, parentAsin).then(function(itemInfo) {
                        callback(null, itemInfo);
                    }, function(error) {
                        callback({
                            Errors: [{
                                Code: 'Error',
                                Message: 'getAmazonByWebPageError error' + error
                            }]
                        })
                    })

                } else {
                    callback({
                        Errors: [{
                            Code: 'Error',
                            Message: 'getAmazonApi error' + ProductOriginalData.Items.Request.Errors.Error.Message
                        }]
                    })
                }
                return;
            }
            var amzProductData = ProductOriginalData.Items.Item;

            itemInfo.ItemAttributes.Title = amzProductData.ItemAttributes.Title;
            // if(amzProductData.Variations)
            // if()
            //循环亚马逊商品


        if ('Variations' in amzProductData && 'Item' in amzProductData.Variations && amzProductData.Variations.Item instanceof Array) {
                for (var i = 0; i < amzProductData.Variations.Item.length; i++) {
                    // itemInfo.Variations[]
                    var amzItem = amzProductData.Variations.Item[i];
                    if(!("Offers" in amzItem))
                    {
                        continue;
                    }
                    var item = {
                            Unique: "cn.amazon." + amzItem.ASIN,
                            Attr: [],
                            Offers: []
                        }
                    //循环当前亚马逊商品的属性
                    if ('Name' in amzItem.VariationAttributes.VariationAttribute) {
                        //如果是一个就转换成数组
                        amzItem.VariationAttributes.VariationAttribute = [amzItem.VariationAttributes.VariationAttribute]
                    }
                    for (var j = 0; j < amzItem.VariationAttributes.VariationAttribute.length; j++) {
                        var itemAttr = amzItem.VariationAttributes.VariationAttribute[j];
                        var index = _.findIndex(itemInfo.Variations, {
                                'Name': itemAttr.Name
                            })
                            //查找当前属性在 熟悉结果中是否存在
                        if (index == -1) {
                            var newAttr = {
                                Id: itemInfo.Variations.length + 1,
                                Name: itemAttr.Name,
                                Values: [{
                                    ValueId: (itemInfo.Variations.length + 1) * 1000 + 1,
                                    Name: itemAttr.Value
                                }]
                            }
                            if (itemAttr.Name == 'Color' && 'LargeImage' in amzItem ) {
                                newAttr.Values[0].ImageUrls = [amzItem.LargeImage.URL];
                            }
                            itemInfo.Variations.push(newAttr);

                            var attrNid = newAttr.Id;
                            var attrName = newAttr.Name;
                            var attrVid = newAttr.Values.ValueId;
                            var attrV = newAttr.Values.Name;

                        } else {
                            var nameIndex = _.findIndex(itemInfo.Variations[index].Values, {
                                'Name': itemAttr.Value
                            })
                            if (nameIndex == -1) {
                                var newAttrValue = {
                                    ValueId: (itemInfo.Variations[index].Id) * 1000 + (itemInfo.Variations[index].Values.length + 1),
                                    Name: itemAttr.Value
                                };
                                if (itemAttr.Name == 'Color' && 'LargeImage' in amzItem ) {
                                    newAttrValue.ImageUrls = [amzItem.LargeImage.URL];
                                }
                                itemInfo.Variations[index].Values.push(newAttrValue)
                                var attrVid = newAttrValue.ValueId;
                                var attrV = newAttrValue.Name;
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
                            "Name": amzItem.Offers.Offer.Merchant.Name
                        },
                        "List": [{
                            Price: amzItem.Offers.Offer.OfferListing.Price.Amount / 100,
                            Type: "RMB"
                        }]
                    }
                    item.Offers.push(Offer);
                    itemInfo.Items.push(item);
                }
            } else if('Variations' in amzProductData && 'Item' in amzProductData.Variations){
                if(amzProductData.Offers.TotalOffers > 0){
                    //单个商品
                    var item = {
                        Unique: "cn.amazon." + parentAsin,
                        Attr: [],
                        Offers: []
                    }

                    var Offer = {
                        "Merchant": {
                            "Name": amzProductData.Variations.Item.Offers.Offer.Merchant.Name
                        },
                        "List": [{
                            Price: amzProductData.Variations.Item.Offers.Offer.OfferListing.Price.Amount / 100,
                            Type: "RMB"
                        }]
                    }
                    item.Offers.push(Offer);
                    itemInfo.Items.push(item);
                }else{//售罄
                    itemInfo.Status = 'outOfStock';
                }
            }else{
                if(amzProductData.Offers.TotalOffers > 0){
                    //单个商品
                    var item = {
                        Unique: "cn.amazon." + parentAsin,
                        Attr: [],
                        Offers: []
                    }

                    var Offer = {
                        "Merchant": {
                            "Name": amzProductData.Offers.Offer.Merchant.Name
                        },
                        "List": [{
                            Price: amzProductData.Offers.Offer.OfferListing.Price.Amount / 100,
                            Type: "RMB"
                        }]
                    }
                    item.Offers.push(Offer);
                    itemInfo.Items.push(item);
                }else{//售罄
                    itemInfo.Status = 'outOfStock';
                }
            }

            itemInfo.Variations = getVariationsName(itemInfo.Variations);
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
                Code: 'Error',
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
        itemInfo.Variations =  _.reverse(itemInfo.Variations);//倒序

        var asinPromise = [];
        //callback(itemInfo.Variations);return ;
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
                var amzProductData = data[i].Items.Item;
                var index = _.findIndex(itemInfo.Items, {
                        Unique: 'cn.amazon.' + amzProductData.ASIN
                    })
                    // console.log(amzProductData.Offers[0].Offer[0].OfferListing[0].Price[0].Amount[0]/100)
                    // console.log(amzProductData.Offers[0].Offer[0].Merchant[0].Name[0])
                try {
                    //价格存在的话
                    // console.log(typeof(amzProductData.Offers[0].Offer))
                    if (typeof(amzProductData.Offers.Offer) == 'object') {
                        var offer = {
                            Merchant: amzProductData.Offers.Offer.Merchant.Name,
                            List: [{
                                Price: amzProductData.Offers.Offer.OfferListing.Price.Amount / 100,
                                Type: 'RMB'
                            }]
                        }
                        itemInfo.Items[parseInt(index)].Offers.push(offer)
                    } else {
                        // console.log('del' + index)
                            //这个是亚马逊自营无货了
                        itemInfo.Items.splice(index, 1)
                    }
                } catch (e) {
                    console.log('getSingleItemOffersInfo' + e)
                }
            }
            itemInfo.Variations = getVariationsName(itemInfo.Variations);
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
        request('http://121.41.45.190:3333/proxyGet', function(err, response, body) {
            if (err) {
                callback(err);
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
                //options.proxy = 'http://' + data.Ip.Ip + ':4321';
                options.timeout = 10000;
                request(options, function(error, response, body) {
                    if(error)
                    {
                        console.log('proxyRequest error'+error);
                        proxyRequest(options,testCallback,callback);
                        return;
                    }
                    if(body.indexOf('COW Proxy') != -1)
                    {
                        console.log('COW Proxy error');
                        proxyRequest(options,testCallback,callback);
                        return;
                    }
                    //抓取结果进行 testCallback 处理 根据 testCallback 来决定
                    testCallback(error, response, body, function(status, modifyOptions) {
                        if (status == true) {
                            callback(error, response, body)
                        } else {
                            // console.log('retry')
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
                                        callback({
                                            "Errors":{
                                                'Code': 'Error',
                                                "Message": err.Message
                                            }
                                        });
                                    } else {
                                        callback(null, result)
                                    }
                                } else {
                                    callback({
                                        "Errors":{
                                            'Code': 'Error',
                                            "Message": 'Unable to parse XML from AWS.'
                                        }
                                    });
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

var getVariationsName = function(Variations){
    Variations.forEach(function(Variation){
        Variation.Name =
            (Variation.Name == 'Color' || Variation.Name == '颜色')
            ? '颜色'
            : (
                (Variation.Name == 'Size' || Variation.Name == '尺寸')
                ? '尺码'
                : Variation.Name
              );
    })

    return Variations;
}