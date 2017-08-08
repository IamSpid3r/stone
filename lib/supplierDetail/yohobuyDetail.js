var request = require('request');
var url  = require('url');
var iconv = require('iconv-lite');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var Q = require('q');
var proxyRequest = require('../proxyRequest').proxyRequest;
exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        //如果url不对 那么直接返回error
        if(urlInfo.host != 'item.yohobuy.com'){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'Url Error'
                }
            }); return;
        }
        //如果是简单的url 那么就直接抓取
        if(urlInfo.pathname.match(/^\/[\d]+\.html$/ig)) {
            var regExp = /^\/([\d]+)\.html$/ig;
            sku_id = regExp.exec(urlInfo.pathname);
            if(Array.isArray(sku_id) && sku_id[1] != undefined) {
                sku_id = parseFloat(sku_id[1]);
                //开始执行抓取
                crawlDetail(sku_id,urlStr,callback);
            } else {
                callback({
                    Errors: [{
                        Code: 'Error',
                        Message: 'skuid not found'
                    }]
                }); return ;
            }      
        } else {  //如果需要进一步的获取地址
             getMHtml(urlStr).then(function (json) {
                var urlStr = json.urlStr,
                    body = json.body;
                var patt = /(PING_YOU_VIEW_ITEM =[\s|\S]*?;)/;
                var result = patt.exec(body);
                if (!result) {
                    callback({
                        Errors: [{
                            Code: 'Error',
                            Message: 'PING_YOU_VIEW_ITEM not found'
                        }]
                    })
                    return;
                }
                try {
                    eval(result[1]);
                } catch (exception) {
                    callback({
                        Errors: [{
                            Code: 'Error',
                            Message: 'PING_YOU_VIEW_ITEM eval error'
                        }]
                    }); return;
                }
                crawlDetail(PING_YOU_VIEW_ITEM.spu_id,urlStr,callback);
            },function (err) {
                callback({
                    Errors: [{
                        Code: 'Error',
                        Message: 'Get m html' + err
                    }]
                })
            });
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
};


//开始处理页面
function crawlDetail(sku_id,urlStr,callback) {
    var m_url = "https://m.yohobuy.com/product/detail/intro/"+sku_id;
     getHtml({
        url: m_url
        ,method: 'GET'
        ,headers: {
            'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "X-Requested-With":"XMLHttpRequest"
        }
        ,encoding: null
        ,gzip: true
    }, function(err, response, body) {
        if (err) {
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'request api error'
                }
            });
        }
        //分析json
        var body = iconv.decode(body, 'utf-8');
        var $ = cheerio.load(body);
        var imgs = [];
        if($('.pro-detail').length > 0) {
            $('.pro-detail img').each(function(){
                //http://img12.static.yhbimg.com/goodsimg/2017/05/31/16/028b1331155d26fdfe2bc9cae1fa4b0009.jpg?imageMogr2/thumbnail/750x/quality/80/interlace/1
                //http://img12.static.yhbimg.com/goodsimg/2017/05/31/16/028b1331155d26fdfe2bc9cae1fa4b0009.jpg?imageMogr2/thumbnail/750x/quality/80/interlace/1
                var _img = $(this).attr('data-original');
                if(_img != '' && _img != undefined) {
                    var _imgUrl = url.parse(_img);
                    var _img = _imgUrl.protocol+'//'+_imgUrl.host+_imgUrl.pathname;
                    if(!in_array(imgs,_img))  imgs.push(_img);
                }
            });
        }
        itemInfo = {
            Md5: md5('cn.yohobuy.' + sku_id),
            Url:urlStr,
            Status: 'inStock',
            detailImgs:imgs,
        };
        callback(null, itemInfo);
    }); //getHtml end
}


function in_array(arr, str) {
    var i = arr.length;
    while (i--) {
        if (arr[i] === str) {
            return true;
        }
    }
    return false;
}

//获取m站html
function getMHtml(urlStr) {
    var defer = Q.defer();
    getHtml({
        url: urlStr
        ,headers : {
            'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch, gzip",
            "Accept-Language":"zh-CN,zh;q=0.8,en;q=0.6,ja;q=0.4",
            "Cache-Control":"no-cache",
            "Pragma":"no-cache",
        }
        ,encoding: null
        ,gzip: true
    }, function(err, response, body) {
        if (err) {
            return defer.reject(err);
        }
        return defer.resolve({
            urlStr: urlStr,
            body: body
        });
    });
    return defer.promise;
}



/*
 *获取html
 **/
function getHtml(options, callback){
    proxyRequest(options, function(error, response, body, callbackStatus) {
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
        callback(error, response, body);
    })
}

function  gwyy(str) {
    console.log(JSON.stringify(str,null,2));
    process.exit();
}