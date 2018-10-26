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
    keyword = urlInfo.query.keyword?urlInfo.query.keyword:'手机';
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
            keyword,
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

/**  -------------------------手机专用--------------------------- */
//lazy load => one page => two load
function getRealPage(page =1){
    return 1+(page-1)*2;
}

function getContent(params){
    var p = new Promise((resolve, reject) => {
        let apiUrl = '';
        if(params.page%2 == 0){
            apiUrl = 'https://search.jd.com/s_new.php?keyword=手机&enc=utf-8&qrst=1&rt=1&stop=1&lastprice=500gt&vt=2&cid2=653&cid3=655&ev=exprice_500gt^exbrand_'+params.brand+'^&page='+params.page+'&s='+((params.page-1)*30+1)+'&scrolling=y&log_id=1534411698.57723&tpl=3_M';
        }else{
            apiUrl = 'https://search.jd.com/search?keyword=手机&enc=utf-8&qrst=1&rt=1&stop=1&vt=2&wq=手机&cid2=653&cid3=655&ev=exbrand_'+params.brand+'^exprice_500gt^&page='+params.page+'&s='+((params.page-1)*30+1)+'&click=0';
        }
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
                        Price: _.trim($(dom).find('strong>i').text())==''?$(dom).find('strong').data('price'):$(dom).find('strong>i').text(),//预售
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

/** --------------------------键盘专用----------------------------- */
function getData(params){
    return new Promise((resolve,reject)=>{
        let apiUrl = 'https://list.jd.com/list.html?cat='+params.cat+'&ev='+(params.ev?params.ev:'')+'exbrand_'+params.brand+'&page='+params.page+'&sort=sort_totalsales15_desc&trans=1';
        proxyRequest({
            url: encodeURI(apiUrl),
            headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        },function(err, body){
            if(err){
                reject(err);
            }
            $ = cheerio.load(body);
            let result = [];
            let list = [];
            $('li.gl-item').each(function(index,dom){
                list.push($(dom).find('.j-sku-item').data('sku'));
                result.push({
                    Unique: 'cn.jd.' + $(dom).find('.j-sku-item').data('sku'),
                    Title: _.trim($(dom).find('.p-name').find('em').text()),
                    Img: 'https:'+ (typeof ($(dom).find('.p-img').find('img').attr('src')) == 'undefined' ?$(dom).find('.p-img').find('img').data('lazy-img'):$(dom).find('.p-img').find('img').attr('src')),
                    Url: 'https:'+$(dom).find('.p-name').children('a').attr('href'),
                    Price: '',
                    Pid: $(dom).find('.j-sku-item').data('sku'),
                    ShopId: '',
                    venderId:$(dom).find('.j-sku-item').attr('venderid'),//用于后期查找店铺信息
                    ShopName: '',
                    Sold: 0,//只有详情页有各尺码的剩余数量
                    TotalSoldQuantity: 0 //无已售数量
                });
            });
            let total_page = $('#J_topPage').find('i').text();
            ( async ()=>{
                let shopinfos = await getInfo({
                    url:'https://chat1.jd.com/api/checkChat?my=list&pidList='+_.join(list,','),
                    headers:{
                        'Referer':apiUrl
                    },
                    // gzip:true
                });
                console.log(shopinfos);
                let shop_map = [];
                shopinfos.forEach(x=>{
                    if(x.shopId){
                        shop_map[x.venderId] = {shopId:x.shopId,venderId:x.venderId,shopName:x.seller};
                    }
                });
                console.log(shop_map);//TODO:?可能出现没店名的数据

                let prices = await getInfo({
                    url:'https://p.3.cn/prices/mgets?skuIds='+_.join(_.map(list,x=>'J_'+x)  ,','),
                    headers:{
                        'Referer':apiUrl
                    }
                });

                let price_map = new Map();
                prices.forEach(element => {
                    price_map.set('cn.jd.'+_.trim(element.id,'J_'),element.p);
                });
                // console.log(price_map);
                result.forEach(function(x,index,arr){
                    console.log(x.venderId);
                    console.log(shop_map[x.venderId]);
                    arr[index].Price = price_map.get(x.Unique);
                    if(shop_map[x.venderId]){
                        arr[index].ShopId = shop_map[x.venderId].shopId;
                        arr[index].ShopName = shop_map[x.venderId].shopName;
                    }//include  shopname = '' &&shopid = ''
                });
                resolve({result,total_page});
            } )();
            
        });
    });
}
/**获取店铺名称  & 获取商品价格*/
function getInfo(params){
    console.log(params);
    return new Promise((resolve,reject)=>{
        request(params,function(err,response,body){
            if(err || response.statusCode!= 200){
                reject(err||body);
            }else{
                resolve(JSON.parse(_.trim(body,'()null;')));
            }
        })
    });
}

/** --------------------------  鼠标专用  ------------------------------------ */
function getMouse(params){
    
}
/** -----------------------------通用操作 ----------------------------- */
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

    switch(keyword){
        case '手机': 
            getTotalPage(brand).then(function(data){
                itemInfo.ItemAttributes.TotalPage = data;
            }).finally(function(){
                if(itemInfo.ItemAttributes.CurrentPage > itemInfo.ItemAttributes.TotalPage){
                    callback(null,itemInfo);
                    return;
                }
                params.page =  getRealPage(params.page); 
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
            break;
        case '鼠标':
            params.cat = '670,686,690';
            getData(params).then(function(data){
                // console.log(data);
                itemInfo.ItemAttributes.TotalPage = data.total_page;
                itemInfo.Items = data.result;
                callback(null,itemInfo);
            },function(err){
                callback(err,{});
            });
            break;
        case '键鼠套装':
            params.ev = '3184_1188@';
        case '键盘':
            params.cat = '670,686,689';  
            getData(params).then(function(data){
                // console.log(data);
                itemInfo.ItemAttributes.TotalPage = data.total_page;
                itemInfo.Items = data.result;
                callback(null,itemInfo);
            },function(err){
                callback(err,{});
            });
            break;
        case '耳机':
            params.cat = '652,828,842';
            getData(params).then(function(data){
                // console.log(data);
                itemInfo.ItemAttributes.TotalPage = data.total_page;
                itemInfo.Items = data.result;
                callback(null,itemInfo);
            },function(err){
                callback(err,{});
            });
            break;
        case '笔记本':
            params.cat = '670,671,672';
            getData(params).then(function(data){
                itemInfo.ItemAttributes.TotalPage = data.total_page;
                itemInfo.Items = data.result;
                callback(null,itemInfo);
            },function(err){
                callback(err,{});
            });
            break;
        case '游戏本':
            params.cat = '670,671,1105';
            getData(params).then(function(data){
                itemInfo.ItemAttributes.TotalPage = data.total_page;
                itemInfo.Items = data.result;
                callback(null,itemInfo);
            },function(err){
                callback(err,{});
            });
            break;
        case '移动电源':
            params.cat = '9987,830,13658';
            getData(params).then(function(data){
                itemInfo.ItemAttributes.TotalPage = data.total_page;
                itemInfo.Items = data.result;
                callback(null,itemInfo);
            },function(err){
                callback(err,{});
            });
            break;

    }
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