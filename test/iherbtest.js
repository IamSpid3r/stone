// 加载http模块
var http = require('https');
// Cheerio 是一个Node.js的库， 它可以从html的片断中构建DOM结构，然后提供像jquery一样的css选择器查询
var cheerio = require('cheerio');
var proxyRequest = require('../lib/proxyRequest').proxyRequest;
var iherb = function () {
    
}

iherb.prototype.getInfo = function(urlStr, callback) {

    getHtml(urlStr, function(body, err, response){
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
            getItemListInfo(body, callback);
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

iherb.prototype.getPageInfo = function(urlStr, callback) {

    getHtml(urlStr, function(body, err, response){
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
            getItemInfo(body, callback);
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

/* 过滤页面信息 */
function getItemInfo(html,callback) {

    if (html) {
        var $ = cheerio.load(html);
        var root = $('#pagetitlewrapper');
        var title = $('#product-summary-header').find('h1').text();
        // var num = $('#product-summary-header').find('div.rating').find('a:eq(2)').find('span').text();
        // console.log(num);
        var type='';
        var proName='';
       root.find('a').each(function (item) {

            if(item ==1){
               proName+=$(this).text();
            }else if(item != 0){
                type+=$(this).text()+'>';
            }
       });
       var flavor='';
       var size='';
        $('.product-grouping-row').each(function (item) {
            if(item == 0){
                flavor+=$(this).find('span').attr('data-current-item');
            }
            if(item == 1){
                size+=$(this).find('span').attr('data-current-item');
            }
            if(!size){
                size = flavor;
                flavor='';
            }

       });


        var price= $('#price').attr('content');

        console.log("品牌="+proName);
        console.log("分类="+type);
        console.log("标题="+title);
        console.log('口味='+flavor);
        console.log('size='+size);
        console.log('price='+price);
        // 轮播图数据
        var data = {};
        data.proName=proName;
        data.type=type;
        data.title=title;
        data.flavor=flavor;
        data.size=size;
        data.price=price;
        callback(null,data);

        return ;
    } else {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'goods not found'
            }
        });
    }
}

function getItemListInfo(html,callback) {

    if (html) {
        // 沿用JQuery风格，定义$
        var $ = cheerio.load(html);
        $('.pannel').find('div').each(function (item) {

            var url = $(this).find('a').atrr('href');
            getHtml(url, function(body, err, response){
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
                    getItemInfo(body  , callback);
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

        });
    } else {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'goods not found'
            }
        });
    }
}

module.exports = iherb;

