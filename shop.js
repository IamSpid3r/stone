var express = require('express'), app = express();
var url = require('url');
var request = require('request');


var taobao = require('./lib/shop/taobaoShop');


app.get('/t',function(req,res){
    taobao.getInfo('https://auxdq.tmall.com',function(error,itemInfo){
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
    if(host.indexOf('taobao') != -1 || host.indexOf('tmall') != -1){
        return taobao;
    }else{
        return '';
    }
}

app.listen(3002);