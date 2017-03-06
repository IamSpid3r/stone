var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'store.nba.com'){
        getHtml(urlStr, function(body, err){
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
                getItemInfo(body ,callback);
            }else {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": 'Goods Not Found'
                    }
                });
                return ;
            }
        });
    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Host error is not nbastore hostname'
            }
        });
        return ;
    }
}

/*
*内容处理
**/
function getItemInfo(body, callback) {
    var $ = cheerio.load(body);

    var status = $('[property="og:availability"]').attr('content') == 'In Stock' ? 'inStock' : 'outOfStock';
    var product = $('#pdpRightOutsideContainer');
    var id = product.find('[itemprop="serialNumber"]').attr('content');
    var title = product.find('[itemprop="name"]').text();
    var url = product.find('[itemprop="url"]').attr('content');
    var price = _.trim(product.find('[itemprop="price"]').attr('content'),'$');
    var imageUrls = [];
    var itemInfo = {
        Unique: 'com.nbastore.' + id,
        Md5: '',
        Status: status,
        Url: url,
        ItemAttributes: {
            Title: title,
            ShopName : 'nbaStore',
            ShopId: 'com.nbaStore',
            ImageUrl: ''
        },
        Variations: [],
        Items: []
    };

    if(itemInfo.Status == 'outOfStock'){
        callback(null, itemInfo);
        return ;
    }

    var type = {'color':1,'size':2};
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

    $('.sizeChoiceContainer a').each(function(){
         skuId   = $(this).find('.sku').text();
         skuName = $(this).find('.size').text();

        size.Values.push({
            "ValueId": skuId,
            "Name":  skuName
        });

        itemInfo.Items.push({
            "Unique":"com.nbastore."+id+":"+skuName,
            "Attr":[
                {
                    "Nid": color.Id,
                    "N":   color.Name,
                    "Vid": type.color+_.padStart(1, 6, 0),
                    "V":   'Color'
                },
                {
                    "Nid": size.Id,
                    "N":   size.Name,
                    "Vid": skuId,
                    "V":   skuName
                }
            ],
            "Offers": [{
                "Merchant": {
                    "Name":"nbaStore"
                },
                "List":[
                    {
                        "Price": price,
                        "Type": "USD"
                    }
                ]
            }]
        })
    })


    //图片信息
    $('.altImageWrapper img').each(function(){
        imageUrls.push('http:'+_.trimEnd($(this).attr('src'),'35')+'400');
    })
    if($('.pdpImageContainer img').attr('src') && imageUrls.length == 0){
        var pdpImageContainer = 'http:'+$('.pdpImageContainer img').attr('src');
        imageUrls.push(pdpImageContainer);
    }
    if(imageUrls.length > 0){
        color.Values.push({
            "ValueId": type.color+_.padStart(1, 6, 0),
            "Name":  'Color',
            "ImageUrls": imageUrls
        });
    }

    if(imageUrls.length > 0)  itemInfo.ItemAttributes.ImageUrl = imageUrls[0];
    if(itemInfo.Items.length <= 0){//下架
        itemInfo.Status = 'outOfStock';
    }else{
        itemInfo.Variations.push(color);
        itemInfo.Variations.push(size);
        itemInfo.Md5 = md5(JSON.stringify(itemInfo))
    }

    callback(null, itemInfo);
    return ;
}


/*
*获取html
**/
function getHtml(urlStr, callback){
    request({
        url: urlStr,
        headers: {
            'X-Forwarded-For': Math.random()*225 + '.' + Math.random()*225 + '.' + Math.random()*225 + '.' + Math.random()*225,
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36'
        }
        //proxy: 'http://172.16.13.175:8888'
        //encoding: null
    }, function (error, response, body) {
        //如果是限制ip了就返回false
        if(!error && response.statusCode == 200){
            callback(body);
        }else{
            callback(null, error || 'http status not 200');
        }
    })
}