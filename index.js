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
// var phantom = require('phantom');

var taobao = require('./lib/taobao');
var amazon = require('./lib/amazon');
var nikeStore = require('./lib/nikeStore');
var yougou = require('./lib/yougou');

app.use(compress());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());


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
    nikeStore.getInfo('http://store.nike.com/cn/zh_cn/pd/air-max-2016-%E8%B7%91%E6%AD%A5%E9%9E%8B/pid-10865050/pgid-10345833',function(error,itemInfo){
         if(error){
             res.send(error);
         }else{
             res.send(itemInfo);
         }
    })

  /*  yougou.getInfo('http://seoul.yougou.com/c-chrischristy/sku-kcxalrc1041-100343796.shtml#ref=search&po=search',function(error,itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })*/

})

var allowHostname = ['www.amazon.cn', 'item.taobao.com', 'detail.tmall.com', 'store.nike.com', 'www.yougou.com', 'seoul.yougou.com'];
app.get('/info', function (req, res) {
    var goodsUrl = req.query.url;
    var goodsUrlHost = '';
    if(goodsUrl){
        var urlInfo = url.parse(goodsUrl, true, true);
        goodsUrlHost = urlInfo.host;
        if(allowHostname.indexOf(goodsUrlHost) == -1){
            res.json({
                Status: false,
                Msg: '请求地址不在抓取访问'
            })
        }
    }

    switch(goodsUrlHost){
        case 'www.amazon.cn':
            amazon.getInfo(goodsUrl ,function(error, itemInfo){
                res.json({ Status: true, Data: itemInfo});
            })
            break;
        case 'item.taobao.com':
        case 'detail.tmall.com':
            taobao.getInfo(goodsUrl ,function(error, itemInfo){
                res.json({ Status: true, Data: itemInfo});
            })
            break;
        case 'store.nike.com':
            nikeStore.getInfo(goodsUrl ,function(error, itemInfo){
                res.json({ Status: true, Data: itemInfo});
            })
            break;
        case 'www.yougou.com':
        case 'seoul.yougou.com':
            yougou.getInfo(goodsUrl ,function(error, itemInfo){
                res.json({ Status: true, Data: itemInfo});
            })
            break;
        default:
            res.json({
                Status: false,
                Msg: '请求地址不在抓取访问'
                });
            break;
    }
})


app.listen(3000,function(){
   console.log('listen 3000');
})

