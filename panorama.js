var express = require('express'), app = express();
var compress = require('compression');
var url = require('url');
var request = require('request');

var stockx = require('./lib/panorama/stockx');

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
    let goodsUrl = req.query.url;
    let goodsUrlHost = '';
    
    if(goodsUrl){
        let urlInfo = url.parse(goodsUrl, true, true);
        goodsUrlHost = urlInfo.host;
    }
    //抓取数据
    let storeObj = getStoreObj(goodsUrlHost);
    if(typeof storeObj == 'object'){
        storeObj.getInfo(goodsUrl ,function(error, itemInfo){
            if(error){
                res.json({ Status: false,Msg: error});
            }else{
                res.json({ Status: true, Data: itemInfo});
            }
        })
    }else{
        res.json({ Status: false,Msg: 'not found store'});
    }
})

//获取商城对象
function getStoreObj(host){
    switch(host){
        case 'www.stockx.com':
        case 'stockx.com':
            return stockx;
    }
}
app.listen(3014, function () {
    console.log("listening 3014");
});
