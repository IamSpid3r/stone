var request = require('request');
var _ = require('lodash');
var Q = require('q');
var cheerio = require('cheerio');
var url = require('url');
var fs = require('fs');

// var redis = require(process.cwd()+'/apps/lib/redis.js');
const token_file = process.cwd()+'/farfetchtoken.txt';
const NODE_ENV = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
const AUTH_URL = config.farfetch.auth+'/connect/token';//获取token&刷新token
const SEARCH_URL = config.farfetch.api+'/v1/search/products';//获取商品(男鞋)
/**-------------------------------------old fetch page method------------------------------------------ */
// let options = {
//     headers:[],
//     proxy:null
// };
// let failcount = 0;
// exports.getInfo = function(urlstr, page, callback) {
//     failcount = 0 ;
//     options.headers['Upgrade-Insecure-Requests'] = 1;
//     options.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
//     options.headers['Accept-Language'] = "zh-CN,zh;q=0.8,en;q=0.6";
//     options.headers['Accept-Encoding'] = "gzip, deflate, sdch, br";
//     options.headers['User-Agent'] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
//     options.headers['Cache-Control'] = "max-age=0";
//     options.headers['pragma'] = 'no-cache';
//     // options.headers['Connection'] = "keep-alive";
//     options.gzip = true;
//     getItemInfo(
//         {
//             urlstr,
//             page
//         },
//         callback
//     );
// }

// function getItemInfo(params, callback){
//     let  page =  Number(params.page);
//     let apiUrl = 'https://www.farfetch.com/cn/shopping/men/shoes-2/items.aspx?page='+page+'&view=90&scale=282';
//     proxyRequest({
//         url: apiUrl,
//         headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
//     },function(err, body){
//         if(err){
//             callback(err);
//             return ;
//         }
//         var itemInfo = {
//             Unique: 'cn.farfetch',
//             Status: 'inStock',
//             Url: 'https://www.farfetch.com',
//             ItemAttributes: {
//                 UserId:'',
//                 ShopId:'',
//                 TotalPage: '',
//                 CurrentPage: page
//             },
//             Items: []
//         };

//         $ = cheerio.load(body);

//         if($('[data-test=page-number]').get(0)){
//             // let txt = $('[data-test=page-number]').text();
//             // itemInfo.ItemAttributes.TotalPage = Number(txt.slice(txt.lastIndexOf(' ')+1));

//             // $('[data-test=product-card-list]>article').each(function(index,dom){
//             //     let link = $(dom).children('a').attr('href');
//             //     let info = url.parse(link,true);
//             //     itemInfo.Items.push({
//             //         Unique: 'cn.farfetch.' + info['pathname'].slice(info['pathname'].lastIndexOf('-')+1,info['pathname'].lastIndexOf('.')),//item
//             //         Title: $(dom).find('[itemprop=name]').text(),
//             //         Dom:$(dom).html(),
//             //         Img: $(dom).find('img').last().attr('src'),
//             //         Url: 'http://www.farfetch.com' + link, 
//             //         Price: $(dom).find('[itemprop=price]').attr('content'),
//             //         Sold: 0,//只有详情页有各尺码的剩余数量
//             //         TotalSoldQuantity: 0 //无已售数量
//             //     });
//             // });
            
//             failcount++;
//             options.proxy = null;
//             console.log('retry request: '+failcount);
//             if(failcount > 5){
//                 callback('get error page'); return;
//             }else{
//                 return getItemInfo(params, callback);
//             }
//         }else if($('span[data-tstid=paginationTotal]').get(0)){
//             itemInfo.ItemAttributes.TotalPage = Number($('span[data-tstid=paginationTotal]').first().text());

//             $('section[data-tstid=Div_listingItems]>article').each(function(index,dom){
//                 let link = $(dom).children('a').attr('href');
//                 let info = url.parse(link,true);
//                 itemInfo.Items.push({
//                     Unique: 'cn.farfetch.' + info['pathname'].slice(info['pathname'].lastIndexOf('-')+1,info['pathname'].lastIndexOf('.')),
//                     Title: $(dom).find('[itemprop=brand]').text() +' '+$(dom).find('[itemprop=name]').text(),
//                     Img: $(dom).find('img').last().attr('src'),
//                     Url: 'http://www.farfetch.com' + link, 
//                     Price: $(dom).find('[itemprop=price]').attr('content'),
//                     Sold: 0,//只有详情页有各尺码的剩余数量
//                     TotalSoldQuantity: 0 //无已售数量
//                 });
//             });
            
//         }

//         if(!itemInfo.ItemAttributes.TotalPage){
//             itemInfo.Items = [];
//             callback(null,itemInfo);
//             return ;
//         }

//         callback(null,itemInfo);
//         return ;
//     })
// }

/*
 *获取html
 **/
// function proxyRequest(opt,callback){
//         var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
//         Q('get').then(function(success){
//             var defer = Q.defer();
//             request({url:developUrl,timeout:2000}, function (error, response, body) {
//                 if (!error && response.statusCode == 200) {
//                     body = JSON.parse(body);
//                     if(body.status == 'ok'){
//                         options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
//                         defer.resolve('success');
//                     }
//                 }else{
//                     defer.reject('代理服务器错误');
//                 }
//             })
//             return defer.promise;
//         }).then(function(success){
//             Object.assign(opt,options);
//             console.log(opt);
//             request(opt,function(error,response,body) {
//                 if (!error && response.statusCode == 200) {
//                     callback(null, body, response);
//                 }else{
//                     console.log(error);
//                     callback(error, null, null);
//                 }
//             })
//         },function(rejected){
//             callback(rejected, null, null);
//         })
// }

/**------------------------------------new api request page ------------------------------- */
//terminal result
var itemInfo = {
    Unique: 'cn.farfetch',
    Status: 'inStock',
    Url: 'https://www.farfetch.com',
    ItemAttributes: {
        UserId:'',
        ShopId:'',
        TotalPage: '',
        CurrentPage: 1
    },
    Items: []
};

exports.getInfo = function(urlstr, page, callback) {
    page = isNaN(page)?1:page;
    var stat = fs.statSync(token_file);
    let now = Date.now();//13位 毫秒

    if( (now - stat.mtimeMs) >= 12000 * 1000 ){//token过期
        console.log('regenerate file...');
        authToken().then(function(result){
            browseProducts(result,page,callback);
        }).catch(function(err){
            console.log(err);
        });
    }else{//token有效
        fs.readFile(token_file,'utf8',function(err,result){
            if (err) {
                return err.message;
            }
            if(result){
                browseProducts(result,page,callback);
            }else{
                console.log('retrieve token...');
                authToken().then(function(result){
                    browseProducts(result,page,callback);
                }).catch(function(err){
                    console.log(err);
                });
            }
            
        });
    }
    
}

/** 授权登陆后获取token */
function authToken(){
    console.log('authToken...')
    return new Promise((resolve, reject) =>{
        let option = {
            url: AUTH_URL,
            headers: [
            {
                name: 'content-type',
                value: 'application/x-www-form-urlencoded'
            }
            ],
            form: {
                grant_type: 'client_credentials',
                client_id: config.farfetch.clientId,
                client_secret: config.farfetch.clientSecret,
                scope: 'api'
            }
        };
        if(NODE_ENV == 'develop'){
            option.form.grant_type = 'password';
            option.form.username = config.farfetch.username;
            option.form.password = config.farfetch.password
        }
        console.log(option);
        request.post(option,function(error,response,body){
            if (!error && response.statusCode == 200) {
                let json = JSON.parse(body);
                fs.writeFileSync(token_file,json.token_type+' '+json.access_token);
                resolve(json.token_type+' '+json.access_token);
            }else{
                reject(error);
            }
        });
    });
}

//搜索男鞋
async function browseProducts(token,page,callback){
    console.log('search product...');
    let headers = {
        'FF-Country':'CN',
        'FF-Currency':'CNY',
        'Accept-Language': 'zh-CN',
        'Authorization':token 
    };
    console.log(SEARCH_URL+'?gender=1&q='+encodeURI('鞋履')+'&p='+page);
    request.get(SEARCH_URL+'?gender=1&q='+encodeURI('鞋履')+'&p='+page,{headers},function(error,response,body){
        if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
            console.log(body);
            itemInfo.ItemAttributes.TotalPage = body.products.totalPages;
            itemInfo.ItemAttributes.CurrentPage = body.products.number;
            body.products.entries.forEach(x=>{
                if(x.currencyIsoCode == 'CNY'){
                    itemInfo.Items.push({
                        Unique: 'cn.farfetch.'+x.id,
                        Title: x.brand.name+' '+x.shortDescription,//TODO:???
                        Img: x.images.find((val)=>{
                            return val.order==1 && val.size==255;//返回255码的
                        }).url,
                        Pid:x.id,
                        Url: 'https://www.farfetch.com/cn/shopping/'+x.gender+'/'+x.brand.name+'-item-'+x.id+'.aspx?storeid='+x.merchantId, 
                        Price: Math.ceil(x.price),//折扣价， priceWithoutDiscount 无折扣价
                        Sold: x.quantity?x.quantity:0,//只有详情页有各尺码的剩余数量
                        TotalSoldQuantity: 0 //无已售数量
                    });
                }
            });
            if(_.isEmpty(itemInfo.Items)){
                itemInfo.ItemAttributes.TotalPage = 1;
            }
            callback(null,itemInfo);
        }else{
            console.log(error);
        }
        return itemInfo;
    });
}