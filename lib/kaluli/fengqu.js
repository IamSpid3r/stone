/*
var request      = require('request');
var md5          = require('md5');
request.post({
    url: 'https://m.fengqu.com/m.api',
    form: {
        _mt:'product.getItemInfo',
        itemId:45871,
        _aid:'3',
        _sm:'md5',
        _sig:'8679135634522e78f55a2c3fcb8807fb',
    }
}, function (err, response, body) {
    var z = md5('_sm=md5?_mt=product.getItemInfo?itemId=45871?_sm=3')
    console.log(z)
    if (err) {
        console.log('change ip error', err)
    }else{
        console.log(body)
    }
})
*/

var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');

var Q            = require('q');

var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'www.fengqu.com'){
        var patt = /detail\/(.*)\.html/ig;
        result = patt.exec(urlInfo.path);
        if (!result) {
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'url error no math goods id'
                }
            });
            return ;
        }
        var goods_id =  result[1];
        var api_url = 'https://www.fengqu.com/detail/'+ goods_id +'.html'
        getHtml(api_url, function(body, err, response){
            if(err){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return ;
            }
            if(body && response.statusCode == 200){
                var $ = cheerio.load(body);
                var variation = $('#specArea').attr('data-specgroups')
                var items = $('#specArea').attr('data-saleskuspectuplelist')
                var itemInfo = {
                    Unique: 'cn.fengqu.' + goods_id,
                    Md5: '',
                    Status: 'inStock',
                    Url: url,
                    ItemAttributes: {
                        Title: '',
                        ShopName : '风趣海淘',
                        ShopId: 'cn.fengqu',
                        ImageUrl: '',
                        Tax: 1,
                    },
                    Variations: [],
                    Items: []
                };
                // 组装Variations数据
                try{
                    var variations = JSON.parse(variation);
                }catch(e){
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": '未获取到商品的sku信息，商品可能下架'
                        }
                    });
                    return ;
                }
                // var variations = JSON.parse(variation);
                variations.forEach(function (item) {
                    var attr = {}
                    attr.Id = item.specIdOrder
                    attr.Name = item.specName
                    attr.Values = [];
                    var specs = item.specs
                    specs.forEach(function (spec) {
                        var value = {};
                        value.ValueId = spec.specId
                        value.Name = spec.specValue
                        attr.Values.push(value);
                    })
                    itemInfo.Variations.push(attr);
                })
                // 组装items数据
                var items = JSON.parse(items);
                items.forEach(function (item) {
                    var info = {}
                    info.Unique = 'cn.fengqu.' + item.itemId
                    info.attr = []
                    info.Offers =[{
                        "Merchant": {
                            "Name":"fengqu"
                        },
                        "List":[
                            {
                                // "Price": '',
                                "Type": "RMB"
                            }
                        ]
                    }]
                    var skuType = item.skuSpecTuple.specIds //判断是单层sku还是多层sku
                    skuType.forEach(function (skuitem,key) {
                        var val = {}
                        val.Nid = key
                        val.N = itemInfo.Variations[key].Name
                        val.Vid = skuitem
                        var skuId = itemInfo.Variations[key].Values
                        skuId.forEach(function (skuid) {
                            if(skuid.ValueId == skuitem){
                                val.V = skuid.Name
                            }
                        })
                        info.attr.push(val)
                    })
                    var priceSkuId = item.itemId //获取商品价格的ID
                    getPrice(priceSkuId,info)
                    itemInfo.Items.push(info);
                })

                getPrice().then(function () {
                    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                    callback(null, itemInfo);
                    return ;
                })
                // itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                // callback(null, itemInfo);
                // return ;
            }else{
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": 'body null or status code not equal 200'
                    }
                });
                return ;
            }
        })
    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'url error'
            }
        });
        return ;
    }
}
function getPrice(priceSkuId,info) {
    var defer = Q.defer();
    getHtml('https://m.fengqu.com/detail/'+priceSkuId+'.html', function (body, err) {
        if(!err){
            setTimeout(function(){
                try{
                    var $ = cheerio.load(body);
                    var z = $('#itemPrice').html()
                    // console.log(z)
                    // console.log(1221)
                }catch (e){
                    console.log(e)
                }
            },6000);

            // try{
            //     var $ = cheerio.load(body);
            //     var z = $('#itemPrice')
            // }catch (e){
            //     console.log(e)
            // }


        }
        return defer.resolve({});
    })
    return defer.promise;
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
        callback(body, error, response);
    })
}