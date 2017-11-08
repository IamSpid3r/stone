var request = require('request');
var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')

var proxyRequest = require('../../proxyRequest').proxyRequest;

exports.getInfo = function(urlstr, callback) {
    //解析url
    var urlInfo = url.parse(urlstr, true);
    if(urlInfo.host == 'www.mia.com' || urlInfo.host == 'www.miyabaobei.hk'){
        getItemInfo(urlInfo, callback);
    } else {
        callback('host error is not mia hostname');
    }
}
// 处理抓取评论
function getItemInfo(urlInfo, callback) {
    var goods_idRegExp = /item-(\d*)\.html/ig;
    var goods_id = goods_idRegExp.exec(urlInfo.pathname);
    if(Array.isArray(goods_id) && goods_id[1] != undefined) {
        goods_id = goods_id[1];
    } else {
        callback("not found goods id");
    }
    //拼装评论url
    // var comment_url = 'https://www.mia.com/item-' + goods_id + '.html';
    var comment_url = 'https://www.mia.com/item/detail/index/'+goods_id+'/1';
    var comment_urls = 'https://www.mia.com/item/detail/index/'+goods_id+'/2';

    var itemInfo = {
        Unique: 'com.jd.'+goods_id,  //店铺数据
        Status: 'inStock',          //状态
        Url: urlInfo.href,              //url
        ShopUrl : 'http://www.jd.com/',  //店铺链接
        Comments: []            //评论数组 默认是空
    };
    //通过代理 获取url
    getHtml(comment_url, function(body, err, response){
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
            // 先抓取首页数据
            var comments = [];
            var urls = [];//更过的链接储存地址
            comments = parseComment(body)

            // 获取页面最大的评论数
            var $ = cheerio.load(body);
            var num = $('.moduleFixed .moFixed ul li:nth-child(2)').text()
            var numRegExp = /\(([0-9]+)\)/ig;
            var Num = numRegExp.exec(num);
            // 最大评论数得到
            var maxNum = Num[1]
            var page = (maxNum > 0) ? Math.ceil(maxNum / 10) : 1;  //最大数 除以 每页10
            page = page > 6 ? 6 : page;
            itemInfo.Comments = comments;
            callback(null,itemInfo);
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
    getHtml(comment_urls, function(body, err, response){
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
            // 先抓取首页数据
            var comments = [];
            comments = parseComment(body)
            itemInfo.Comments = comments;
            console.log(11111)
            callback(null,itemInfo);
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
}
// 解析评论
function parseComment(bodymain) {
    // 将页面转换成可以取到dom的格式
    var comments = [];
    var $ = cheerio.load(bodymain);
    $('.koubei_in').each(function () {
        var userName = $(this).find('.top .photo_txt .pink').text()
        userName = userName.replace(/(^\s*)|(\s*$)/g, "");
        var content = $(this).find('.pinglun_con').text()
        content = content.replace(/(^\s*)|(\s*$)/g, "");
        var guige = $(this).find('.guige').text()
        guige = guige.replace(/(^\s*)|(\s*$)/g, "");
        // 图片部分
        var pic = [];
        $(this).find('.img_product a').each(function () {
            var imgUrl = $(this).find('.kb_pic').attr('src')
            pic.push(imgUrl)
        })
        comments.push({
            'Sku': guige,
            'Date': '',
            'Content': content,
            'Nick': userName,
            'Photos':pic,
            'Md5': md5(content+userName)
        });
    })
    return comments;
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
          //  "Connection":"keep-alive",
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

