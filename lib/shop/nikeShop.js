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
            //gridwallPath:'%252525E9%2525259E%2525258B%252525E7%252525B1%252525BB%2Foi3',
            gridwallPath:'-/7puZoi3',
            page:page
        },
        callback
    );
}

function getItemInfo(params, callback){
    var  gridwallPath = params.gridwallPath;
    var  page =  Number(params.page);

    var apiUrl = 'https://m.nike.com/mobile-services/gridwallData?gridwallPath=%2525E7%252594%2525B7%2525E5%2525AD%252590-%2525E9%25259E%25258B%2525E7%2525B1%2525BB%2F7puZoi3&country=CN&lang_locale=zh_CN&ipp=60&pn='+page+'&pageNumber='+page+'&anchor=144&cache=true';
    //var apiUrl = 'https://m.nike.com/mobile-services/gridwallData?gridwallPath=%2525E7%252594%2525B7%2525E5%2525AD%252590-%2525E9%25259E%25258B%2525E7%2525B1%2525BB%2F7puZoi3&country=CN&lang_locale=zh_CN&ipp=12&pn=13&pageNumber=13&anchor=144&cache=true';
    //var apiUrl = 'https://store.nike.com/html-services/gridwallData?country=CN&lang_locale=zh_CN&gridwallPath='+gridwallPath+'&pn='+page;
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
        var TotalPage = Math.ceil(totalObj.response.pageCount);
        // var pageNum = (TotalPage - page) > 2 ? (page+2) : TotalPage; //每次抓取的终止页数
        // var TotalPage = 9;

        var urls = [];
        // for(var i=page+1; i<=pageNum; i++){
        //      urls.push('https://store.nike.com/html-services/gridwallData?country=CN&lang_locale=zh_CN&gridwallPath='+gridwallPath+'&pn='+i);
        //     //urls.push('https://m.nike.com/mobile-services/gridwallData?gridwallPath='+gridwallPath+'&country=CN&lang_locale=zh_CN&ipp=24&pn='+i+'&pageNumber='+i+'&cache=true');
        // }
        urls.push('https://m.nike.com/mobile-services/gridwallData?gridwallPath=%2525E5%2525A5%2525B3%2525E5%2525AD%252590-%2525E9%25259E%25258B%2525E7%2525B1%2525BB%2F7ptZoi3&country=CN&lang_locale=zh_CN&ipp=60&pn='+page+'&pageNumber='+page+'&anchor=12&cache=true');
           
        console.log(urls)

        //页面抓取信息
        itemInfo.ItemAttributes.TotalPage = TotalPage;
        itemInfo.ItemAttributes.CurrentPage = page;

        //处理抓取的页面json
        var ep = new eventproxy();
        ep.after('currentUrls', urls.length, function (currentItems) {
             currentItems.unshift(text.sections[0].items);
            currentItems.forEach(function(currentItem){
                currentItem.forEach(function(item) {
                    var item_id=item.pdpUrl.replace(/.*pgid-(\d+)/, '$1');
                    item_id =parseInt(item_id);
                    var other_id=item.pdpUrl.replace(/.*pbid=(\d+)/, '$1');
                    other_id =parseInt(other_id);
                    var letter = '';
                    if (!item_id && !other_id && item.pdpUrl.indexOf('\:\/\/www.nike.com\/cn\/t\/') > -1){
                            letter=item.pdpUrl.replace(/https\:\/\/www.nike.com\/cn\/t\//, '');
                            if (letter) letter = md5(letter);
                    }
                    if ((item_id>0 || other_id>0 || letter) && item.inStock) {
                        var url = item.pdpUrl.replace(/m.nike.com/, 'store.nike.com');
                        if (item_id>0){
                            var unique ='cn.nikestore.' + item_id;
                        } else if(other_id> 0){
                            var unique ='cn.nikestore.other.' + other_id;
                        } else if(letter){
                            var unique ='cn.nikestore.letter.' + letter;
                        }
                        items.push({
                            Unique: unique,
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

                if (text2.sections != undefined){
                    ep.emit('currentUrls', text2.sections[0].items);
                } else {
                    ep.emit('currentUrls', []);
                }
                
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
    options.headers['refer'] = 'https://m.nike.com/cn/zh_cn/pw/%2525E9%25259E%25258B%2525E7%2525B1%2525BB/oi3?redirect=true&vst=%25E9%259E%258B%25E5%25AD%2590&ipp=24';
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