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
    var  gridwallPath = params.gridwallPath;
    var  page =  Number(params.page);
    var type = params.Type;

    var apiUrl = 'https://www.amazon.cn/s/ref=sr_nr_p_6_0?fst=as%3Aoff&rh=n%3A2029189051%2Cn%3A%212112205051%2Cn%3A%212118806051%2Cn%3A%212118815051%2Cn%3A2134348051%2Cp_n_fulfilled_by_amazon%3A326314071%2Cp_6%3AA1AJ19PSB66TGU&page='+page+'&bbn=2134348051&ie=UTF8&qid=1487667443&rnid=51336071';

    proxyRequest({
        url: apiUrl,
        headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:51.0) Gecko/20100101 Firefox/51.0'}
        //headers: { 'User-Agent' : 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OS X; en-us) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        var itemInfo = {
            Unique: 'cn.amazon',
            Status: 'inStock',
            Url: 'https://www.amazon.cn',
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

        $ = cheerio.load(body);
        //var total =$('#s-slick-result-header').text();
        var total =$('#s-result-count').text();
        total=_.trim(total.replace(/.*共([\d,]+)条[\s].*[\n\s]*.*[\s\n]*.*/, '$1'));
        total=total.replace(/,/,'');
        //var result = [];

        //var patt = /\/(B0[0-9,A-Z]{8})/ig;


        // $('#resultsCol ul li').each(function(i, elem) {
        //     var asin = $(this).attr('data-asin');
        //     var src = $(this).find('img').attr('src');
        //     src = src.replace('_SL200_SY260_CR0,0,200,260_.','');
        //     var sold = $(this).find('.a-spacing-top-mini a.a-size-small').text();
        //     var title = $(this).find('h2').text();
        //     if (asin && src && title.indexOf('足球') == -1){
        //         result.push({
        //             Unique: 'cn.amazon.' + asin,
        //             Title: title,
        //             Img: src,
        //             Url: 'http://www.amazon.cn/dp/' + asin, 
        //             Price: $(this).find('span').eq(1).text().replace(/￥/,'').replace(/[\s\-].*/,''),
        //             Sold: sold ? sold : '',
        //             TotalSoldQuantity: 0
        //         })
        //     }
            
        // });


        var items =[];
        var TotalPage = Math.ceil(total / 48);

        var urls = [];
        urls.push('https://www.amazon.cn/s/ref=sr_nr_p_6_0?fst=as%3Aoff&rh=n%3A2029189051%2Cn%3A%212112205051%2Cn%3A%212118806051%2Cn%3A%212118815051%2Cn%3A2118816051%2Cp_n_fulfilled_by_amazon%3A326314071%2Cp_6%3AA1AJ19PSB66TGU&page='+page+'&bbn=2118816051&ie=UTF8&qid=1487660708&rnid=51336071');
        if (page < 5){
            urls.push('https://www.amazon.cn/s/ref=sr_nr_p_6_0?fst=as%3Aoff&rh=n%3A2029189051%2Cn%3A%212146652051%2Cn%3A%212146654051%2Cn%3A159140071%2Cp_n_fulfilled_by_amazon%3A326314071%2Cp_6%3AA1AJ19PSB66TGU&page='+page+'&bbn=159140071&ie=UTF8&qid=1487667865&rnid=51336071');
        }

        console.log(urls)

        //页面抓取信息
        itemInfo.ItemAttributes.TotalPage = TotalPage;
        itemInfo.ItemAttributes.CurrentPage = page;

        if(!total){
            itemInfo.Items = [];
            callback(null,itemInfo);
            return ;
        }

        //处理抓取的页面json
        var ep = new eventproxy();
        ep.after('currentUrls', urls.length, function (currentItems) {
             currentItems.unshift(body);
            currentItems.forEach(function(currentItem){
                var $ = cheerio.load(currentItem);
                var total =$('#s-result-count').text();
                total=_.trim(total.replace(/.*共([\d,]+)条[\s].*[\n\s]*.*[\s\n]*.*/, '$1'));
                total=total.replace(/,/,'');
                if (total > 0){
                    $('#resultsCol ul li').each(function(i, elem) {
                        var asin = $(this).attr('data-asin');
                        var src = $(this).find('img').attr('src');
                        src = src.replace('_SL200_SY260_CR0,0,200,260_.','');
                        var sold = $(this).find('.a-spacing-top-mini a.a-size-small').text();
                        var title = $(this).find('h2').text();
                        var price = $(this).find('span').eq(1).text().replace(/￥/,'').replace(/[\s\-].*/,'').replace(/,/,'');

                        if (asin && src && title.indexOf('足球') == -1 && price > 0){
                            items.push({
                                Unique: 'cn.amazon.' + asin,
                                Title: title,
                                Img: src,
                                Url: 'http://www.amazon.cn/dp/' + asin, 
                                Price: price,
                                Sold: sold ? sold : 0,
                                TotalSoldQuantity: 0
                            })
                        }
                        
                    });
                }
                
            })

            itemInfo.Items = items;
            callback(null,itemInfo);
            return ;
        })

        //并发取数据
        urlProxuRequest = function(currentUrl){
            proxyRequest({
                url:currentUrl,
                headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:51.0) Gecko/20100101 Firefox/51.0'},
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
                    //text2 = _.trim(body);
                }catch(exception){
                    //currentItem = iconv.decode(body, 'utf-8');

                    urlProxuRequest(currentUrl);
                    return;
                }

                ep.emit('currentUrls', body);
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
    options.headers['refer'] = 'https://www.amazon.cn/%E9%9E%8B-%E9%9D%B4%E5%AD%90/b/ref=topnav_storetab_shoe?ie=UTF8&node=2029189051';
    options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3";

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