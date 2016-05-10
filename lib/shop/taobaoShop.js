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
        headers: { 'User-Agent' : 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        var  exp1 = /<meta[^>]*content=\"[^>]*shopId=(\d*)[^>]*userId=(\d*).*?\"/ig;
        var  res1 = exp1.exec(body);

        if(res1){
            var  userId = res1[2];
            var  shopId = res1[1];

            getItemInfo(
                {
                    userId:userId,
                    shopId:shopId,
                    page:page
                },
                callback
            );
        }else{
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'host error is not taobao shop hostname'
                }
            });
        }
    })
}

function getItemInfo(params, callback){
    var  userId = params.userId;
    var  shopId = params.shopId;
    var  page =  Number(params.page);

    var apiUrl = 'https://shop'+shopId+'.m.tmall.com/shop/shop_auction_search.do?' +
        'suid='+userId+'&sort=s&p='+page+'&page_size=24&from=h5&shop_id='+shopId+'&ajson=1&callback=json';
    /*var apiUrl = 'https://xmofs.m.tmall.com/shop/shop_auction_search.do?' +
        'suid='+userId+'&sort=s&p='+page+'&page_size=24&from=h5&shop_id='+shopId+'&ajson=1&_tm_source=tmallsearch&callback=json';*/

    proxyRequest({
        url: apiUrl,
        headers: { 'User-Agent' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OS X; en-us) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        var itemInfo = {
            Unique: 'cn.taobao.'+shopId,
            Status: 'inStock',
            Url: 'https://shop'+shopId+'.taobao.com',
            ItemAttributes: {
                UserId : userId,
                ShopId:  shopId,
                TotalPage: '',
                CurrentPage: ''
            },
            Items: []
        };
       /* callback(null,body);
        return ;*/
        text = _.trim(body);
        text = _.trimStart(text, 'json(');
        text = _.trimEnd(text, ')');
        text = JSON.parse(text);

        var items =[];
        var totalResults = Math.ceil(text.totalResults / 24)
        var pageNum = ( totalResults - page) > 2 ? (page+2) : totalResults; //每次抓取的终止页数
        var urls = [];
        for(var i=(page+1); i<=pageNum; i++){
            urls.push('https://xmofs.m.tmall.com/shop/shop_auction_search.do?' +
            'suid='+userId+'&sort=s&p='+i+'&page_size=24&from=h5&shop_id='+shopId+'&ajson=1&callback=json');
        }

        //页面抓取信息
        itemInfo.ItemAttributes.TotalPage = totalResults;
        itemInfo.ItemAttributes.CurrentPage = pageNum;

        //处理抓取的页面json
        var ep = new eventproxy();
        ep.after('currentUrls', urls.length, function (currentItems) {
            currentItems.unshift(text);
            currentItems.forEach(function(currentItem){

                currentItem.itemsArray.forEach(function(item) {
                    items.push({
                        Unique: 'cn.taobao.' + item.auctionId,
                        Title: item.title,
                        Img: item.picUrl,
                        Url: 'http:' + item.auctionUrl,
                        Price: item.reservePrice,
                        Sold: item.quantity,
                        TotalSoldQuantity: item.totalSoldQuantity
                    })
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

                ep.emit('currentUrls', text2);
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
    options.headers['refer'] = 'https://auxdq.m.tmall.com/shop/shop_auction_search.htm?spm=a320p.7692171.0.0&suid=1035757927&sort=d';
    options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    options.headers['Accept-Encoding'] = "deflate, sdch";
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8";
    options.headers['Cookie'] = "cna=fR+hDeeT50ICATr3cloaZbmD; miid=6345998908287345826; x=e%3D1%26p%3D*%26s%3D0%26c%3D0%26f%3D0%26g%3D0%26t%3D0%26__ll%3D-1%26_ato%3D0; lzstat_uv=8629291913329613887|2144678; tracknick=hxl724753832; _cc_=VT5L2FSpdA%3D%3D; tg=0; thw=cn; v=0; cookie2=1c7bbf9e1215cb87b08ec21f399c6498; t=17cb7c33aba0dc662a5d8eb53fdf6401; uc1=cookie14=UoWxMPWZEssQOQ%3D%3D; _tb_token_=qJoDmUMIJFXz9c3; mt=ci%3D-1_0; l=Ajg4Vmc1KX4VL9QVWo/j-16oiOjKoZwr";

    var developUrl = 'http://121.41.45.190:3333/proxyGet?add=1';
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