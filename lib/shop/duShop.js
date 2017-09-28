var request = require('request');
var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var fs = require('fs');

exports.getInfo = function(urlstr, page,  callback) {
    getItemInfo(
        {
            page:page
        },
        callback
    );
}

function getItemInfo(params, callback){
    var  page =  Number(params.page);

    var apiUrl = 'https://du.hupu.com/product/skuList?page='+page+'&limit=30';
console.log(apiUrl)
    proxyRequest({
        url: apiUrl,
        headers: { 'User-Agent' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OS X; en-us) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        var itemInfo = {
            Unique: 'cn.du',
            Status: 'inStock',
            Url: 'http://du.hupu.com',
            ItemAttributes: {
                UserId:'',
                ShopId:'',
                TotalPage: '',
                CurrentPage: ''
            },
            Items: []
        };
        // callback(null,body);
        // return ;
        text = _.trim(body);
        text = JSON.parse(text);

        var items =[];
        var TotalPage = text.ItemAttributes.TotalPage;
        var pageNum = text.ItemAttributes.CurrentPage; //每次抓取的终止页数

        //页面抓取信息
        itemInfo.ItemAttributes.TotalPage = TotalPage;
        itemInfo.ItemAttributes.CurrentPage = pageNum;

        text.Items.forEach(function(item) {
            if(item.Price>0){
                items.push({
                        Unique: item.Unique,
                        Title: item.Title,
                        Img: item.Img,
                        Url: item.Url,
                        Price: item.Price,
                        Sold: item.Sold,
                        TotalSoldQuantity: item.TotalSoldQuantity
                    })
                }    
                    
            })

        itemInfo.Items = items;
        callback(null,itemInfo);
        return ;
      
    })
}


/*
 *获取html
 **/
var maxRequestNum = 2;
var requestNum = 0;
function proxyRequest(options, callback){
    options.headers['refer'] = 'http://du.hupu.com';
    options.headers['Accept'] = 'application/json, text/javascript, */*; q=0.01';
    options.headers['User-Agent'] = "Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_1 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Mobile/11d201 MicroMessenger/5.3 shihuo";
    options.headers['X-Requested-With'] = "With:XMLHttpRequest";

    var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
    Q('get').then(function(success){
        // var defer = Q.defer();
        // request({url:developUrl,timeout:2000}, function (error, response, body) {
        //     if (!error && response.statusCode == 200) {
        //         body = JSON.parse(body);
        //         if(body.status == 'ok'){
        //             options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
        //             //options.proxy = 'HTTP://172.16.49.5:8888';
        //             console.log(options.proxy)
        //             defer.resolve('success');
        //         }
        //     }else{
        //         defer.reject('代理服务器错误');
        //     }
        // })
        // return defer.promise;
        return true;
    }).then(function(success){

        request(options,function(error,response,body) {
           // console.log(error)
            if (!error && response.statusCode == 200) {
                callback(null, body, response);
            }else{
                callback(error, null, null);
            }
        })
    },function(rejected){
        callback(rejected, null, null);
    })
}