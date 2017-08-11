var express = require('express'), app = express();
var url = require('url');
var request = require('request');

var taobao = require('./lib/ticket/taobao');

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
    var activityId = req.query.activityId;
    var itemId = req.query.itemId;

    taobao.getInfo(activityId , itemId, function(error, itemInfo){
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


app.listen(3011);