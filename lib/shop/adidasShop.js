var request = require('request');
var _ = require('lodash');
var url = require('url');
var cheerio = require('cheerio');
var Q = require('q');

exports.getInfo = function(urlstr, page,  callback) {
    urlstr = 'https://adidas.m.tmall.com/shop/shop_auction_search.do?spm=a1z60.7754813.0.0.577546ebEJkQDr&suid=446338500&sort=d&style=list&p='+page+'&page_size=12&from=h5&shop_id=62147762&ajson=1&_tm_source=tmallsearch&callback=jsonp_85220251';
    proxyRequest({
        url: urlstr,
        headers: { 'User-Agent' : 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36'}
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        let text = _.trim(body);
        text = text.replace(/jsonp_\d+\(/i,'');
        text = _.trimEnd(text, ')');
        let json = JSON.parse(text);
        
        var itemInfo = {
            Unique: 'cn.taobao.'+json.shop_id,
            Status: 'inStock',
            Url: 'https://shop'+json.shop_id+'.taobao.com',
            ItemAttributes: {
                UserId : json.user_id,
                ShopId:  json.shop_id,
                TotalPage: json.total_page,
                CurrentPage: json.current_page
            },
            Items: []
        };
        
        if(json.items && _.isArray(json.items)){
            json.items.forEach(item => {
                if(item.title.indexOf('竞拍') > -1 || item.title.indexOf('拍卖') > -1){
                            
                }else{
                    itemInfo.Items.push({
                        Unique: 'cn.taobao.' + item.item_id,
                        Title: item.title,
                        Img: item.img.indexOf('http')===0?item.img:'http:'+item.img,
                        Url: getRealUrl(item.url, 'tmall'),
                        Price: item.reservePrice?item.reservePrice:item.price,
                        Sold: item.quantity,
                        TotalSoldQuantity: item.totalSoldQuantity
                    })
                }
            });
        }

        callback(null,itemInfo);
        return ;
    })
}

function proxyRequest(options, callback){
    options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
    // options.headers['Accept-Encoding'] = "gzip, deflate, br";
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.9,en;q=0.8";
    options.headers['Cookie'] = "cna=Zt7lERmV730CAXTkWHrjavxf; lid=%E7%B3%96%E9%A3%9E%E9%A3%9E351; hng=CN%7Czh-CN%7CCNY%7C156; sm4=310109; enc=QL7JN4ivocTxf6Nm4351Z0MnouMkjXRrdshHSZSjNueaUEpujpM5xODVZcAw4n3lDtT1uxZpcD7VE14jMAJfHA%3D%3D; csa=undefined; dnk=%5Cu7CD6%5Cu98DE%5Cu98DE351; uc1=cookie16=VFC%2FuZ9az08KUQ56dCrZDlbNdA%3D%3D&cookie21=V32FPkk%2FgihF%2FS5nrepr&cookie15=W5iHLLyFOGW7aA%3D%3D&existShop=false&pas=0&cookie14=UoTfLJZpnm1bXA%3D%3D&tag=8&lng=zh_CN; t=65eb6c3b1b140673087ffa65d997ceab; uc3=vt3=F8dBzrVHuN49%2BkRXxb0%3D&id2=UUkKfDZgBafuzg%3D%3D&nk2=r5JYS50id%2FjG&lg2=Vq8l%2BKCLz3%2F65A%3D%3D; tracknick=%5Cu7CD6%5Cu98DE%5Cu98DE351; csg=c40e8565; lgc=%5Cu7CD6%5Cu98DE%5Cu98DE351; _tb_token_=f3575ee7739b1; cookie2=30e10492440c6f5579ba43669a9e6512; _uab_collina=153750856700730393032954; cq=ccp%3D1; pnm_cku822=; _m_h5_tk=024432fc6ad6f570aecc2512be9c2528_1537523555010; _m_h5_tk_enc=cccb7d1580c4ed43c59c885d7e445c3f; isg=BISEezL6g96LDDXCzXhze2uNVQTajbmyRfGzdp4l_c84ySWTxqknl6gvDSG0UeBf";

    var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
    Q('get').then(function(success){//delegate proxy
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
    }).then(function(success){//real request
        options.headers['refer'] = 'https://adidas.m.tmall.com/shop/shop_auction_search.htm?spm=a1z60.7754813.0.0.577546ebEJkQDr&suid=446338500&sort=default&style=list';
        options.headers['pragma'] = 'no-cache';
        options.headers['upgrade-insecure-requests'] = 1;
        console.log(options);
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

var getRealUrl = function (urlStr, store) {
    urlStr = 'https:'+urlStr;

    if(store == 'tmall'){
        var urlInfo = url.parse(urlStr, true);
        return 'https://detail.tmall.com/item.htm?id='+urlInfo.query.id;
    }else{
        var urlInfo = url.parse(urlStr, true);
        return 'https://item.taobao.com/item.htm?id='+urlInfo.query.id;
    }
}