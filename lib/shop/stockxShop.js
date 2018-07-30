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
    let apiUrl = 'https://stockx.com/api/browse?page='+page+'&time=1532658163001&gender=men&productCategory=sneakers';
    proxyRequest({
        url: apiUrl,
        headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }
        var itemInfo = {
            Unique: 'cn.stockx',
            Status: 'inStock',
            Url: 'https://stockx.com',
            ItemAttributes: {
                UserId:'',
                ShopId:'',
                TotalPage: '',
                CurrentPage: page
            },
            Items: []
        };
        // console.log(body);
        var json = JSON.parse(body);
        itemInfo.ItemAttributes.TotalPage = json.Pagination.lastPage;
        json.Products.forEach(product => {
            itemInfo.Items.push({
                Unique: 'cn.stockx.'+product.id,
                Title: product.title,
                Img: product.media.imageUrl,//[smallImageUrl|thumbUrl]
                Url: itemInfo.Url+'/buy/'+product.urlKey, 
                Price: product.market.lowestAsk?product.market.lowestAsk:0,//单位:美元$
                Sold: 0,//详情页不显示各尺码的剩余数量
                TotalSoldQuantity: product.market.deadstockSold?product.market.deadstockSold:0 //已售数量
            });
        });        
        
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
    Object.assign(opt,options);
    if(options.proxy){
        console.log('fixed proxy:'+options.proxy);
        request(opt,function(error,response,body) {
            if (!error && response.statusCode == 200) {
                callback(null, body, response);
            }else{
                console.log(opt);
                console.log(error);
                options.proxy = null;
                callback(error, null, null);
            }
        })
    }else{
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
    }
}