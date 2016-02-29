var request = require('request');
var _ = require('lodash');
var url = require('url');
var md5 = require('md5');
var Q = require('q');
var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')

exports.getInfo = function(urlstr, callback) {
    var urlInfo = url.parse(urlstr, true);
    if (urlInfo.host == 'item.taobao.com' && urlInfo.pathname == '/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else if (urlInfo.host == 'detail.tmall.com' && urlInfo.pathname == '/item.htm' && urlInfo.query.id) {
        getItemInfo(urlInfo, callback);
    } else {
        callback('host error is not taobao hostname');
    }
}

function getItemInfo(urlInfo, callback){
    proxyRequest({
        url: urlInfo.href
    },function(err, body){
        if(err){
            callback(err);
            return ;
        }

        $ = cheerio.load(body);

        var  exp1 = /<meta[^>]*content=\"[^>]*shopId=(\d*)[^>]*userId=(\d*);\"/ig;
        var  res1 = exp1.exec(body);

        //抓取
        proxyRequest({
            url:'https://rate.taobao.com/feedRateList.htm?auctionNumId='+urlInfo.query.id+'&userNumId='+res1[2]+'&currentPageNum=1&pageSize=20&orderType=feedbackdate&showContent=1&rateType=3',
            encoding: null
        },function(err, text, response){
            text = iconv.decode(text, 'gbk');
            text = _.trim(text);
            text = _.trimStart(text, '(');
            text = _.trimEnd(text, ')');
            text = JSON.parse(text);

            var itemInfo = {
                Unique: 'com.taobao.'+urlInfo.query.id,
                Status: 'inStock',
                Url: urlInfo.href,
                ShopUrl : 'https://shop'+res1[1]+'.taobao.com/',
                Comments: []
            };
            var pageNum = text.total;
            var page = (pageNum > 0) ? Math.ceil(pageNum / 20) : 1;
            var urls = [];
            var items = [];
            var comments = [];

            //最多抓取5页
            page = page > 5 ? 5 : page;
            for(var i= 1;i <= page;i++){
                urls.push('https://rate.taobao.com/feedRateList.htm?auctionNumId='+urlInfo.query.id+'&userNumId='+res1[2]+'&currentPageNum='+i+'&pageSize=20&orderType=feedbackdate&showContent=1&rateType=3');
            }

            //处理抓取的页面json
            var ep = new eventproxy();
            ep.after('currentUrls', urls.length, function (currentItems) {
                currentItems.forEach(function(currentItem){
                    currentItem = iconv.decode(currentItem, 'gbk');
                    currentItem = _.trim(currentItem);
                    currentItem = _.trimStart(currentItem, '(');
                    currentItem = _.trimEnd(currentItem, ')');
                    currentItem = JSON.parse(currentItem);

                    currentItem.comments.forEach(function(comment){
                        var photos = [];
                        comment.photos.forEach(function(photo){
                            photos.push('http:'+photo.url);
                        })

                        if( comment.appendList.length > 0 ){
                            comment.appendList.forEach(function(commentPhoto){
                                if(commentPhoto.photos.length > 0){
                                    commentPhoto.photos.forEach(function(photo){
                                        photos.push('http:'+photo.url);
                                    })
                                }
                            })
                        }

                        comments.push({
                            'Sku':comment.auction.sku,
                            'Date': _.replace(_.replace(_.replace(comment.date,'年','-'),'月','-'),'日',''),
                            'Content': comment.content,
                            'Nick':comment.user.nick,
                            'Photos':photos,
                            'Md5': md5(JSON.stringify(comment.content+comment.user.nick+photos))
                        })
                    })
                })

                itemInfo.Comments = comments;
                callback(null,itemInfo);
                return ;
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
        })

    })


}


/*
 *获取html
 **/
var maxRequestNum = 2;
var requestNum = 0;
function proxyRequest(options, callback){
    options.headers = {
         'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
         "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
         "Accept-Encoding":"deflate, sdch",
         "Accept-Language":"zh-CN,zh;q=0.8",
         "cookie":":thw=cn; cna=fR+hDeeT50ICATr3cloaZbmD; miid=6345998908287345826; x=e%3D1%26p%3D*%26s%3D0%26c%3D0%26f%3D0%26g%3D0%26t%3D0%26__ll%3D-1%26_ato%3D0; lzstat_uv=8629291913329613887|2144678; tracknick=hxl724753832; _cc_=VT5L2FSpdA%3D%3D; tg=0; _m_h5_tk=a8c851e108396671a4a47fe2800f8b1c_1453691787833; _m_h5_tk_enc=cc4c05577d30d7d43b66584d2846a3d7; v=0; linezing_session=9q62Zftrxc6myk5U5wogiuSm_1453875476406Wc5G_1; isg=4BDE5B1133BD9B93442D2FA1B939DF07; _tb_token_=583e611e13374; mt=ci%3D-1_0; uc1=cookie14=UoWyjVdEi6VXIg%3D%3D; cookie2=1c7b75338f80538f4f0548e69714c245; t=17cb7c33aba0dc662a5d8eb53fdf6401; l=ApCQQCCBQfb994wdQkfa8wZJ4NDlzHTW"
    };

    var developUrl = 'http://121.41.45.190:3333/proxyGet?add=1';
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