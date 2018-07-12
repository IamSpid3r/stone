var request = require('request');
var _ = require('lodash');
var Q = require('q');
var cheerio = require('cheerio');

exports.getInfo = function(urlstr, page, callback) {
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
    let  apiUrl = _.trim(params.urlstr);
    if(apiUrl.indexOf('page') == -1){
        apiUrl += '?page='+page;
    }
    if(apiUrl.indexOf('view') == -1){
        apiUrl += '&view=90&scale=282';
    }
    console.log(apiUrl);
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
            let txt = $('[data-test=page-number]').text();
            itemInfo.ItemAttributes.TotalPage = Number(txt.slice(txt.lastIndexOf(' ')+1));

            $('[data-test=product-card-list]>article').each(function(index,dom){
                itemInfo.Items.push({
                    Unique: 'cn.farfetch.' + $(dom).children('a').attr('data-ffref'),
                    Title: $(dom).find('[itemprop=name]').text(),
                    Img: $(dom).children('div').children('a').children('span').children('img').attr('src'),
                    Url: 'http://www.farfetch.cn' + $(dom).children('a').attr('href'), 
                    Price: $(dom).find('[itemprop=price]').attr('content'),
                    Sold: 0,//只有详情页有各尺码的剩余数量
                    TotalSoldQuantity: 0 //无已售数量
                });
            });
        }else if($('span[data-tstid=paginationTotal]').get(0)){
            callback('get error page');
            return ;
            // itemInfo.ItemAttributes.TotalPage = Number($('span[data-tstid=paginationTotal]').first().text());

            // $('section[data-tstid=Div_listingItems]>article').each(function(index,dom){
            //     itemInfo.Items.push({
            //         Unique: 'cn.farfetch.' + $(dom).children('a').attr('data-ffref'),
            //         Title: $(dom).find('[itemprop=name]').text(),
            //         Img: $(dom).children('div').children('a').children('img').attr('src'),
            //         Url: 'http://www.farfetch.cn/' + $(dom).children('a').attr('href'), 
            //         Price: $(dom).find('[itemprop=price]').attr('content'),
            //         Sold: 0,//只有详情页有各尺码的剩余数量
            //         TotalSoldQuantity: 0 //无已售数量
            //     });
            // });
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
                    defer.resolve('success');
                }
            }else{
                defer.reject('代理服务器错误');
            }
        })
        return defer.promise;
    }).then(function(success){
        request(options,function(error,response,body) {
            console.log(body);
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