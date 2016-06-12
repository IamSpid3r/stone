var request = require('request');
var url  = require('url');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host != 'www.shihuo.cn'){
            throw new Error();
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

    var getUrl = 'http://www.shihuo.cn/api/stone/act/shihuoGoods?url='+encodeURIComponent(urlStr);
    getHtml(getUrl, function(body, error){
        if(body){
            getItemInfo(body, callback);
        }else{
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": error
                }
            });
        }
    })
}

/*
 *内容处理
 **/
function getItemInfo(body, callback) {
    if(body.status){
        if(body.type == 2){//识货海淘 
            var interfaceUrl = 'http://localhost:3000/info?url='+encodeURIComponent(body.data.url);
            getHtml(interfaceUrl, function(sbody, error){
                if(!error && sbody.hasOwnProperty('Status')){
                    if( sbody.Status ){
                        callback(null, sbody.Data);
                        return ;
                    }else{
                        callback(sbody.Msg);
                        return ;
                    }
                }else{
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": error
                        }
                    });
                    return ;
                }
            })
        }else if(body.type == 1){//识货自营
            var attr = body.data.attr;
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
            var itemInfo = {
                Unique: 'cn.shihuo.ziyin.' + body.data.id,
                Md5: '',
                Status: body.data.stock,
                Url: body.data.url,
                ItemAttributes: {
                    Title: body.data.title,
                    ShopName : '识货',
                    ShopId: 'cn.shihuo.ziyin',
                    ImageUrl:body.data.img,
                },
                Variations: [],
                Items: []
            };

            var n = j = 0; //标记位
             _(attr).forEach(function(Values, key){
                 _(Values).forEach(function(Value){
                     if(key == 'Size'){
                         j++;
                         size.Values.push({
                             "ValueId": type.size+_.padStart(j, 6, 0),
                             "Name": Value.Size
                         });
                     }else if(key == 'Color'){
                         n++;
                         color.Values.push({
                             "ValueId": type.color+_.padStart(n, 6, 0),
                             "Name": Value.Color,
                             "ImageUrls": [
                                 typeof Value.img != 'undefined' ? Value.img : ''
                             ]
                         });
                     }
                 })
            })


            //保存商品信息
            if(color.Values.length > 0 && size.Values.length > 0){
                color.Values.forEach(function(c){
                    size.Values.forEach(function(s){
                        itemInfo.Items.push({
                            "Unique":"cn.shihuo.ziyin."+c.ValueId+'.'+ s.ValueId,
                            "Attr":[
                                {
                                    "Nid": color.Id,
                                    "N":   color.Name,
                                    "Vid": c.ValueId,
                                    "V":   c.Name
                                },
                                {
                                    "Nid": size.Id,
                                    "N":   size.Name,
                                    "Vid": s.ValueId,
                                    "V":   s.Name
                                }
                            ],
                            "Offers": [{
                                "Merchant": {
                                    "Name":"shihuoZiyin"
                                },
                                "List":[
                                    {
                                        "Price": body.data.price,
                                        "Type": "RMB"
                                    }
                                ]
                            }]
                        })
                    })
                })
            }else if(color.Values.length > 0){
                color.Values.forEach(function(c){
                    itemInfo.Items.push({
                        "Unique":"cn.shihuo.ziyin."+ c.ValueId,
                        "Attr":[
                            {
                                "Nid": color.Id,
                                "N":   color.Name,
                                "Vid": c.ValueId,
                                "V":   c.Name
                            }
                        ],
                        "Offers": [{
                            "Merchant": {
                                "Name":"shihuoZiyin"
                            },
                            "List":[
                                {
                                    "Price": body.data.price,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    })
                })
            }else if(size.Values.length > 0){
                size.Values.forEach(function(s){
                    itemInfo.Items.push({
                        "Unique":"cn.shihuo.ziyin."+ s.ValueId,
                        "Attr":[
                            {
                                "Nid": size.Id,
                                "N":   size.Name,
                                "Vid": s.ValueId,
                                "V":   s.Name
                            }
                        ],
                        "Offers": [{
                            "Merchant": {
                                "Name":"shihuoZiyin"
                            },
                            "List":[
                                {
                                    "Price": body.data.price,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    })
                })
            }else{
                itemInfo.Items.push({
                    "Unique":"cn.shihuo.ziyin."+body.data.id,
                    "Attr":[],
                    "Offers": [{
                        "Merchant": {
                            "Name":"shihuoZiyin"
                        },
                        "List":[
                            {
                                "Price": body.data.price,
                                "Type": "RMB"
                            }
                        ]
                    }]
                })
            }


            itemInfo.Variations.push(color);
            itemInfo.Variations.push(size);
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null, itemInfo);
            return ;
        }else if(body.type == 4){//识货团购
            var interfaceUrl = 'http://localhost:3000/info?url='+encodeURIComponent(body.data.url);
            getHtml(interfaceUrl, function(sbody, error){
                if(!error && sbody.hasOwnProperty('Status')){
                    if( sbody.Status ){
                        callback(null, sbody.Data);
                    }else{
                        callback(sbody.Msg);
                    }
                }else{
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": error
                        }
                    });
                }
            })
        }else{
            var itemInfo = {
                Unique: 'cn.shihuo.' + body.data.id,
                Md5: '',
                Status: 'outOfStock',
                Url: body.data.url,
                ItemAttributes: {},
                Variations: [],
                Items: []
            };

            callback(null, itemInfo);
            return ;
        }
    }else{
        var itemInfo = {
            Unique: 'cn.shihuo.' + body.data.id,
            Md5: '',
            Status: 'outOfStock',
            Url: body.data.url,
            ItemAttributes: {},
            Variations: [],
            Items: []
        };

        callback(null, itemInfo);
        return ;
    }
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    request({url : urlStr},function(err,response,body){
        if (!err && response.statusCode == 200) {
            body = JSON.parse(body);
            callback(body);
        }else{
            callback(null ,err || 'get error');
        }
    })
}
