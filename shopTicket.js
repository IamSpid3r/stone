var express = require('express'), app = express();
var url = require('url');
var request = require('request');

var taobao = require('./lib/shop_ticket/taobao');

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
    var url = req.query.url;
    var itemId = req.query.itemId;

    taobao.getInfo(encodeURI(url) , itemId, function(error, itemInfo){
        if(error){
            res.json({
                Status: false,
                Msg: error
            })
        }else{
            res.json({
                Status: true,
                Data: itemInfo
            })
        }
    })
})


app.listen(3010);