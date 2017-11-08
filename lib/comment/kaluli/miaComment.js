var request = require('request');
var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')



exports.getInfo = function(urlstr, callback) {
    //解析url
    var urlInfo = url.parse(urlstr, true);
    if(urlInfo.host == 'www.mia.com' || urlInfo.host == 'www.miyabaobei.hk'){
        getItemInfo(urlInfo, callback);
    } else {
        callback('host error is not mia hostname');
    }
}
// 处理抓取评论
function getItemInfo(urlInfo, callback) {
    var goods_idRegExp = /item-(\d*)\.html/ig;
    var goods_id = goods_idRegExp.exec(urlInfo.pathname);
    if(Array.isArray(goods_id) && goods_id[1] != undefined) {
        goods_id = goods_id[1];
    } else {
        callback("not found goods id");
    }
    //拼装评论url
    // var comment_url = 'https://www.mia.com/item-' + goods_id + '.html';
    var comment_url = 'https://www.mia.com/item/detail/index/'+goods_id+'/1';


    //通过代理 获取url
    proxyRequest({
        url: comment_url
    },function(err, body){
        if (err) {
            callback(err);
            return;
        }
        try {
            var bodymain = body
        } catch (err) {
            callback("comment json parse error");
        }
        //拼装返回数据
        var itemInfo = {
            Unique: 'mia.'+goods_id,  //店铺数据
            Status: 'inStock',          //状态
            Url: urlInfo.href,              //url
            ShopUrl : '',  //店铺链接
            Comments: []            //评论数组 默认是空
        };
        //获取最大评论数
        var $ = cheerio.load(body);
        var num = $('.moduleFixed .moFixed ul li:nth-child(2)').text()
        var numRegExp = /\(([0-9]+)\)/ig;
        var Num = numRegExp.exec(num);
        // 最大评论数得到
        var maxNum = Num[1]
        var page = (maxNum > 0) ? Math.ceil(maxNum / 10) : 1;  //最大数 除以 每页10
        var urls = [];
        var comments = []

        // 先解析第一页
        comments = parseComment(bodymain);
        //最多抓取5页 其实蜜芽是从1 页开始算的 所以我们一共会抓5页
        page = page > 6 ? 6 : page;
        //我们已经把第一页抓取回来了 所以我们只需要判断是否大于1就好了
        if(page > 1){//如果大一页 我们需要 通过 异步获取后几页的数据
            //我们从第二页开始抓
            for(var i= 2;i <= page;i++){
                urls.push('https://www.mia.com/item/detail/index/' + goods_id + '/'+i);
            }
            //处理抓取的页面数据
            var ep = new eventproxy();
            ep.after('currentUrls', urls.length, function (currentItems) {
                currentItems.forEach(function(currentItem){
                    try {
                        var currentComments = parseComment(currentItem);
                        //添加到 comments 里面
                        currentComments.forEach((item) => {comments.push(item)});
                    } catch(err) {
                        //出错则不抓这个评论
                        console.log(err);
                    }
                })
                // itemInfo.Comments = commentUnique(comments);
                callback(null,itemInfo);
            })
            //并发取数据
            urls.forEach(function (currentUrl) {
                proxyRequest({
                    url:currentUrl,
                    encoding: null
                }, function(err, body){
                    if(err){
                        callback({
                            "Errors":{
                                'Code': 'error',
                                "Message": err
                            }
                        });
                        return '';
                    }

                    ep.emit('currentUrls', body);
                });
            })
        }

        itemInfo.Comments = comments
        callback(null,itemInfo);
    })
}
// 解析评论
function parseComment(bodymain) {
    // 将页面转换成可以取到dom的格式
    var comments = [];
    var $ = cheerio.load(bodymain);
    $('.koubei_in').each(function () {
        var userName = $(this).find('.top .photo_txt .pink').text()
        userName = userName.replace(/(^\s*)|(\s*$)/g, "");
        var content = $(this).find('.pinglun_con').text()
        content = content.replace(/(^\s*)|(\s*$)/g, "");
        var guige = $(this).find('.guige').text()
        guige = guige.replace(/(^\s*)|(\s*$)/g, "");
        // 图片部分
        var pic = [];
        $(this).find('.img_product a').each(function () {
            var imgUrl = $(this).find('.kb_pic').attr('src')
            pic.push(imgUrl)
        })
        comments.push({
            'Sku': guige,
            'Date': '',
            'Content': content,
            'Nick': userName,
            'Photos':pic,
            'Md5': md5(content+userName)
        });
    })
    return comments;
}
/*
 *获取html
 **/
function proxyRequest(options, callback){
    options.headers = {
        'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
        "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        // "Accept-Encoding":"gzip, deflate, br",
        "Accept-Language":"zh-CN,zh;q=0.8",
        "cookie":"wom=web; sid=m15f94820f3454bfa; pgv_pvi=6008145920; pgv_si=s5623369728; scan_sku=1299159,1338586,1308958; sitefrom=2c0016760005de00417057c7987e2bc98; web_union_source=; web_union_channel=; web_union_cid=; web_union_wi=; union_uid=; union_planid=; WT_FPC=id=27cc901a5f8469c07341510025060975:lv=1510034845019:ss=1510033668254:lsv=1510025060975:vs=2:spv=3; _sign=; NTKF_T2D_CLIENTID=guest56D39AE7-575E-EB88-0983-94820F464FA6; nTalk_CACHE_DATA={uid:hw_1000_ISME9754_guest56D39AE7-575E-EB,tid:1510027060300137}; _jzqco=%7C%7C%7C%7C%7C1.991227099.1510025072556.1510034828902.1510034854810.1510034828902.1510034854810.0.0.0.18.18; Hm_lvt_4037cc2cae85a0650ac6293abc7fbe9e=1510026343,1510027061,1510027092,1510034542; Hm_lpvt_4037cc2cae85a0650ac6293abc7fbe9e=1510034855; Hm_lvt_f4f5a44567da02c2f8994e34c479415c=1510026343,1510027061,1510027092,1510034542; Hm_lpvt_f4f5a44567da02c2f8994e34c479415c=1510034855; ag_fid=SWs2wdjoX1UKEeBF; miyaid=qn02d22pu3qqrs43jpvc1fufr4"
    };

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
        var chunks = [];
        request(options,function(error,response,body) {
            if (!error && response.statusCode == 200) {
                var decodedBody = iconv.decode(Buffer.concat(chunks), 'utf-8');
                callback(null, decodedBody, response);
            }else{
                callback(error, null, null);
            }
        }).on('data', function(data) {
            chunks.push(data);
        });
    },function(rejected){
        callback(rejected, null, null);
    })
}