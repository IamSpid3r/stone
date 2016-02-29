var request = require('request');
var url  = require('url');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');


exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host != 'www.shihuo.cn'){
            throw new Error();
        }

        var getUrl = 'http://www.shihuo.cn/api/stoneComment/act/shihuoGoods?url='+encodeURIComponent(urlStr);
        getHtml(getUrl, function(body, err){
            if(err){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return '';
            }else{
                getItemInfo(body, callback);
            }
        })
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
        return '';
    }
}

/*
 *内容处理
 **/
function getItemInfo(body, callback) {
    var itemInfo = {
        Unique: 'cn.shihuo.'+body.data.id,
        Status: 'inStock',
        Url: body.data.url,
        ShopUrl : body.data.shopUrl,
        Comments: []
    };

    var comments = [];
    body.data.comments.forEach(function(comment){
        sku = '';
        if(typeof comment.attr.Size != 'undefined'){
            sku += comment.attr.Size;
        }
        if(typeof comment.attr.Color != 'undefined'){
            sku +=' '+comment.attr.Color;
        }

        comments.push({
            'Sku':sku,
            'Date': comment.create,
            'Content': comment.content,
            'Nick':comment.user_name,
            'Photos':comment.imgs,
            'Md5': md5(JSON.stringify(comment.content+comment.user_name+comment.imgs))
        })
    });

    itemInfo.Comments = comments;
    itemInfo.Md5 = md5(JSON.stringify(itemInfo));
    callback(null, itemInfo);
    return '';
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    request({url : urlStr},function(err,response,body){
        if (!err) {
            if(response.statusCode == 200){
                body = JSON.parse(body);
                callback(body);
            }else{
                callback(null, 'Status is'+response.statusCode);
            }
        }else{
            callback(null, err);
        }
    })
}
