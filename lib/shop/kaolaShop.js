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

    var apiUrl = 'https://www.kaola.com/category/9694.html?changeContent=isSelfProduct&key=&pageSize=100&pageNo='+page+'&sortfield=0&isStock=false&isSelfProduct=true&isPromote=false&isTaxFree=false&factoryStoreTag=-1&isDesc=true&b=&proIds=&source=false&country=&needBrandDirect=false&isNavigation=0&lowerPrice=-1&upperPrice=-1&backCategory=&headCategoryId=&#topTab';
    proxyRequest({
        url: apiUrl,
        headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.146 Safari/537.36'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        var itemInfo = {
            Unique: 'cn.kaola',
            Status: 'inStock',
            Url: 'https://www.kaola.com',
            ItemAttributes: {
                UserId:'',
                ShopId:'',
                TotalPage: '',
                CurrentPage: ''
            },
            Items: []
        };
        $ = cheerio.load(body); //读取成为jquery对象，可以根据id索引
        var pageString = $(".simplePage .num").text();
        var pageArray = pageString.split('/');
        if (pageArray.length < 2){
            callback('no result');
            return ;
        }
        var productArr = [];
        $('#result .colorsku').each(function(i, elem) {
            var img = $(this).find('.img .imgtag').attr('data-src');
            img = 'https:'+img;
            var url = $(this).find('.titlewrap a').attr('href');
            var unique = url.replace(/\/product\//,'').replace(/\.html/,'');
              productArr[i] = {
                Unique: 'cn.kaola.'+unique,
                Title: $(this).find('h2').text(),
                Img: img.replace(/\?imageView&thumbnail=262x262&quality=90/,''),
                Url: 'https://goods.kaola.com' + url,
                Price: $(this).find('.price .cur').text().replace(/,/,'').replace(/¥/,''),
                Sold: $(this).find('.comments').text() ? $(this).find('.comments').text() : 0,
                TotalSoldQuantity: 0
              }
        });


        var items =[];
        var TotalPage = pageArray[1];
        var pageNum = page; //每次抓取的终止页数

        //页面抓取信息
        itemInfo.ItemAttributes.TotalPage = TotalPage;
        itemInfo.ItemAttributes.CurrentPage = pageNum;

        itemInfo.Items = productArr;
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
   var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
    Q('get').then(function(success){
        var defer = Q.defer();
        request({url:developUrl,timeout:2000}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if(body.status == 'ok'){
                    options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
                    //options.proxy = 'HTTP://172.16.49.5:8888';
                    console.log(options.proxy)
                    defer.resolve('success');
                }
            }else{
                defer.reject('代理服务器错误');
            }
        })
        return defer.promise;
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