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

exports.getInfo =  function(urlstr, page, callback) {
    var urlInfo = url.parse(urlstr, true, true);
    brand = urlInfo.query.brand?urlInfo.query.brand:'华为（HUAWEI）';//默认品牌
    isNaN(page)?page=1:page;//默认页码

    // options.headers['Upgrade-Insecure-Requests'] = 1;
    options.headers['Accept'] = '*/*';
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8,en;q=0.6";
    options.headers['Accept-Encoding'] = "gzip, deflate, sdch, br";
    options.headers['User-Agent'] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
    options.headers['Cache-Control'] = "no-cache";
    options.headers['pragma'] = 'no-cache';
    options.headers['x-requested-with'] = 'XMLHttpRequest';
    options.headers['authority'] = 'search.jd.com';
    options.headers['referer'] = 'https://search.jd.com/search?keyword=%E6%89%8B%E6%9C%BA&enc=utf-8&qrst=1&rt=1&stop=1&vt=2&cid2=653&cid3=655&ev=2_75972%7C%7C75970%5Eexprice_500gt%5Eexbrand_'+encodeURIComponent(brand)+'&uc=0&lastprice=500gt';
    options.headers['cookie'] = 'qrsc=3; pinId=Fzr8CKIN3SApNMjjEToPnQ; TrackID=1wPidEeX0ezJ-h8NsU4v4NgBRi7uVuIK97i6Gy0ZrXBp2qzoGXS4XNWG391XCmsTUwsSakZmhjoT6D5N4O2QnBar4QkuReJ0lIlRH_2ysRKKiEdHmTFfLAZTlM2ETgVTV; shshshfpa=873efa57-abad-35e7-aeed-eb39de50e044-1531278617; shshshfpb=172b6da3f466e44b299877d61acd0ca1406e00f1f07aed8e259b7a29a6; __jdv=122270672|www.linkhaitao.com|t_1000039483_lh_1hydw1|tuiguang|e0415f8d8423416a8151131d2136fd3c|1533349776257; unpl=V2_ZzNtbURTQhN9CUBUf0peAmIAFQ8SA0FHJlxEBn9LXgBvBBJVclRCFXwUR11nGVkUZwcZX0BcQBJFCHZXfBpaAmEBFl5yBBNNIEwEACtaDlwJBBtUS19FFnwORVxLKV8FVwMTbUZVShJ9D0dQfylsAlczIlhGUkUUfThHZHopHlE7BxpfSlZEWHEKT1NzHl0BYzMTbUE%3d; __jdc=122270672; __jdu=538696055; PCSYCityID=2; xtest=3883.cf6b6759; ipLoc-djd=1-72-2799-0; rkv=V0900; sid=b5212342c53e64683f6c0fcb36903ea9; user-key=c647c94a-3b34-451f-bb56-54b32a55e121; cn=0; __jda=122270672.538696055.1521124252.1534401566.1534408727.80; shshshfp=d27625b166d176293fc116ff1845ce70; 3AB9D23F7A4B3C9B=IS6XA2ELRGC42FURX7BKHMY2A5INVNQDMH4DWIV74G7WFPCMKK6JT2FDOA75T6LBXBX6JY5Z6V3FFE3R3SAF2IJ3Z4; __jdb=122270672.35.538696055|80.1534408727; shshshsID=5529aa1d849a6d958dbf38a00eaad04d_35_1534411699458';
    // options.headers['Connection'] = "keep-alive";
    options.gzip = true;
     getItemInfo(
        {
            urlstr,
            brand,
            page
        },
        callback
    );
}

/**
 * 获取总页数
 */
 function getTotalPage(brand = '华为（HUAWEI）'){
    var promise = new Promise((resolve, reject) => {
        let url = 'https://search.jd.com/search?keyword=手机&enc=utf-8&qrst=1&rt=1&stop=1&vt=2&cid2=653&cid3=655&ev=exbrand_'+brand+'^exprice_500gt^&uc=0&lastprice=500gt#J_searchWrap';
        proxyRequest({
            url: encodeURI(url),
            headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        },function(err, body){
            if(err){
                callback(err);
                reject();
                return ;
            }
            let reg = /SEARCH\.adv_param=\{page:\"\d+\",page_count:\"(\d+)\"/gi;
            let p = reg.exec(body);
            resolve(p[1]);
        });
    });
    return promise;
}

//lazy load => one page => two load
function getRealPage(page =1){
    return 1+(page-1)*2;
}

function getContent(params){
    var p = new Promise((resolve, reject) => {
        let apiUrl = 'https://search.jd.com/s_new.php?keyword=手机&enc=utf-8&qrst=1&rt=1&stop=1&lastprice=500gt&vt=2&cid2=653&cid3=655&ev=exprice_500gt^exbrand_'+params.brand+'^&page='+params.page+'&s=28&scrolling=y&log_id=1534411698.57723&tpl=3_M';
        proxyRequest({
            url: encodeURI(apiUrl),
            headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        },function(err, body){
        
                if(err){
                    callback(err);
                    reject();
                }
                $ = cheerio.load(body);

                let result = [];
                $('li.gl-item').each(function(index,dom){
                    let link = $(dom).find('a').first().attr('href');
                    // let info = url.parse(link,true);
                    let href = (String)($(dom).find('.curr-shop').attr('href'));
                    result.push({
                        Unique: 'cn.jd.' + $(dom).data('sku'),
                        Title: $(dom).find('div.p-name>a>em').text(),
                        Img: 'https:'+$(dom).find('a').first().children('img').attr('source-data-lazy-img'),
                        Url: 'https://item.jd.com/' +$(dom).data('sku')+'.html',
                        Price: $(dom).find('strong>i').text(),
                        Pid: $(dom).data('pid'),
                        ShopId:href.indexOf('-') > -1? href.substring(href.indexOf('-')+1).replace('.html',''):'',
                        ShopName:$(dom).find('.curr-shop').attr('title')?$(dom).find('.curr-shop').attr('title'):'JD自营',
                        Sold: 0,//只有详情页有各尺码的剩余数量
                        TotalSoldQuantity: 0 //无已售数量
                    });
                });

                resolve(result);
        
        });
    });

    return p;
}

 function getItemInfo(params, callback){
    //terminal result
    var itemInfo = {
        Unique: 'cn.jd',
        Status: 'inStock',
        Url: 'https://search.jd.com',
        ItemAttributes: {
            UserId:'',
            ShopId:'',
            TotalPage: '',//每页60条数据
            CurrentPage: params.page
        },
        Items: []
    };

    getTotalPage(brand).then(function(data){
        itemInfo.ItemAttributes.TotalPage = data;
    }).finally(function(){
        if(itemInfo.ItemAttributes.CurrentPage > itemInfo.ItemAttributes.TotalPage){
            callback(null,itemInfo);
            return;
        }
        params.page =  getRealPage(params.age); 
        getContent(params).then(function(data){
            itemInfo.Items =  _.concat(itemInfo.Items,data);
        }).finally(function(){
            params.page++;
            getContent(params).then(function(data){
                itemInfo.Items =  _.concat(itemInfo.Items,data);
            }).finally(function(){
                callback(null,itemInfo);
            });
        });
    });
    

    return ;
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
            // console.log(opt);
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