var fs = require('fs');
var express = require('express'), app = express();
var server = require('http').createServer(app);
var compress = require('compression');
var bodyParser = require('body-parser');
var url = require('url');
var request = require('request');
var domain = require('domain');

var taobao = require('./lib/merchant_ticket/taobao');
var taobaov2 = require('./lib/merchant_ticket/taobaov2');
var jd = require('./lib/merchant_ticket/jd');

app.use(compress());
app.use(bodyParser.json());
app.use(express.static('mochawesome-reports'));

app.use(function (req, res, next) {
    var reqDomain = domain.create();
    reqDomain.on('error', function (e) {
        try {
            var killTimer = setTimeout(function () {
                process.exit(1);
            }, 30000);
            killTimer.unref();
            server.close();

            var stack = JSON.stringify(e.stack);
            res.json({
                Status: false,
                Msg: {
                    Errors: {
                        Code: 'Error',
                        Message: stack.slice(0, 200)
                    }
                }
            });
        } catch (e) {
            console.log('error when exit', e.stack);
        }
    });

    reqDomain.run(next);
});



app.get('/info', function (req, res) {
    var urlStr = req.query.url;
    var shopId = req.query.shopId;
    var sellerId = req.query.sellerId;
    var v = req.query.v || '';

    var taobaoReg = /(taobao|tmall)\.com/ig;
    var jdReg = /jd\.com/ig;
    if (taobaoReg.exec(urlStr)) {
        if (v.indexOf('v2') > -1) {
            taobaov2.getInfo(urlStr ,shopId, sellerId, function(error, itemInfo){
                if(error){
                    return res.json({
                        Status: false,
                        Msg: error
                    }).end();
                }else{
                    return res.json({ Status: true, Data: itemInfo}).end();
                }
            })
        } else {
            taobao.getInfo(urlStr ,shopId, function(error, itemInfo){
                if(error){
                    res.json({
                        Status: false,
                        Msg: error
                    }).end();
                }else{
                    res.json({ Status: true, Data: itemInfo}).end();
                }
            })
        }
        return;
    }
    if (jdReg.exec(urlStr)) {
        jd.getInfo(urlStr ,shopId, function(error, itemInfo){
            if(error){
                res.json({
                    Status: false,
                    Msg: error
                }).end();
            }else{
                res.json({ Status: true, Data: itemInfo}).end();
            }
        })
        return;
    }

    return res.json({
        Status: false,
        Msg: {
            Errors: {
                Code: 'Fatal',
                Message: '当前地址不支持爬取'
            }
        }
    }).end();
})




// uncaughtException 避免程序崩溃
process.on('uncaughtException', function (err) {
    try {
        var killTimer = setTimeout(function () {
            process.exit(1);
        }, 30000);
        killTimer.unref();

        server.close();
    } catch (e) {
        console.log('error when exit', e.stack);
    }
});

//获取商城对象
function getStoreObj(urlStr){
    var taobaoReg = /(taobao|tmall)\.com/ig;
    var jdReg = /jd\.com/ig;

    if (taobaoReg.exec(urlStr)) {
        if (urlStr.indexOf('v2')) {
            return taobaov2;
        }
        return taobao;
    }
    if (jdReg.exec(urlStr)) {
        return jd;
    }
    return null;
}

app.listen(3012,function(){
   console.log('listen 3012');
})

