var request = require('request');
var url  = require('url');
var iconv = require('iconv-lite');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'item.yohobuy.com'){
            var exp = /(\d*)\.html/ig;
            var res = exp.exec(urlInfo.path);
            if(res){
                var pid = res[1];
            } else if(urlInfo.path.split('/').length == 2){
                var exp = /p(\d*)\./ig;
                var res = exp.exec(urlInfo.path);
                var pid = res[1];
                var gid = 1;
            } else {
                var sku = urlInfo.path.split('/')[2].split('_');
                var pid = sku[1];       //商品id
                var gid = sku[2];       //商品子ID
            }
        }else{
            throw new Error();
        }
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error'
            }
        });
        return '';
    }

    var mApi = 'https://m.yohobuy.com/product/detail/newinfo';
    getHtml(mApi, {id:pid, goodsId:gid}, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        getItemInfo({
            body:body, pid:pid, url:urlStr
        } , callback);
    })

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid,
        body = params.body,
        url = params.url;
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

    var    goodsInfo = JSON.parse(body);
    var    cartInfo = goodsInfo.cartInfo;

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
function getHtml(urlStr, form, callback){
    proxyRequest({
        url: urlStr,
        form: form
        ,method: 'POST'
        ,headers: {
            'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "X-Requested-With":"XMLHttpRequest"
        }
        ,encoding: null
        ,gzip: true
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
