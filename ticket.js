var express = require('express'), app = express();
var url = require('url');
var request = require('request');

var taobao = require('./lib/ticket/taobao');
var taobaov2 = require('./lib/ticket/taobaov2');

app.get('/t',function(req,res){
    taobaov2.getInfo('https://auxdq.tmall.com', function(error, itemInfo){
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
    var sellerId = req.query.sellerId;
    var key = req.query.key;

    taobaov2.getInfo(activityId , itemId, sellerId, key, function(error, itemInfo){
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

app.get('/detail', function (req, res) {
    var activityId = req.query.activityId;
    var itemId = req.query.itemId;
    var sellerId = req.query.sellerId;
    var key = req.query.key;

    taobaov2.getInfo(activityId , itemId, sellerId, key, function(error, itemInfo){
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

app.listen(3011, function () {
    console.log('listen 3011')
});