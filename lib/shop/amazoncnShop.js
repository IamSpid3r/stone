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

    //var apiUrl = 'https://www.amazon.cn/s/ref=sr_nr_p_6_0?fst=as%3Aoff&rh=n%3A2029189051%2Cn%3A%212112205051%2Cn%3A%212118806051%2Cn%3A%212118815051%2Cn%3A2118816051%2Cp_89%3ANew+Balance%7Cadidas+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%7CMizuno+%E7%BE%8E%E6%B4%A5%E6%B5%93%7CASICS+%E4%BA%9A%E7%91%9F%E5%A3%AB%7CSkechers+%E6%96%AF%E5%87%AF%E5%A5%87%7CNike+%E8%80%90%E5%85%8B%7CBrooks%7CSaucony+%E5%9C%A3%E5%BA%B7%E5%B0%BC%7CUnder+Armour+%E5%AE%89%E5%BE%B7%E7%8E%9B%7CFILA+%E6%96%90%E4%B9%90%7COnitsuka+Tiger+%E9%AC%BC%E5%A1%9A%E8%99%8E%7Cadidas+kids+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%E7%AB%A5%E9%9E%8B%2Cp_n_fulfilled_by_amazon%3A326314071%2Cp_6%3AA1AJ19PSB66TGU&page='+page+'&bbn=2118816051&ie=UTF8&qid=1488524466&rnid=51336071';
    //var apiUrl = 'https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cn%3A%212112205051%2Cn%3A%212118806051%2Cn%3A%212118815051%2Cn%3A2118816051%2Cp_6%3AA1AJ19PSB66TGU%2Cp_89%3ANike+%E8%80%90%E5%85%8B%7Cadidas+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF&page='+page+'&bbn=2118816051&ie=UTF8&qid=1497508119';
    var apiUrl = 'https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AReebok+%E9%94%90%E6%AD%A5%2Cp_n_special_merchandising_browse-bin%3A1414288071&page='+page+'&bbn=2029189051&ie=UTF8&qid=1522048965';
    proxyRequest({
        url: apiUrl,
        headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
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

        $ = cheerio.load(body);
        //var total =$('#s-slick-result-header').text();
        // var total =$('#s-result-count').text();
        // total=_.trim(total.replace(/.*共([\d,]+)条[\s].*[\n\s]*.*[\s\n]*.*/, '$1'));
        // total=total.replace(/,/,'');

        var TotalPage = $('#pagnNextLink').parent().prev().text();
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
        //var TotalPage = Math.ceil(total / 48);

        var urls = [];
        // if (page < 4){
        //     urls.push('https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cn%3A%212112205051%2Cn%3A%212118806051%2Cn%3A%212118815051%2Cn%3A2134348051%2Cp_n_fulfilled_by_amazon%3A326314071%2Cp_89%3AMizuno+%E7%BE%8E%E6%B4%A5%E6%B5%93%7CNike+%E8%80%90%E5%85%8B%7Cadidas+Originals+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%E4%B8%89%E5%8F%B6%E8%8D%89%7Cadidas+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%7Cadidas+Originals+kids+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%E4%B8%89%E5%8F%B6%E8%8D%89%2Cp_6%3AA1AJ19PSB66TGU&page='+page+'&bbn=2134348051&ie=UTF8&qid=1495003144');
        // }
        // if (page < 8){
        //     urls.push('https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cn%3A%212146652051%2Cn%3A%212146654051%2Cn%3A159140071%2Cp_n_fulfilled_by_amazon%3A326314071%2Cp_6%3AA1AJ19PSB66TGU%2Cp_89%3ANew+Balance&page='+page+'&bbn=159140071&ie=UTF8&qid=1495003173');
        // }
        if (page == 1){
            urls.push('https://www.amazon.cn/s/s/ref=sr_nr_p_n_fulfilled_by_ama_0?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3APUMA+%E5%BD%AA%E9%A9%AC%2Cp_n_fulfilled_by_amazon%3A326314071&bbn=2029189051&ie=UTF8&qid=1522049624&rnid=326313071');//彪马
            urls.push('https://www.amazon.cn/s/s/ref=sr_nr_p_n_fulfilled_by_ama_0?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AMizuno+%E7%BE%8E%E6%B4%A5%E6%B5%93%2Cp_n_fulfilled_by_amazon%3A326314071&bbn=2029189051&ie=UTF8&qid=1522049672&rnid=326313071');//美津浓
        }
        if(page==2){//匡威
            urls.push('https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AConverse+%E5%8C%A1%E5%A8%81%2Cp_n_fulfilled_by_amazon%3A326314071&page=2&bbn=2029189051&ie=UTF8&qid=1522049466');
            urls.push('https://www.amazon.cn/s/ref=sr_pg_1?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AConverse+%E5%8C%A1%E5%A8%81%2Cp_n_fulfilled_by_amazon%3A326314071&bbn=2029189051&ie=UTF8&qid=1522049602');
        }
        if(page==3){//万斯
            urls.push('https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AVANS+%E8%8C%83%E6%96%AF%2Cp_n_fulfilled_by_amazon%3A326314071&page=2&bbn=2029189051&ie=UTF8&qid=1522049548');
            urls.push('https://www.amazon.cn/s/ref=sr_pg_1?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AVANS+%E8%8C%83%E6%96%AF%2Cp_n_fulfilled_by_amazon%3A326314071&bbn=2029189051&ie=UTF8&qid=1522049553');
        }
        if(page==4){//耐克
            urls.push('https://www.amazon.cn/s/s/ref=sr_nr_p_n_fulfilled_by_ama_0?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3ANike+%E8%80%90%E5%85%8B%2Cp_n_fulfilled_by_amazon%3A326314071&bbn=2029189051&ie=UTF8&qid=1522049712&rnid=326313071');
            //阿迪NEO第一页
            urls.push('https://www.amazon.cn/s/s/ref=sr_nr_p_n_fulfilled_by_ama_0?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3Aadidas+NEO+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%E8%BF%90%E5%8A%A8%E7%94%9F%E6%B4%BB%2Cp_n_fulfilled_by_amazon%3A326314071&bbn=2029189051&ie=UTF8&qid=1522050387&rnid=326313071');
        }
        if(page ==5){//鬼冢虎
            urls.push('https://www.amazon.cn/s/ref=sr_pg_1?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AOnitsuka+Tiger+%E9%AC%BC%E5%A1%9A%E8%99%8E%2Cp_n_fulfilled_by_amazon%3A326314071&bbn=2029189051&ie=UTF8&qid=1522050145');
            urls.push('https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AOnitsuka+Tiger+%E9%AC%BC%E5%A1%9A%E8%99%8E%2Cp_n_fulfilled_by_amazon%3A326314071&page=2&bbn=2029189051&ie=UTF8&qid=1522050137');
        }
        if(page ==6){//圣康尼
            urls.push('https://www.amazon.cn/s/ref=sr_pg_1?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3ASaucony+%E5%9C%A3%E5%BA%B7%E5%B0%BC%2Cp_n_fulfilled_by_amazon%3A326314071&bbn=2029189051&ie=UTF8&qid=1522050333');
            urls.push('https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3ASaucony+%E5%9C%A3%E5%BA%B7%E5%B0%BC%2Cp_n_fulfilled_by_amazon%3A326314071&page=2&bbn=2029189051&ie=UTF8&qid=1522050311');
        }
        if(page ==7){//阿迪NEO2，3页
            urls.push('https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3Aadidas+NEO+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%E8%BF%90%E5%8A%A8%E7%94%9F%E6%B4%BB%2Cp_n_fulfilled_by_amazon%3A326314071&page=2&bbn=2029189051&ie=UTF8&qid=1522050389');
            urls.push('https://www.amazon.cn/s/ref=sr_pg_3?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3Aadidas+NEO+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%E8%BF%90%E5%8A%A8%E7%94%9F%E6%B4%BB%2Cp_n_fulfilled_by_amazon%3A326314071&page=3&bbn=2029189051&ie=UTF8&qid=1522050440');
        }

        if (page == 8){//阿迪NEO第四页  斯凯奇第一页
            urls.push('https://www.amazon.cn/s/ref=sr_pg_4?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3Aadidas+NEO+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%E8%BF%90%E5%8A%A8%E7%94%9F%E6%B4%BB%2Cp_n_fulfilled_by_amazon%3A326314071&page=4&bbn=2029189051&ie=UTF8&qid=1522050471');
            //斯凯奇第一页
            urls.push('https://www.amazon.cn/s/s/ref=sr_nr_p_n_fulfilled_by_ama_0?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3ASkechers+%E6%96%AF%E5%87%AF%E5%A5%87%2Cp_n_fulfilled_by_amazon%3A326314071&bbn=2029189051&ie=UTF8&qid=1522050544&rnid=326313071');
        }
        if (page == 9){//斯凯奇第2,3页
            urls.push('https://www.amazon.cn/s/ref=sr_pg_2?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3ASkechers+%E6%96%AF%E5%87%AF%E5%A5%87%2Cp_n_fulfilled_by_amazon%3A326314071&page=2&bbn=2029189051&ie=UTF8&qid=1522050547');
            urls.push('https://www.amazon.cn/s/ref=sr_pg_3?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3ASkechers+%E6%96%AF%E5%87%AF%E5%A5%87%2Cp_n_fulfilled_by_amazon%3A326314071&page=3&bbn=2029189051&ie=UTF8&qid=1522050631');
        }
        if (page == 10){//斯凯奇第4页
            urls.push('https://www.amazon.cn/s/ref=sr_pg_4?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3ASkechers+%E6%96%AF%E5%87%AF%E5%A5%87%2Cp_n_fulfilled_by_amazon%3A326314071&page=4&bbn=2029189051&ie=UTF8&qid=1522050645');
        }
        if (page>10 && page < 16){
            urls.push('https://www.amazon.cn/s/ref=sr_pg_'+(page-10)+'?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AASICS+%E4%BA%9A%E7%91%9F%E5%A3%AB%2Cp_n_fulfilled_by_amazon%3A326314071&page='+(page-10)+'&bbn=2029189051&ie=UTF8&qid=1522050869');
            urls.push('https://www.amazon.cn/s/ref=sr_pg_'+(page-10)+'?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3ANew+Balance%2Cp_n_fulfilled_by_amazon%3A326314071&page='+(page-10)+'&bbn=2029189051&ie=UTF8&qid=1522050946');
        }

        if (page >15 && page <23){//布鲁克斯
            urls.push('https://www.amazon.cn/s/ref=sr_pg_'+(page-16)+'?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3ABrooks%2Cp_n_special_merchandising_browse-bin%3A1414288071&page='+(page-16)+'&bbn=2029189051&ie=UTF8&qid=1522051066');
        }
        if (page >15 && page <22){//adidas
            urls.push('https://www.amazon.cn/s/ref=sr_pg_'+(page-16)+'?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3Aadidas+%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF%2Cp_n_fulfilled_by_amazon%3A326314071&page='+(page-16)+'&bbn=2029189051&ie=UTF8&qid=1522051291');
        }
        if (page == 22){//ua
            urls.push('https://www.amazon.cn/s/ref=sr_pg_'+(page-16)+'?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AUnder+Armour+%E5%AE%89%E5%BE%B7%E7%8E%9B%2Cp_n_special_merchandising_browse-bin%3A1414288071&page='+(page-16)+'&bbn=2029189051&ie=UTF8&qid=1522051384');
        }
        if (page >22 && page <30){//ua
            urls.push('https://www.amazon.cn/s/ref=sr_pg_'+(page-16)+'?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AUnder+Armour+%E5%AE%89%E5%BE%B7%E7%8E%9B%2Cp_n_special_merchandising_browse-bin%3A1414288071&page='+(page-16)+'&bbn=2029189051&ie=UTF8&qid=1522051384');
            urls.push('https://www.amazon.cn/s/ref=sr_pg_'+(page-16)*2+'?fst=as%3Aoff&rh=n%3A2029189051%2Cp_89%3AUnder+Armour+%E5%AE%89%E5%BE%B7%E7%8E%9B%2Cp_n_special_merchandising_browse-bin%3A1414288071&page='+(page-16)*2+'&bbn=2029189051&ie=UTF8&qid=1522051384');
        }


        console.log(urls)
        console.log(TotalPage)
        //页面抓取信息
        itemInfo.ItemAttributes.TotalPage = TotalPage;
        itemInfo.ItemAttributes.CurrentPage = page;

        if(!TotalPage){
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
                if (total){
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
            console.log(currentUrl)
            proxyRequest({
                url:currentUrl,
                headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
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
    options.headers['Upgrade-Insecure-Requests'] = '1';
    options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8,en;q=0.6";
    options.headers['Accept-Encoding'] = "gzip, deflate, sdch, br";
    options.headers['User-Agent'] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
    options.headers['Cache-Control'] = "max-age=0";
    options.headers['Connection'] = "keep-alive";
    options.gzip = true;


    var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
    Q('get').then(function(success){
        var defer = Q.defer();
        request({url:developUrl,timeout:2000}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if(body.status == 'ok'){
                    options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
                    //options.proxy = 'HTTP://172.16.49.62:8888';
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