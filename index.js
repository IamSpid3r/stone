// var request = require('request');
// var _ = require('lodash');
// var jschardet = require('jschardet');
// var cheerio = require('cheerio');
// // var zlib = require('zlib');
var fs = require('fs');
var express = require('express'), app = express();
var compress = require('compression');

// var phantom = require('phantom');
// var url = require('url');
var taobao = require('./lib/taobao');
var amazon = require('./lib/amazon');
app.use(compress());
app.get('/test', function (req, res) {
    // taobao.getInfo('https://item.taobao.com/item.htm?spm=a230r.1.14.20.EFhUKi&id=45122936450',function(error,itemInfo){
    //     res.send(itemInfo);
    // })
    amazon.getInfo('http://www.amazon.cn/gp/product/B013OOT614/ref=s9_cngwdyfloorv2-s9?pf_rd_m=A1AJ19PSB66TGU&pf_rd_s=desktop-1&pf_rd_r=0NXVQ726G3DZPAQBVMTQ&pf_rd_t=36701&pf_rd_p=B013OOT614&pf_rd_i=desktop',function(error,itemInfo){
        res.send(itemInfo);
    })


})
app.listen(3000)
// console.log(request);
