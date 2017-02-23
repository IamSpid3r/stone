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
            gridwallPath:'n%2F1j7',
            page:page
        },
        callback
    );
}

function getItemInfo(params, callback){
    var  gridwallPath = params.gridwallPath;
    var  page =  Number(params.page);

    var apiUrl = 'http://m.nike.com/mobile-services/gridwallData?gridwallPath='+gridwallPath+'&country=CN&lang_locale=zh_CN&ipp=24&pn='+page+'&pageNumber='+page+'&cache=true&sl=%E9%9E%8B';
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
            Unique: 'cn.nikestore',
            Status: 'inStock',
            Url: 'http://www.nike.com',
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
        text = _.trimStart(text, 'json(');
        text = _.trimEnd(text, ')');
        text = JSON.parse(text);

        var totalObj = JSON.parse(text.trackingData);

        var items =[];
        var TotalPage = Math.ceil(totalObj.response.totalResults / 24);
        var pageNum = (TotalPage - page) > 2 ? (page+2) : TotalPage; //每次抓取的终止页数

        var urls = [];
        for(var i=page+1; i<=pageNum; i++){
            urls.push('http://m.nike.com/mobile-services/gridwallData?gridwallPath='+gridwallPath+'&country=CN&lang_locale=zh_CN&ipp=24&pn='+i+'&pageNumber='+i+'&cache=true&sl=%E9%9E%8B');
        }
        console.log(urls)

        //页面抓取信息
        itemInfo.ItemAttributes.TotalPage = TotalPage;
        itemInfo.ItemAttributes.CurrentPage = pageNum;

        //处理抓取的页面json
        var ep = new eventproxy();
        ep.after('currentUrls', urls.length, function (currentItems) {
             currentItems.unshift(text.sections[0].products);
            currentItems.forEach(function(currentItem){
                currentItem.forEach(function(item) {
                    var item_id=item.pdpUrl.replace(/.*pgid-(\d+)/, '$1');
                    item_id =parseInt(item_id);
                    if (item_id>0 && item.subtitle.indexOf('足球') == -1 && item.inStock) {
                        var url = item.pdpUrl.replace(/m.nike.com/, 'store.nike.com');
                        items.push({
                            Unique: 'cn.nikestore.' + item_id,
                            Title: item.title,
                            Img: item.spriteSheet,
                            Url: url,
                            Price: item.localPrice.replace(/,/,'').replace(/￥/,''),
                            Sold: item.ratingCount == 'null' ? 0 : item.ratingCount,
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
                headers: { 'User-Agent' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OS X; en-us) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53'},
                encoding: null
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
                    text2 = _.trimStart(text2, 'json(');
                    text2 = _.trimEnd(text2, ')');
                    text2 = JSON.parse(text2);
                }catch(exception){
                    //currentItem = iconv.decode(body, 'utf-8');

                    urlProxuRequest(currentUrl);
                    return;
                }

                ep.emit('currentUrls', text2.sections[0].products);
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
var maxRequestNum = 2;
var requestNum = 0;
function proxyRequest(options, callback){
    options.headers['refer'] = 'http://m.nike.com/cn/zh_cn/pw/%E7%94%B7%E5%AD%90-%E9%9E%8B%E7%B1%BB/7puZoi3';
    options.headers['Accept'] = 'application/json, text/javascript, */*; q=0.01';
    options.headers['User-Agent'] = "Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_1 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Mobile/11d201 MicroMessenger/5.3 shihuo";
    options.headers['X-Requested-With'] = "With:XMLHttpRequest";

    var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
    Q('get').then(function(success){
        var defer = Q.defer();
        request({url:developUrl,timeout:2000}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if(body.status == 'ok'){
                    options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
                    //options.proxy = 'HTTP://172.16.15.139:8888';
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