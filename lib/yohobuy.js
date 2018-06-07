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
    var reg1 = /(\d*)\.html/ig
    var reg2 = /item\.yohobuy\.com\/product\/pro_(\d*)_/ig

    var res = reg1.exec(urlStr);
    var  product_no = null;
    if (res) {
         product_no = res[1];
    } else {
        res = reg2.exec(urlStr)
        if (res) {
             product_no = res[1];
        }
    }

    if (product_no) {
         (async () => {
            try {
                var mApi = 'https://m.yohobuy.com/product/detail/newinfo?id='+product_no+'&productSkn='+product_no+'&bundleType=0&from=detail';
                var body = await getHtml (mApi);

                getItemInfo({body:body, pid:product_no, url:urlStr} , callback);
            } catch (e) {
                return callback({
                    "Errors":{'Code': 'Error', "Message": e.message}
                });
            }
         }) ()
    } else {
        return callback({
            "Errors":{'Code': 'Error', "Message": 'Url Error'}
        });
    }
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid, body = params.body, url = params.url;

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
        return callback(null, itemInfo);
    }

    if (!fun.isJson(body)) {
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Json Error'
            }
        });
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



//获取html
function getHtml(urlStr) {
    let options = {
        url: urlStr,
        timeout: 5000,
        gzip: true,
        //encoding : null,
        headers: {
             method: 'GET',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            "Accept-Encoding": "deflate,sdch",
            "Accept-Language": " zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://m.yohobuy.com/product/51640606.html",
            "Cookie" : '_perfLog=%5B%5D; udid=5f1315d5-ba43-4c0f-bdaf-54d6391e8111; yohobuy_session_cookie=iMtmOSpkrwREWkrgoTz2CQ.Q7pmHZh9EUbOeRh7HpUOcg65XY87N6BGwhlMUiWUO5RS4R9y_t1EdMnNoc0euKVRg3DGUb0y8qGW8eHnuwj73oXsAcZxaIyWyDKLYYG1FSpgU7EiDYM8y6Jyq4s72FclaOPTqWKkDY6pvsPbm_yPySOQXuKjCJGcVY03F6X36Mk2dTg3Dl1PB4Eba_QqVZoA.1528337856727.86400000.bLJQb3TKUYGB9YH_CwEnWfWi-3kdZjr8IakqBTonNSo; yohobuy_session=s%3AxBMNbHhbq6dDL_Pwukz8epusAm96oDUe.mGFq%2B9NC6PU%2FjH4RSZePQ2p2zT%2BiKzDzyfuZzYylmjI; _Channel=boys; _yasvd=734421507; mkt_code=100000000008047; Hm_lvt_65dd99e0435a55177ffda862198ce841=1528337862; __utma=69251608.1283501962.1528337862.1528337862.1528337862.1; __utmc=69251608; __utmz=69251608.1528337862.1.1.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); _ga=GA1.2.1283501962.1528337862; _gid=GA1.2.325664226.1528337862; _Gender=1%2C3; _jzqa=1.2852072825422270000.1528337887.1528337887.1528337887.1; _jzqc=1; _jzqx=1.1528337887.1528337887.1.jzqsr=yohobuy%2Ecom|jzqct=/shop/vans-1284%2Ehtml.-; _jzqckmp=1; _browseskn=51640606%2C51394956%2C51623636%2C51608586%2C51853042; ajaxreqid=a8205630-c56f-4713-b8d7-f46ae71bfb19; _pzfxuvpc=1528337861732%7C6553940432925562972%7C14%7C1528341540539%7C2%7C1187717160728990499%7C5352220988789582474; _pzfxsvpc=5352220988789582474%7C1528341540532%7C1%7C; Hm_lpvt_65dd99e0435a55177ffda862198ce841=1528341541; _gat=1; docreqid=e5a1db78-8032-4bda-b2fb-36ead4120270'
        }
    };
    return new Promise((resolve, reject) => {
        proxyRequest(options, function (err, response, body) {
            if (err) {
                reject(err);
            } else {
                resolve(body)
            }
        })
    })
}
