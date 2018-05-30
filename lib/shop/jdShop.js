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
    proxyRequest({
        url: urlstr,
        headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.146 Safari/537.36'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }
        var exp1 = /<input[^>]*type=\"hidden\"[^>]*id=\"shop_id\"[^>]*value=\"(\d*)\".*?/ig;
        var  res1 = exp1.exec(body);
        if(res1){
            var  shopId = res1[1];

            getItemInfo(
                {
                    shopId:shopId,
                    page:page,
                    url:urlstr
                },
                callback
            );
        }else{
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'host error is not jd shop hostname'
                }
            });
        }
    })
}

function getItemInfo(params, callback){
    var  page =  Number(params.page);
    var  shopId =  Number(params.shopId);
    var  curl =  params.url;

    var apiUrl = 'https://shop.m.jd.com/search/searchWareAjax.json?r=1527576207657&shopId='+shopId+'&searchPage='+page;
console.log(apiUrl)
    proxyRequest({
        url: apiUrl,
        headers: { 'User-Agent' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        var itemInfo = {
            Unique: 'cn.jd.'+shopId,
            Status: 'inStock',
            Url: curl,
            ItemAttributes: {
                UserId:'',
                ShopId:shopId,
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
        var TotalPage = text.results.totalPage;
        var pageNum = (TotalPage - page) > 2 ? (page+2) : TotalPage; //每次抓取的终止页数

        var urls = [];
        for(var i=page+1; i<=pageNum; i++){
            urls.push('https://shop.m.jd.com/search/searchWareAjax.json?r=1527576207657&shopId='+shopId+'&searchPage='+i);
        }
        console.log(urls)


        //页面抓取信息
        itemInfo.ItemAttributes.TotalPage = TotalPage;
        itemInfo.ItemAttributes.CurrentPage = pageNum;

        //处理抓取的页面json
        var ep = new eventproxy();
        ep.after('currentUrls', urls.length, function (currentItems) {
             currentItems.unshift(text['results']['wareInfo']);
            currentItems.forEach(function(currentItem){
                currentItem.forEach(function(item) {
                    if (item.wareId>0 && item.mPrice ) {
                        items.push({
                            Unique: 'cn.jd.'+item.wareId,
                            Title: item.wname,
                            Img: item.imageurl.replace(/!q70.jpg/,''),
                            Url: 'https://item.jd.com/'+item.wareId+'.html',
                            Price: item.mPrice,
                            Sold: item.totalCount,
                            TotalSoldQuantity: 0
                        })
                    }
                    
                })
            })

            itemInfo.Items = items;
            callback(null,itemInfo);
            return ;
        })

        //并发取数据
        urlProxuRequest = function(currentUrl){
            proxyRequest({
                url:currentUrl,
                headers: { 'User-Agent' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'},
            }, function(err, body) {
                if (err) {
                    callback({
                        "Errors": {
                            'Code': 'error',
                            "Message": err
                        }
                    });
                    return '';
                }

                try{
                    text2 = _.trim(body);
                    text2 = JSON.parse(text2);
                }catch(exception){
                    urlProxuRequest(currentUrl);
                    return;
                }

                ep.emit('currentUrls', text2['results']['wareInfo']);
            })
        }

        urls.forEach(function (currentUrl) {
            urlProxuRequest(currentUrl);
        })
    })
}


/*
 *获取html
 **/
function proxyRequest(options, callback){
    options.headers['Accept'] = 'application/json, text/javascript, */*; q=0.01';
    options.gzip = true;

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