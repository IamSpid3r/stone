var express = require('express'), app = express();
var compress = require('compression');
var url = require('url');
var request = require('request');

//需要支持 淘宝|天猫 亚马逊  识货  京东 国美
var taobao = require('./lib/comment/taobaoComment');
var amazonCn = require('./lib/comment/amazonCnComment');
var shihuoHaitao = require('./lib/comment/shihuoHaitaoComment');
var gome = require('./lib/comment/gomeComment');
var jd = require('./lib/comment/jdComment');


var kaola = require('./lib/comment/kaluli/kaolaComment');//考拉
var mia = require('./lib/comment/kaluli/miaComment111');//蜜芽



app.get('/t',function(req,res){
    taobao.getInfo('https://detail.tmall.com/item.htm?spm=a230r.1.14.9.4LFEYQ&id=524753097959&ns=1&abbucket=15',function(error,itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })

    /*amazonCn.getInfo('http://www.amazon.cn/adidas-%E9%98%BF%E8%BF%AA%E8%BE%BE%E6%96%AF-TENNIS-CULTURE-%E4%B8%AD%E6%80%A7-%E7%BD%91%E7%90%83%E9%9E%8BGVP-CANVAS-STR/dp/B00KV6CITE/ref=cm_cr_pr_product_top?ie=UTF8',function(error,itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })*/
})

app.get('/info', function (req, res) {
    var goodsUrl = req.query.url;
    var goodsUrlHost = '';
    if(goodsUrl){
        var urlInfo = url.parse(goodsUrl, true, true);
        goodsUrlHost = urlInfo.host;
    }

    var storeObj = getStoreObj(goodsUrlHost);
    if(typeof storeObj == 'object'){
        storeObj.getInfo(goodsUrl ,function(error, itemInfo){
            if(error){
                res.json({
                    Status: false,
                    Msg: error
                })
            }else{
                res.json({ Status: true, Data: itemInfo});
            }
        })
    }else{
        res.json({
            Status: false,
            Msg: {
                Errors: [{
                    Code: '请求地址不在抓取访问',
                    Message: '请求地址不在抓取访问'
                }]
            }
        })
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