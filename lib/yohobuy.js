var request = require('request');
var url  = require('url');
var iconv = require('iconv-lite');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var Q = require('q');
var fun = require('./fun');

var proxyRequest = require('./proxyRequest2');

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    var reg1 = /www\.yohobuy\.com\/product\/(\d*)\.html/ig
    var reg2 = /item\.yohobuy\.com\.*?\/p(\d*)\.html/ig
    var reg3 = /item\.yohobuy\.com\/product\/pro_(\d*)_/ig
    var reg4 = /item\.yohobuy\.com\/(\d*)\.html/ig

    var  product_no = null;
    if (res = reg1.exec(urlStr)) {
         product_no = res[1];
    } else {
        if (res = reg2.exec(urlStr)) {
             product_no = res[1];
        } else {
            if (res = reg3.exec(urlStr)) {
                 product_no = res[1];
            } else {
                if (res = reg4.exec(urlStr)) {
                    product_no = res[1];
                }
            }
        }
    }

    if (product_no) {
        var mApi = 'https://m.yohobuy.com/product/detail/newinfo?id='+product_no+'&bundleType=0&from=detail';
        getHtml({
            url: mApi,method: 'GET',headers: {
                'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
                "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                "X-Requested-With":"XMLHttpRequest"
            }
            ,encoding: null
            ,gzip: true
        }, function(err, response, body) {
            if (err) {
                return defer.reject(err);
            }

            //分析json
            getItemInfo({body:body, pid:product_no, url:urlStr} , callback);
        });
    } else {
        callback({
            "Errors":{'Code': 'Error', "Message": 'Url Error'}
        });
        return '';
    }
    return;
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid, body = params.body, url = params.url;
    var body = iconv.decode(body, 'utf-8');

    if(body.indexOf('抱歉，页面不存在') != -1){
        var itemInfo = {
            Unique: 'cn.yohobuy.' + pid,
            Md5: '',
            Status: 'notFind',
            Url: '',
            ItemAttributes: {
                Title: '',
                ShopName: '有货',
                ShopId: 'cn.yohobuy',
                ImageUrl:''
            },
            Variations: [],
            Items: []
        };
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
    }

    if (!fun.isJson(body)) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Json Error'
            }
        });
        return ;
    }

    var   goodsInfo = JSON.parse(body);
    var   cartInfo = goodsInfo.cartInfo;
         // callback(null, goodsInfo);
         // return ;
    var itemInfo = {
        Unique: 'cn.yohobuy.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName: '有货',
            ShopId: 'cn.yohobuy',
            ImageUrl:''
        },
        Variations: [],
        Items: []
    };
    if(cartInfo.goodsInstore == 0){
        itemInfo.Status =  'outOfStock';
        callback(null, itemInfo);
        return ;
    }

    itemInfo.ItemAttributes.Title = goodsInfo.goodsName;
    if(cartInfo.hasOwnProperty('defaultThumb')){
        img = cartInfo.defaultThumb;
        index = img.indexOf('?')
        itemInfo.ItemAttributes.ImageUrl = 'http:'+img.substring(0, index);
    }

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
    var n = j = 0;


    if ('skus' in cartInfo) {
        cartInfo.skus.forEach(function (val) {
            if(val.prop.hasOwnProperty('size')){
                if((sizeIndex = _.findIndex(size.Values, {"Name": val.prop.size.valName})) == -1){
                    //获取所有的尺寸
                    n++;
                    size.Values.push({
                        "ValueId": val.prop.size.valId,
                        "Name": val.prop.size.valName
                    });

                    sizeIndex = size.Values.length -1;
                }
            }

            if(val.prop.hasOwnProperty('color')){
                if((colorIndex = _.findIndex(color.Values, {"Name": val.prop.color.valName})) == -1){
                    //获取所有的尺寸
                    j++;

                    img = val.thumb;
                    index = img.indexOf('?')
                    img = 'http:'+img.substring(0, index);

                    color.Values.push({
                        "ValueId": val.prop.color.valId,
                        "Name": val.prop.color.valName,
                        "ImageUrls":[img]
                    });

                    colorIndex = color.Values.length -1;
                }
            }

            //保存商品信息
            itemContent = {
                "Unique":"cn.yohobuy."+val.skuId,
                "Attr":[
                    {
                        "Nid": color.Id,
                        "N":   color.Name,
                        "Vid": color.Values[colorIndex].ValueId,
                        "V":   color.Values[colorIndex].Name
                    },
                    {
                        "Nid": size.Id,
                        "N":   size.Name,
                        "Vid": size.Values[sizeIndex].ValueId,
                        "V":   size.Values[sizeIndex].Name
                    }
                ],
                "Offers": [{
                    "Merchant": {
                        "Name":"yohobuy"
                    },
                    "List":[
                        {
                            "Price": _.trimStart(goodsInfo.goodsPrice.currentPrice,'¥'),
                            "Type": "RMB"
                        }
                    ]
                }]
            };
            itemInfo.Items.push(itemContent);
        })
    }

    //售罄
    if(itemInfo.Items.length == 0){
        itemInfo.Status =  'outOfStock';
    }

    itemInfo.Variations.push(color);
    itemInfo.Variations.push(size);
    itemInfo.Md5 = md5(JSON.stringify(itemInfo))

    callback(null, itemInfo);
    return ;
}


/*
 *获取html
 **/
function getHtml(options, callback){
    //options.timeout = 6;
    proxyRequest(options,  function(error, response, body) {
        callback(error, response, body);
    })
}
