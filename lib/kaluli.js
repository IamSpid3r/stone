var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');


exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'www.kaluli.com'){
            var exp = /product\/(\d*)\.html/ig;
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

    var itemInfo = {
        Unique: 'cn.kaluli.' + pid,
        Md5: '',
        Status: 'outOfStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName : '卡路里商城',
            ShopId: 'cn.kaluli',
            ImageUrl: ''
        },
        Variations: [],
        Items: []
    };

    callback(null, itemInfo);
    return ;
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid,
        body = params.body,
        url = params.url;
    var itemInfo = {
        Unique: 'cn.kaluli.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName : '卡路里商城',
            ShopId: 'cn.kaluli',
            ImageUrl: ''
        },
        Variations: [],
        Items: []
    };

    //未获得信息
    if(!body){
        itemInfo.Status = 'outOfStock';
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
    }

    body = JSON.parse(body);

    var types = [];                  //类型
    var item =  body.item;
    var itemSkus = item.itemSkus;

    itemInfo.ItemAttributes.Title = item.title;
    itemInfo.ItemAttributes.ImageUrl = item.pic;

    //不存在下架
    if(typeof body.code == 'undefined' || body.code != 'success' || item.status != 3){
        itemInfo.Status = 'outOfStock';
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
    }


    //数据处理
    _(itemSkus).forEach(function(val){
        if(val.status == 0){
            detail = {
                "Unique":"cn.kaluli."+val.code,
                "Attr":[],
                "Offers": [{
                    "Merchant": {
                        "Name":"kaluli"
                    },
                    "List":[
                        {
                            "Price": val.discountPrice,
                            "Type": "RMB"
                        }
                    ]
                }]
            };

            attrs = val.attr ? JSON.parse(val.attr) : {};
            _(attrs).forEach(function(typeKey, type){
                if((typeIndex = _.findIndex(types, {"Name": type})) == -1){
                    types.push({
                        "Id":  types.length+1 ,
                        "Name": type,
                        "Values":[]
                    });

                    typeIndex = types.length-1;
                }

                if((typeDataIndex = _.findIndex(types[typeIndex].Values, {"Name": typeKey})) == -1){
                    types[typeIndex].Values.push({
                        "ValueId":  types[typeIndex].Values.length+1 ,
                        "Name":typeKey
                    });

                    typeDataIndex = types[typeIndex].Values.length-1;
                }

                detail.Attr.push({
                    "Nid": types[typeIndex].Id,
                    "N":   types[typeIndex].Name,
                    "Vid": types[typeIndex].Values[typeDataIndex].Id,
                    "V":   types[typeIndex].Values[typeDataIndex].Name
                })
            })

            itemInfo.Items.push(detail);
        }
    })

    //没有子商品
    if(itemInfo.Items.length < 1){
        itemInfo.Status = 'outOfStock';
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
    }

    itemInfo.Variations = types;
    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
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
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache"
        }
        // proxy: 'http://172.16.15.137:8888'
        //encoding: null
    }, function(error, response, body){
        if(!error){
            callback(body);
        }else{
            callback(null, error);
        }
    })
}
