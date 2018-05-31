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

    //var apiUrl = 'https://category.vip.com/suggest.php?keyword=jordan&page=1&count=100&brand_sn=10012552&cid_1_show=68278&cid_2_show=20551';
    var apiUrl = 'https://category.vip.com/suggest.php?keyword=adidas+%E9%9E%8B&page='+page+'&count=100&suggestType=brand#catPerPos';
    if (page > 47){
        var apiUrl = 'https://category.vip.com/suggest.php?keyword=new+balance&page='+(page-47)+'&count=100&suggestType=brand#catPerPos';
    }
    proxyRequest({
        url: apiUrl,
        headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.146 Safari/537.36'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        var itemInfo = {
            Unique: 'cn.vip',
            Status: 'inStock',
            Url: 'https://www.vip.com',
            ItemAttributes: {
                UserId:'',
                ShopId:'',
                TotalPage: '',
                CurrentPage: ''
            },
            Items: []
        };

        var regexp = /suggestMerchandiseList\'\, ({.*})\);/ig;
        result = regexp.exec(body);
        text = JSON.parse(result[1]);

        var items =[];
        var TotalPage = 68;
        var pageNum = page; //每次抓取的终止页数


        var urls = [];
        if (page == 1){//锐步
            urls.push('https://category.vip.com/suggest.php?keyword=reebok%E9%9E%8B&ff=235|12|1|1');
        } else if(page==2){//万斯
            urls.push('https://category.vip.com/suggest.php?keyword=vans+%E9%9E%8B&brand_sn=10006920');
        } else if (page == 3 || page == 4){//aj
            urls.push('https://category.vip.com/suggest.php?keyword=jordan&page='+(page-2)+'&count=100&brand_sn=10012552&cid_1_show=68278&cid_2_show=20551');
        } else if (page == 5 || page == 6 || page==7){//亚瑟士
            urls.push('https://category.vip.com/suggest.php?keyword=asics+%E9%9E%8B&page='+(page-4)+'&count=100&suggestType=brand#catPerPos');
        } else if (page == 8 || page == 9 || page==10){//鬼冢虎
            urls.push('https://category.vip.com/suggest.php?keyword=Onitsuka+%E9%9E%8B&page='+(page-7)+'&count=100&suggestType=brand#catPerPos');
        } else if (page >10 && page<17){//匡威
            urls.push('https://category.vip.com/suggest.php?keyword=Converse+%E9%9E%8B&page='+(page-10)+'&count=100&suggestType=brand#catPerPos');
        } else if (page >16 && page<30){//耐克
            urls.push('https://category.vip.com/suggest.php?keyword=nike&page='+(page-16)+'&count=100&brand_sn=10000630&cid_1_show=68278&cid_2_show=20551&suggestType=brand#catPerPos');
        } else if (page >29 && page<41){//彪马
            urls.push('https://category.vip.com/suggest.php?keyword=PUMA+%E9%9E%8B&page='+(page-28)+'&count=100&suggestType=brand#catPerPos');
        } else if (page >40 && page<51){//斯凯奇
            urls.push('https://category.vip.com/suggest.php?keyword=Skechers+%E9%9E%8B&page='+(page-40)+'&count=100&suggestType=brand#catPerPos');
        } else if (page >50){//新百伦
            pageNum = pageNum + 1;
            if (pageNum > TotalPage) pageNum = TotalPage;
            urls.push('https://category.vip.com/suggest.php?keyword=new+balance&page='+pageNum+'&count=100&suggestType=brand#catPerPos');
        } 
        console.log(urls)

        //页面抓取信息
        itemInfo.ItemAttributes.TotalPage = TotalPage;
        itemInfo.ItemAttributes.CurrentPage = pageNum;

        // if (text.products.length == 0){
        //     // itemInfo.ItemAttributes.CurrentPage = 68;
        //     // callback(null,itemInfo);
        //     // return ;
        // }

        //处理抓取的页面json
        var ep = new eventproxy();
        ep.after('currentUrls', urls.length, function (currentItems) {
            if (currentItems[0].length == 0){
                currentItems[0] = text.products;
            } else {
                currentItems.unshift(text.products);
            }
             
            currentItems.forEach(function(currentItem){
                currentItem.forEach(function(item) {
                    if(item.type == 0){
                        items.push({
                            Unique: 'cn.vip.'+item.product_id,
                            Title: item.product_name,
                            Img: 'https:'+item.small_image,
                            Url: 'https://detail.vip.com/detail-'+item.brand_id+'-'+item.product_id+'.html',
                            Price: item.price_info.sell_price_min_tips,
                            Sold: 0,
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
                headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.146 Safari/537.36'},
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
                    var regexp = /suggestMerchandiseList\'\, ({.*})\);/ig;
                    result = regexp.exec(body);
                    text2 = JSON.parse(result[1]);
                }catch(exception){
                    //currentItem = iconv.decode(body, 'utf-8');

                    urlProxuRequest(currentUrl);
                    return;
                }

                ep.emit('currentUrls', text2.products);
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