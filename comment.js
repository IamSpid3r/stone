var express = require('express'), app = express();
var compress = require('compression');
var url = require('url');
var request = require('request');

//需要支持 淘宝|天猫 亚马逊  识货  京东 国美
var taobao = require('./lib/comment/taobaoComment');
var tbNew = require('./lib/comment/tbNewComment');  //淘宝新抓取 
var amazonCn = require('./lib/comment/amazonCnComment');
var shihuoHaitao = require('./lib/comment/shihuoHaitaoComment');
var gome = require('./lib/comment/gomeComment');
var jd = require('./lib/comment/jdComment');

var kaola = require('./lib/comment/kaluli/kaolaComment');//考拉
var mia = require('./lib/comment/kaluli/miaComment');//蜜芽


//错误 json 
var err_info = {
    Status: false,
    Msg: {
        Errors: [{
            Code: '请求地址不在抓取访问',
            Message: '请求地址不在抓取访问'
        }]
    }
};



app.get('/info',async function (req, res) {
    var goodsUrl = req.query.url;
    var goodsUrlHost = '';
    
    if(goodsUrl){
        var urlInfo = url.parse(goodsUrl, true, true);
        goodsUrlHost = urlInfo.host;
    }
    //抓取数据
    var storeObj = [],
    itemInfo = [];
    //如果是淘宝单独处理
    if(goodsUrlHost == 'item.taobao.com' || goodsUrlHost == 'detail.tmall.com') {
        console.log('通过puppeteer抓取'+goodsUrlHost);
        try { 
            itemInfo = await tbNew.getInfo(goodsUrl);
            res.json({ Status: true, Data: itemInfo});
        }catch(e) {
            res.json({ Status: false,Msg: e});
        }
    } else {
        console.log("普通抓取"+goodsUrlHost);
        storeObj = getStoreObj(goodsUrlHost);
        if(typeof storeObj == 'object'){
            storeObj.getInfo(goodsUrl ,function(error, itemInfo){
                if(error){
                    res.json({ Status: false,Msg: error});
                }else{
                    res.json({ Status: true, Data: itemInfo});
                }
            })
        }else{
            res.json(err_info);
        }
    }
})

//获取商城对象
function getStoreObj(host){
    switch(host){
        case 'www.amazon.cn':
            return amazonCn;
        case 'www.amazon.co.jp':
            return amazonJp;
        case 'www.amazon.com':
            return amazonUsa;
        case 'item.taobao.com':
        case 'detail.tmall.com':
            return taobao;
        case 'store.nike.com':
        case 'www.nike.com':
            return nikeStore;
        case 'www.yougou.com':
        case 'seoul.yougou.com':
            return yougou;
        case 'www.shihuo.cn':
            return shihuoHaitao;
        case 'www.6pm.com':
            return _6pm;
        case 'store.nba.com':
            return nbaStore;
        case 'item.gome.com.cn':
            return gome;
        case 'item.jd.com':
        case 'item.jd.hk':
            return jd;
        // 考拉
        case 'www.kaola.com':
        case 'www.kaola.com.hk':
            return kaola;
        //蜜芽
        case 'www.mia.com':
        case 'www.miyabaobei.hk':
            return mia;
        default:
            return '';
    }
}
app.listen(3001);
console.log("listening 3001");