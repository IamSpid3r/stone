var express = require('express'), app = express();
var url = require('url');
var request = require('request');

var taobao = require('./lib/shop_ticket/taobao');
var jd = require('./lib/shop_ticket/jd');

app.get('/t',function(req,res){
    taobao.getInfo('https://auxdq.tmall.com', function(error, itemInfo){
        if(error){
            res.send(error);
        }else{
            res.send(itemInfo);
        }
    })
})

app.get('/info', function (req, res) {
    var urlStr = req.query.url;
    var itemId = req.query.itemId;

    storeObj = getStoreObj(urlStr);
    if(typeof storeObj == 'object'){
        storeObj.getInfo(encodeURI(urlStr) , itemId, function(error, itemInfo){
            if(error){
                res.json({
                    Status: false,
                    Msg: error
                }).end();
            }else{
                res.json({ Status: true, Data: itemInfo}).end();
            }
        })
    }else{
        res.json({
            Status: false,
            Msg: {
                Errors: {
                    Code: 'Fatal',
                    Message: '当前地址不支持爬取'
                }
            }
        }).end();
    }
})

//获取商城对象
function getStoreObj(urlStr){
    var taobaoReg = /(taobao|tmall)\.com/ig;
    var jdReg = /jd\.com/ig;

    if (taobaoReg.exec(urlStr)) {
        return taobao;
    }
    if (jdReg.exec(urlStr)) {
        return jd;
    }
    return null;
}


app.listen(3010);