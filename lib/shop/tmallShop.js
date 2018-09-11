var request = require('request');
var _ = require('lodash');
var Q = require('q');
var cheerio = require('cheerio');
var url = require('url');
let iconv = require('iconv-lite');
let encode = require('encoding');
// let fun = require('../fun');
let options = {
    headers:[],
    proxy:null
};

//brand & tmall brand_id reflect
// let brand_map = {
//     '360':3253280,
//     '360手机':'',
//     'AGM':1863355612,
//     'Apple':30111,
//     '华硕（ASUS）':11656,
//     '黑莓（BlackBerry）':47416,
//     '酷派（Coolpad）':11542,
//     '朵唯（DOOV）':26487995,
//     '荣耀':590022244,
//     'HTC':3261618,
//     '华为（HUAWEI）':11813,
//     '酷比（koobee）':41993221,
//     '联想（Lenovo）':11119,
//     'LG':'',
//     '美图（meitu）':157907274,
//     '魅族（MEIZU）':25143,
//     '摩托罗拉（Motorola）':10123,
//     '诺基亚（NOKIA）':33564,
//     '努比亚（nubia）':280928896,
//     '一加':600184882,
//     'OPPO':28247,
//     '飞利浦（PHILIPS）':10246,
//     '雷蛇':'',
//     '三星（SAMSUNG）':81156,
//     '夏普（SHARP）':10590,
//     '锤子（smartisan）':618278836,
//     '索尼（SONY）':10752,
//     'vivo':91621,
//     '中兴（ZTE）':11208,
//     '谷歌（Google）':'',
//     '国美（GOME）':82450679,
//     '黑鲨':'',
//     '金立（Gionee）':11531,
//     '小辣椒':582926107,
//     '小米（MI）':3506680
// }

exports.getInfo =  function(urlstr, page, callback) {
    var urlInfo = url.parse(urlstr, true, true);
    brand = urlInfo.query.brand?urlInfo.query.brand:11813;//默认品牌
    isNaN(page)?page=1:page;//默认页码

    options.headers['Upgrade-Insecure-Requests'] = 1;
    options.headers['Accept'] = '*/*';
    options.headers['Accept-Language'] = "zh-CN,zh;q=0.8,en;q=0.6";
    options.headers['Accept-Encoding'] = "gzip, deflate, sdch, br";
    options.headers['User-Agent'] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
    options.headers['Cache-Control'] = "no-cache";
    options.headers['pragma'] = 'no-cache';
    // options.headers['x-requested-with'] = 'XMLHttpRequest';
    options.headers['authority'] = 'list.tmall.com';
    options.headers['referer'] = 'https://list.tmall.com/search_product.htm?spm=a220m.1000858.0.0.727c5f3byihArT&search_condition=7&style=g&q=%CA%D6%BB%FA&from=sn_1_rightnav';
    options.headers['cookie'] = 'cna=Zt7lERmV730CAXTkWHrjavxf; lid=%E7%B3%96%E9%A3%9E%E9%A3%9E351; hng=CN%7Czh-CN%7CCNY%7C156; enc=lGJCCf0dVEEadF1ssNg0NqhsOLRculxtCD2LL8jkY5c5QWHXwI4VUr%2FDOr1bUav%2FBzI5czbjKaBmdRIP7K8R2g%3D%3D; _med=dw:1280&dh:800&pw:2560&ph:1600&ist:0; cq=ccp%3D1; tk_trace=1; dnk=%5Cu7CD6%5Cu98DE%5Cu98DE351; uc1=cookie16=W5iHLLyFPlMGbLDwA%2BdvAGZqLg%3D%3D&cookie21=Vq8l%2BKCLjhS4UhJVbCU7&cookie15=W5iHLLyFOGW7aA%3D%3D&existShop=false&pas=0&cookie14=UoTfLiXDAIK13w%3D%3D&tag=8&lng=zh_CN; uc3=vt3=F8dBzrSJt0My98uxLjc%3D&id2=UUkKfDZgBafuzg%3D%3D&nk2=r5JYS50id%2FjG&lg2=UtASsssmOIJ0bQ%3D%3D; tracknick=%5Cu7CD6%5Cu98DE%5Cu98DE351; lgc=%5Cu7CD6%5Cu98DE%5Cu98DE351; cookie2=29fc68fc27116ff462727143cbcf3b30; t=65eb6c3b1b140673087ffa65d997ceab; csg=04dbcaa2; _tb_token_=eb47848ed35e3; _m_h5_tk=0b8a9c2a9187b73655221eecc26dea3b_1535951479833; _m_h5_tk_enc=5325cf511664ce9a621f518463a9c9b0; res=scroll%3A1276*6247-client%3A1276*359-offset%3A1276*6247-screen%3A1280*800; isg=BFNThlmQDPZfqMLXds0sZjCA4tHRGPZ_gzX2fAVwr3KphHMmjdh3GrHWurRPPz_C; pnm_cku822=098%23E1hvHvvUvbpvUvCkvvvvvjiPPs5yljY8Psqw6jljPmPZ0jnbRFsWQjDbRLFUsjDWRphvChCvvvvEvpCWB88Ov8ROJmZfNezheuganox%2F1WAKDVQHNZsvzEyXfCISBiVvVE6FpFn79nQaRoxBnZJt9b8rwywaUns9e1OiHjHUQW97RAYVEvLvqbyCvm3vpvCwvvCvohCvhPWvvhhephvZvvvvp0nvpCpvvvCm3yCvhPWvvh8VkphvCyEmmvQfj8yCvv3vpvoxLQntG9hCvvXvovvvvvvPvpvhvv2MMTwCvvBvpvpZ';
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

 function getItemInfo(params, callback){
    //terminal result
    var itemInfo = {
        Unique: 'cn.tmall',
        Status: 'inStock',
        Url: 'https://list.tmall.com',
        ItemAttributes: {
            UserId:'',
            ShopId:'',
            TotalPage: '',//每页60条数据
            CurrentPage: params.page
        },
        Items: []
    };

    let apiUrl = 'https://list.tmall.com/search_product.htm?start_price=500&search_condition=55&cat=50024400&brand='+params.brand+'&sort=s&style=g&from=sn_1_brand-qp&q=%CA%D6%BB%FA&shopType=any&s='+ 60*(params.page-1);
    proxyRequest({
            encoding: null,
            url: apiUrl,
            headers: { 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        },function(err, body){
        
                if(err){
                    callback(err);
                    reject();
                }
                body = iconv.decode(Buffer.from(body),'gbk');
                $ = cheerio.load(body);

                let result = [];
                $('div.product').each(function(index,dom){
                    let link = $(dom).find('.productShop-name').attr('href');
                    let shop_id = link.match(/user_number_id=(\d+)&/);
                    let number = $(dom).find('.productStatus').children('span').children('em').text();
                    result.push({
                        Unique: 'cn.tmall.' + $(dom).data('id'),
                        Title: $(dom).find('.productTitle').children('a').text(),
                        Img: $(dom).find('.productImg').children('img').attr('src')?'https:'+$(dom).find('.productImg').children('img').attr('src'):'https:'+$(dom).find('.productImg').children('img').data('ks-lazyload'),
                        Url: 'https:'+$(dom).find('.productImg').attr('href'),
                        Price: $(dom).find('.productPrice').children('em').attr('title'),
                        Pid: 0,
                        ShopId:shop_id[1],
                        ShopName:_.trim($(dom).find('.productShop-name').text(),'\n'),
                        Sold: $(dom).find('.productStatus').get(0)?(number.indexOf('.') > -1?parseFloat(number) * 10000: parseInt(number)):0 ,//只有详情页有各尺码的剩余数量
                        TotalSoldQuantity: 0//无已售数量
                    });
                });

                itemInfo.ItemAttributes.TotalPage = $('input[name=totalPage]').val();
                if(itemInfo.ItemAttributes.CurrentPage > itemInfo.ItemAttributes.TotalPage){
                    callback(null,itemInfo);
                    return;
                }
                
                itemInfo.Items = result;
                callback(null,itemInfo);
                return;
        });
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