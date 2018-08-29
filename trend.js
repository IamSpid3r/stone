var express = require('express'), app = express();
var url = require('url');
var request = require('request');

var taobao = require('./lib/trend/taobao');

app.get('/d',async function (req, res) {
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
    // if(1) {
        console.log('通过puppeteer抓取'+goodsUrlHost);
        try { 
            itemInfo = await taobao.getInfo(goodsUrl);
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




app.listen(3012);