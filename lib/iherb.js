var request      = require('request');
var url          = require('url');
var md5          = require('md5');
var _            = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'cn.iherb.com'){
        var patt = /\/([0-9]+)/;

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

        //api url
        var api_url = 'http://cat-api.iherb.cn/v2/pr/gpd?pid='+goods_id;
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
                getItemInfo({body : body, goods_id : goods_id, url:urlStr}  , callback);
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
    }
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.goods_id,
        body = params.body,
        url = params.url;
    var itemInfo = {
        Unique: 'cn.iherb.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName : 'iHerb商城',
            ShopId: 'cn.iherb',
            ImageUrl: '',
            tax:1
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

    itemInfo.ItemAttributes.Title = body.prodName;
    itemInfo.ItemAttributes.ImageUrl = body.frontImg;

    var prodGrpList = body.prodGrpAttList;
    var prodGrpKou=prodGrpList[0];
    var prodGrpSize=prodGrpList[1];
    if(prodGrpKou){
        if(prodGrpSize){
            assemAllData(itemInfo,prodGrpKou,prodGrpSize,body,callback);
        }else{
            assemData(itemInfo,prodGrpKou,callback);
        }
    }else{
        detail = {
            "Unique":"cn.iherb."+pid,
            "Attr":[],
            "Offers": [{
                "Merchant": {
                    "Name":"iherb"
                },
                "List":[
                    {
                        "Price": body.discountedPrice,
                        "Type": "RMB"
                    }
                ]
            }]
        };
        itemInfo.Items.push(detail);
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
    }


}

function assemData(itemInfo,prodGrpKou,callback) {
   var types ={
       "Id":  1 ,
       "Name": prodGrpKou.attributeName,
       "Values":[]
   };

    var index =0;
    _(prodGrpKou.prodGrpAttValues).forEach(function(val){
        detail = {
            "Unique":"cn.iherb."+val.pid,
            "Attr":[],
            "Offers": [{
                "Merchant": {
                    "Name":"iherb"
                },
                "List":[
                    {
                        "Price": val.listPrice,
                        "Type": "RMB"
                    }
                ]
            }]
        };
            types.Values.push({
                "ValueId":index,
                "name":val.attValueName
            });
            detail.Attr.push({
                "Nid": index,
                "N":   prodGrpKou.attributeName,
                "Vid": index,
                "V":   val.attValueName
            });
        index++;
        itemInfo.Items.push(detail);
    });
    itemInfo.Variations = types;
    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
    callback(null, itemInfo);
    
}

function assemAllData(itemInfo,prodGrpKou,prodGrpSize,body,callback) {
    var index =0;
    var kou ={
        "Id":  1 ,
        "Name": prodGrpKou.attributeName,
        "Values":[]
    };

    detail = {
        "Unique":"cn.iherb."+body.pid,
        "Attr":[],
        "Offers": [{
            "Merchant": {
                "Name":"iherb"
            },
            "List":[
                {
                    "Price": body.listPrice,
                    "Type": "RMB"
                }
            ]
        }]
    };

    _(prodGrpKou.prodGrpAttValues).forEach(function(val){

   /*     if(val.isSelectionPossible =='true' && val.isInStock == 'true'){


        }else{

        }*/
        kou.Values.push({
            "ValueId":index,
            "name":val.attValueName
        });

       /* var j=0;
        _(prodGrpSize.prodGrpAttValues).forEach(function (item) {

            detail = {
                "Unique":"cn.iherb."+val.pid+'.'+item.pid,
                "Attr":[],
                "Offers": [{
                    "Merchant": {
                        "Name":"iherb"
                    },
                    "List":[
                        {
                            "Price": item.listPrice,
                            "Type": "RMB"
                        }
                    ]
                }]
            };
            detail.Attr.push({
                "Nid": index,
                "N":   prodGrpKou.attributeName,
                "Vid": index,
                "V":   prodGrpSize.attributeName
            });
            j++;

        });*/

        index++;
    });
    itemInfo.Items.push(detail);
    var k = 0;
    var size ={
        "Id":  1 ,
        "Name": prodGrpSize.attributeName,
        "Values":[]
    };
    _(prodGrpSize.prodGrpAttValues).forEach(function (item) {


        size.Values.push({
            "ValueId":k,
            "name":item.attValueName
        });
        k++;
    });

    itemInfo.Variations.push(kou);
    itemInfo.Variations.push(size);
    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
    callback(null, itemInfo);

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
            "Pragma":"no-cache",
            "IH-pref":"lc=zh-CN;cc=CNY;ctc=CN;"
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


