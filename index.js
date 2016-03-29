// var request = require('request');
// var _ = require('lodash');
// var jschardet = require('jschardet');
// var cheerio = require('cheerio');
// // var zlib = require('zlib');
var fs = require('fs');
var express = require('express'), app = express();
var compress = require('compression');
var bodyParser = require('body-parser');
var url = require('url');
var request = require('request');
// var phantom = require('phantom');

var taobao = require('./lib/taobao');
var amazonCn = require('./lib/amazonCn');
var nikeStore = require('./lib/nikeStore');
var yougou = require('./lib/yougou');
var _6pm = require('./lib/6pm');
var shihuoHaitao = require('./lib/shihuoHaitao');
var amazonJp = require('./lib/amazonJp');
var amazonUsa = require('./lib/amazonUsa');
var nbaStore = require('./lib/nbaStore');
var yohobuy = require('./lib/yohobuy');
var yintai = require('./lib/yintai');


app.use(compress());
app.use(bodyParser.json());
app.use(express.static('mochawesome-reports'));

app.get('/test', function (req, res) {
  /* taobao.getInfo('https://item.taobao.com/item.htm?spm=a230r.1.14.20.EFhUKi&id=45122936450',function(error,itemInfo){
         if(error){
             res.send(error);
         }else{
             res.send(itemInfo);
         }
     })*/
   /* amazon.getInfo('http://www.amazon.cn/gp/product/B013OOT614/ref=s9_cngwdyfloorv2-s9?pf_rd_m=A1AJ19PSB66TGU&pf_rd_s=desktop-1&pf_rd_r=0NXVQ726G3DZPAQBVMTQ&pf_rd_t=36701&pf_rd_p=B013OOT614&pf_rd_i=desktop',function(error,itemInfo){
        res.send(itemInfo);
    })*/
    /* nikeStore.getInfo('http://store.nike.com/cn/zh_cn/pd/air-max-2016-%E8%B7%91%E6%AD%A5%E9%9E%8B/pid-10865050/pgid-10345833',function(error,itemInfo){
        if(error){
             res.send(error);
         }else{
             res.send(itemInfo);
         }
    })*/

   /* yougou.getInfo('http://seoul.yougou.com/c-chrischristy/sku-kcxalrc1041-100343796.shtml#ref=search&po=search',function(error,itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })*/

   /* _6pm.getInfo('http://www.6pm.com/product/8550462/color/567398',function(error,itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })*/

 /*   shihuoHaitao.getInfo('http://www.shihuo.cn/haitao/buy/84755.html',function(error,itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })*/

    yohobuy.getInfo('http://item.yohobuy.com/product/pro_289611_371709',function(error,itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })
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
        storeObj.getInfo(encodeURI(goodsUrl) ,function(error, itemInfo){
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
                Errors: {
                    Code: 'Fatal',
                    Message: 'Address request not to crawl access'
                }
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
        case 'detail.tmall.hk':
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
        case 'item.yohobuy.com':
            return yohobuy;
        case 'item.yintai.com':
            return yintai;
        default:
            return '';
    }
}

app.listen(3000,function(){
   console.log('listen 3000');
})

