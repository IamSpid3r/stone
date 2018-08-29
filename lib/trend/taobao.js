const url = require("url");
var iconv = require('iconv-lite');
const _  = require("lodash");
const md5 = require("md5");
var eventproxy = require("eventproxy")
// var phantom = require('phantom');
var request = require('request');
var proxyRequest = require('../proxyRequest').proxyRequest;
var cheerio = require('cheerio');
//加载puppeteer
var chrome = null;
async function loadPuppeteer() {
    chrome = await require('../../plugin/puppeteer');
}




module.exports.getInfo = async (detail_url,callback) => {
    //载入chrome浏览器
    if(chrome == null) {
        await loadPuppeteer();
    }
    var detail_url = 'https://detail.tmall.com/item.htm?id=574908480439';
    /*
    var urlInfo = url.parse(detail_url, true);
    console.info(urlInfo);
    if(!_.has(urlInfo,"query.id")) {

        return Promise.reject("没有指定ID！");
    }
    console.info(1111)
    var detail_id = _.get(urlInfo,"query.id");
    */
    //进入主函数
    // await chrome.page.goto(detail_url);
    // var item_html = await chrome.page.content();
    // var exp2 = /<div[^>]*class=\"tb-detail-hd\">(\s|\S?*)<\/div>/ig;
    // // var  exp1 = /<meta[^>]*content=\"[^>]*shopId=(\d*)[^>]*userId=(\d*);\"/ig;
    // var  res1 = exp2.exec(item_html);
    var ItemInfo = {};

    var id = '574908480439';
    var search_url = 'https://s.taobao.com/search?q=Champion+Action+Style%E8%8D%89%E5%86%99LOGO%E4%BC%91%E9%97%B2%E5%9C%86%E9%A2%86T%E6%81%A4&imgfile=&js=1&stats_click=search_radio_all%3A1&initiative_id=staobaoz_20180829&ie=utf8'; 
    var search_one = await chrome.page.goto(search_url);
    //console.log(await ccc.text());
    //return Promise.reject("111！");;
    var search_html = await search_one.text();
    var exp3 = /"itemlist":[\s|\S]*,"bottomsearch":/g
    var res3 = exp3.exec(search_html);
    if(typeof res3 != "undefined" ){
        var htmlObj = JSON.parse(res3[0].substring(11, res3[0].length-16));
        for(var p =0; p < htmlObj.data.auctions.length; p++){
            if(htmlObj.data.auctions[p]['nid'] == id){
                var samestyle = 'http://s.taobao.com/'+htmlObj.data.auctions[p]['i2iTags']['samestyle']["url"];
            }
        }
        if(typeof samestyle != "undefined"){
            var samestyle_one = await chrome.page.goto(samestyle);
            var samestyle_html = await samestyle_one.text();
            var exp4 = /"recitem":[\s|\S]*,"header":/g
            var res4 = exp4.exec(samestyle_html);
            var sameHtml = JSON.parse(res4[0].substring(10, res4[0].length-10));
            var ep = new eventproxy();
            if(typeof sameHtml != "undefined" ){
                ItemInfo.items = [];
                for(var i =0; i < sameHtml.data.items.length; i++){
                    var detail_url = sameHtml.data.items[i]['detail_url'];
                    getImgList(detail_url, function(err, img){
                        if(err){
                            callback({
                              "Errors":{
                                  'Code': 'Error',
                                  "Message": err
                              }
                            });
                            return '';
                          }
                          ep.emit('imgSetPath', [img]);
                        })
                }
                ep.after('imgSetPath', sameHtml.data.items.length, function(img){
                   ItemInfo.items.push(img);
                   callback('',ItemInfo);

                });
            }
        }
    }
    
    // return ItemInfo;
};

function getImgList(urlStr, callback){
    var urlInfo = url.parse(urlStr, true, true);
    if (urlInfo.host == 'item.taobao.com' && urlInfo.pathname == '/item.htm' && urlInfo.query.id)  running = 1;
    if (urlInfo.host == 'detail.tmall.com' &&  urlInfo.pathname == '/item.htm' && urlInfo.query.id) running = 1;
    if (urlInfo.host == 'detail.tmall.hk' &&  urlInfo.pathname == '/hk/item.htm' && urlInfo.query.id) running = 1;
    if (urlInfo.host == 'chaoshi.detail.tmall.com' &&  urlInfo.pathname == '/item.htm' && urlInfo.query.id) running = 1;
    if(running == 0)  callback({ "Errors":{'Code': 'Fatal', "Message": 'host error is not taobao hostname'}});

    //继续执行
    var api_url = 'http://hws.m.taobao.com/cache/mtop.wdetail.getItemDescx/4.1/?data=%7B%22item_num_id%22%3A%22'+urlInfo.query.id+'%22%7D';
    var img = [];
    getHtml({
        url: api_url
        ,method: 'GET'
        ,headers: {
            'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "X-Requested-With":"XMLHttpRequest"
        }
        ,encoding: null
        ,gzip: true
    }, function(err, response, body) {
        if (err) {
            callback({ "Errors":{'Code': 'Error',"Message": 'request api error'}});
        }
        var img = [];
        //分析json
        body = iconv.decode(body, 'utf-8');
        body = JSON.parse(body);
        if(body.data.images == undefined || body.data.images == '') {
             callback({ "Errors":{'Code': 'Error',"Message": 'request api error'}});
        }
        img = body.data.images
        // console.log(img + "--getImgList")
        callback(null, img);
        
    }); //getHtml end
}
/*
 *获取html
 **/
function getHtml(options, callback){
    proxyRequest(options, function(error, response, body, callbackStatus) {
        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(error, response, body);
    })
}



