var request = require('request');
var _ = require('lodash');
var Q = require('q');
var cheerio = require('cheerio');
var url = require('url');
// let fun = require('../fun');
let options = {
    headers:[],
    proxy:null
};
let failcount = 0;

exports.getInfo = function(urlstr, page, callback) {
    failcount = 0 ;
    options.headers['Upgrade-Insecure-Requests'] = 1;
    options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8,en;q=0.6";
    options.headers['Accept-Encoding'] = "gzip, deflate, sdch, br";
    options.headers['User-Agent'] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
    options.headers['Cache-Control'] = "max-age=0";
    options.headers['pragma'] = 'no-cache';
    // options.headers['Connection'] = "keep-alive";
    options.gzip = true;
    getItemInfo(
        {
            urlstr,
            page
        },
        callback
    );
}

function getItemInfo(params, callback){
    let  page =  Number(params.page);
    // let  apiUrl = _.trim(params.urlstr);
    // if(apiUrl.indexOf('page') == -1){
    //     apiUrl += '?page='+page;
    // }
    // if(apiUrl.indexOf('view') == -1){
    //     apiUrl += '&view=90&scale=282';
    // }
    let apiUrl = 'https://www.farfetch.com/cn/shopping/men/shoes-2/items.aspx?page='+page+'&view=90&scale=282';
    proxyRequest({
        url: apiUrl,
        headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }
        var itemInfo = {
            Unique: 'cn.farfetch',
            Status: 'inStock',
            Url: 'https://www.farfetch.com',
            ItemAttributes: {
                UserId:'',
                ShopId:'',
                TotalPage: '',
                CurrentPage: page
            },
            Items: []
        };

        $ = cheerio.load(body);

        if($('[data-test=page-number]').get(0)){
            // let txt = $('[data-test=page-number]').text();
            // itemInfo.ItemAttributes.TotalPage = Number(txt.slice(txt.lastIndexOf(' ')+1));

            // $('[data-test=product-card-list]>article').each(function(index,dom){
            //     let link = $(dom).children('a').attr('href');
            //     let info = url.parse(link,true);
            //     itemInfo.Items.push({
            //         Unique: 'cn.farfetch.' + info['pathname'].slice(info['pathname'].lastIndexOf('-')+1,info['pathname'].lastIndexOf('.')),//item
            //         Title: $(dom).find('[itemprop=name]').text(),
            //         Dom:$(dom).html(),
            //         Img: $(dom).find('img').last().attr('src'),
            //         Url: 'http://www.farfetch.com' + link, 
            //         Price: $(dom).find('[itemprop=price]').attr('content'),
            //         Sold: 0,//只有详情页有各尺码的剩余数量
            //         TotalSoldQuantity: 0 //无已售数量
            //     });
            // });
            
            failcount++;
            options.proxy = null;
            console.log('retry request: '+failcount);
            if(failcount > 5){
                callback('get error page'); return;
            }else{
                return getItemInfo(params, callback);
            }
        }else if($('span[data-tstid=paginationTotal]').get(0)){
            itemInfo.ItemAttributes.TotalPage = Number($('span[data-tstid=paginationTotal]').first().text());

            $('section[data-tstid=Div_listingItems]>article').each(function(index,dom){
                let link = $(dom).children('a').attr('href');
                let info = url.parse(link,true);
                itemInfo.Items.push({
                    Unique: 'cn.farfetch.' + info['pathname'].slice(info['pathname'].lastIndexOf('-')+1,info['pathname'].lastIndexOf('.')),
                    Title: $(dom).find('[itemprop=name]').text(),
                    Img: $(dom).find('img').last().attr('src'),
                    Url: 'http://www.farfetch.com' + link, 
                    Price: $(dom).find('[itemprop=price]').attr('content'),
                    Sold: 0,//只有详情页有各尺码的剩余数量
                    TotalSoldQuantity: 0 //无已售数量
                });
            });
            
        }

        if(!itemInfo.ItemAttributes.TotalPage){
            itemInfo.Items = [];
            callback(null,itemInfo);
            return ;
        }

        callback(null,itemInfo);
        return ;
    })
}


/*
 *获取html
 **/
function proxyRequest(opt,callback){
    // Object.assign(opt,options);
    // if(options.proxy){
    //     console.log(1111111,options.proxy);
    //     request(opt,function(error,response,body) {
    //         if (!error && response.statusCode == 200) {
    //             callback(null, body, response);
    //         }else{
    //             console.log(opt);
    //             console.log(error);
    //             options.proxy = null;
    //             callback(error, null, null);
    //         }
    //     })
    // }else{
        var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
        Q('get').then(function(success){
            var defer = Q.defer();
            request({url:developUrl,timeout:2000}, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    body = JSON.parse(body);
                    if(body.status == 'ok'){
                        options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
                        defer.resolve('success');
                    }
                }else{
                    defer.reject('代理服务器错误');
                }
            })
            return defer.promise;
        }).then(function(success){
            Object.assign(opt,options);
            console.log(opt);
            request(opt,function(error,response,body) {
                if (!error && response.statusCode == 200) {
                    callback(null, body, response);
                }else{
                    console.log(error);
                    callback(error, null, null);
                }
            })
        },function(rejected){
            callback(rejected, null, null);
        })
    // }
}