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
    var comment_url = 'https://www.mia.com/item/detail/index/'+goods_id+'/1';
    var getComments = function(goods_id){
        var defer = Q.defer();

        var page = 5 //写出来最大评论数
        var urls = [];

        for(var i= 1;i <= page;i++){
            urls.push('https://www.mia.com/item/detail/index/' + goods_id + '/'+i);
        }
        //处理抓取的页面数据
        var ep = new eventproxy();
        ep.after('currentUrls', urls.length, function (currentItems) {
            var itemInfo = {
                Unique: 'mia.'+goods_id,  //店铺数据
                Status: 'inStock',          //状态
                Url: urlInfo.href,              //url
                ShopUrl : '',  //店铺链接
                Comments: []            //评论数组 默认是空
            };
            currentItems.forEach(function(currentItem){
                var comments = []
                try {
                    var currentComments = parseComment(currentItem);
                    //添加到 comments 里面
                    currentComments.forEach((item) => {comments.push(item)});
                    // itemInfo.Comments = comments
                } catch(err) {
                    console.log(err);
                }
                // 去除少于5字的评论
                var comment = commentUnique(comments)
                comment.forEach((items) => {itemInfo.Comments.push(items)});
            })
            return defer.resolve({msg : itemInfo});
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

        return defer.promise;
    }
    // 返回值
    getComments(goods_id).then(function(json){
        var info = json.msg
        callback(null,info);
    })
}
// 解析评论
function parseComment(bodymain) {
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
/**
 * 评论去重，去除5个字以下的评论
 */
function commentUnique(comments) {
    var new_comments = [];
    var contents = [];
    //遍历评论 剔除不合格的
    comments.forEach(function(val){
        val.Content = _.trim(val.Content);
        //判断长度
        if(val.Content.length < 5) return;
        //如果是默认评价 那么也跳过
        if(val.Content == '用户未及时评价，显示为默认评价。') return;
        //判断是否有保存好的评论
        if(contents.length > 0) {
            if(in_array(contents,val.Content))  return;
        }
        new_comments.push(val);
        contents.push(val.Content);
    });
    return new_comments;
}
function in_array(arr, str) {
    var i = arr.length;
    while (i--) {
        if (arr[i] === str) {
            return true;
        }
    }
    return false;
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