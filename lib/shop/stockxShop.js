var request = require('request');
var _ = require('lodash');
var Q = require('q');
var cheerio = require('cheerio');
var url = require('url');
var md5 = require('md5');
// let fun = require('../fun');
let options = {
    headers:[],
    proxy:null
};
let _tags = ['yeezy,adidas','ultra boost,adidas','nmd,adidas','iniki,adidas','other,adidas',
            'one,air jordan','two,air jordan','three,air jordan','four,air jordan','five,air jordan',
            'six,air jordan','seven,air jordan','eight,air jordan','nine,air jordan','ten,air jordan',
            'eleven,air jordan','twelve,air jordan','thirteen,air jordan','fourteen,air jordan','fifteen,air jordan',
            'sixteen,air jordan','seventeen,air jordan','eighteen,air jordan','nineteen,air jordan','twenty,air jordan',
            'twenty-one,air jordan','twenty-two,air jordan','twenty-three,air jordan','twenty-eight,air jordan','twenty-nine,air jordan',
            'thirty,air jordan','thirty-one,air jordan','packs,air jordan','spizike,air jordan','other,air jordan',
            'foamposite,nike','kd,nike','kobe,nike','lebron,nike','air force,nike','air max,nike','nike+basketball,nike','nike+sb,nike','nike+other,nike',
            'asics','diadora','li ning','louis vuitton','new+balance','puma','reebok','saucony','under+armour','other+brands'
        ];

exports.getInfo = function(urlstr, page, callback) {
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
    let  page =  params.page?(isNaN(Number(params.page))?1:Number(params.page)):1;
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
            Unique: 'usa.stockx',
            Status: 'inStock',
            Url: 'https://stockx.com',
            ItemAttributes: {
                UserId:'',
                ShopId:'',
                TotalPage: 0,
                CurrentPage: page
            },
            Items: []
        };
        
        body.forEach(str =>{
            let json = JSON.parse(str);
            console.log(json);
            itemInfo.ItemAttributes.TotalPage = Math.max(itemInfo.ItemAttributes.TotalPage,Number(json.Pagination.lastPage));
            json.Products.forEach(product => {
                itemInfo.Items.push({
                    Unique: 'usa.stockx.'+md5(product.id).substr(8, 16),
                    Title: product.title,
                    Img: product.media.imageUrl,//[smallImageUrl|thumbUrl]
                    Url: itemInfo.Url+'/buy/'+product.urlKey, 
                    Price: product.market.lowestAsk?product.market.lowestAsk:0,//单位:美元$
                    Sold: 0,//详情页不显示各尺码的剩余数量
                    TotalSoldQuantity: product.market.deadstockSold?product.market.deadstockSold:0 //已售数量
                });
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

        var p = [];
        let option = Object.assign({},opt);
        for(let tag in _tags){
            p[tag] = new Promise(function(resolve,reject){
                option.url = opt.url+'&_tags='+_tags[tag];
                request(option,function(error,response,body) {
                    if (!error && response.statusCode == 200) {
                        resolve(body);
                    }else{
                        reject();
                    }
                });
            });
        }
        Promise.all(p).then(function(results){
            callback(null,results);
        });
    },function(rejected){
        callback(rejected, null, null);
    })
}