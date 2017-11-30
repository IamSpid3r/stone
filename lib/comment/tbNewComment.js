//淘宝新抓取，通过puppeteer
const url = require("url");
const _  = require("lodash");
const md5 = require("md5");

//加载puppeteer
var chrome = null;
async function loadPuppeteer() {
    chrome = await require('../../plugin/puppeteer');
}


// html 转 json
function comment_to_json(comment_html) {
    var comment_json = '';
    comment_json = _.trim(comment_html);
    comment_json = comment_json.replace(/[\r\n]/g,"");
    comment_json = _.trimStart(comment_json, '(');
    comment_json = _.trimEnd(comment_json, ')');
    comment_json = JSON.parse(comment_json);
    return comment_json;
}


//处理评论数据
function  parse_comment(comment_json) {
    var ret = [];
    comment_json.comments.forEach(function(comment){
        //声明 图片数组
        var photos = [];
        comment.photos.forEach(function(photo){
            photos.push('http:'+photo.url);
        })
        //这里判断是否有图片
        if( comment.appendList.length > 0 ){
            comment.appendList.forEach(function(commentPhoto){
                if(commentPhoto.photos.length > 0){
                    commentPhoto.photos.forEach(function(photo){
                        photos.push('http:'+photo.url);
                    })
                }
            })
        }
        ret.push({
            'Sku':comment.auction.sku,
            'Date': _.replace(_.replace(_.replace(comment.date,'年','-'),'月','-'),'日',''),
            'Content': comment.content,
            'Nick':comment.user.nick,
            'Photos':photos,
            'Md5': md5(JSON.stringify(comment.content+comment.user.nick+photos))
        })
    })
    return ret;
}


module.exports.getInfo = async (detail_url) => {
    //载入chrome浏览器
    if(chrome == null) {
        await loadPuppeteer();
    }
    var urlInfo = url.parse(detail_url, true);
    if(!_.has(urlInfo,"query.id")) {
        return Promise.reject("没有指定ID！");
    }
    var detail_id = _.get(urlInfo,"query.id");
    
    //进入主函数
    await chrome.page.goto(detail_url);
    var item_html = await chrome.page.content();
    var  exp1 = /<meta[^>]*content=\"[^>]*shopId=(\d*)[^>]*userId=(\d*);\"/ig;
    var  res1 = exp1.exec(item_html);

    
    var comment_url = 'https://rate.taobao.com/feedRateList.htm?auctionNumId='+detail_id+'&userNumId='+res1[2]+'&currentPageNum=1&pageSize=20&rateType=&orderType=sort_weight&attribute=&sku=&hasSku=false&t='+Math.random(); 
    var comment_one = await chrome.page.goto(comment_url);
    //console.log(await ccc.text());
    //return Promise.reject("111！");;
    var comment_html = await comment_one.text();

    //解析第一页数据
    let comment_json = comment_to_json(comment_html);

     //拼装返回数据
     var itemInfo = {
        Unique: 'com.taobao.'+detail_id,  //店铺数据
        Status: 'inStock',          //状态
        Url: urlInfo.href,              //url
        ShopUrl : 'https://shop'+res1[1]+'.taobao.com/',  //店铺链接
        Comments: []            //评论数组 默认是空
    };
    var pageNum = comment_json.total;   //最大数
    var page = (pageNum > 0) ? Math.ceil(pageNum / 20) : 1;  //最大数 除以 每页20
    var urls = [];
    var items = [];
    var comments = [];

    //如果第一页有数据 那么就处理
    if(typeof comment_json.comments != "undefined") {  
        //处理第一页
        comments = parse_comment(comment_json);
    }
    if(page > 1) {
        //最多抓取5页  从第二页开始抓
        page = page > 5 ? 5 : page;
        for(let i= 2;i <= page;i++){
            var _body = await chrome.page.goto('https://rate.taobao.com/feedRateList.htm?auctionNumId='+detail_id+'&userNumId='+res1[2]+'&currentPageNum='+i+'&pageSize=20&rateType=&orderType=sort_weight&attribute=&sku=&hasSku=false&t='+Math.random());
            var _comment_html = await _body.text();
            //解析第一页数据
            var _comment_json = comment_to_json(_comment_html);
            var _comments = [];
            //如果第一页有数据 那么就处理
            if(typeof _comment_json.comments != "undefined") {  
                //处理第一页
                _comments = parse_comment(_comment_json);
                _comments.forEach((v) => {
                    comments.push(v);
                });
            }
        }  //for end
     } //crawl page end
    itemInfo.Comments = comments;
    //console.log(itemInfo);
    return itemInfo;
};














