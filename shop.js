var express = require('express'), app = express();
var url = require('url');
var request = require('request');


var taobao = require('./lib/shop/taobaoShop');
var nikeStore = require('./lib/shop/nikeShop');
var amazoncnStore = require('./lib/shop/amazoncnShop');


app.get('/t',function(req,res){
    taobao.getInfo('https://auxdq.tmall.com',1,function(error,itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })
})

app.get('/info', function (req, res) {
    var goodsUrl = req.query.url;
    var page = req.query.page ? req.query.page : 1;
    var goodsUrlHost = '';
    if(goodsUrl){
        var urlInfo = url.parse(goodsUrl, true, true);
        goodsUrlHost = urlInfo.host;
    }

    var storeObj = getStoreObj(goodsUrlHost);
    if(typeof storeObj == 'object'){
        storeObj.getInfo(goodsUrl , page, function(error, itemInfo){
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
        if (host.indexOf('nike.com') > 0){
            return nikeStore;
        }else if(host.indexOf('amazon.cn') > 0){
            return amazoncnStore;
        }
        return taobao;

}

app.listen(3002);