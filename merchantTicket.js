var fs = require('fs');
var express = require('express'), app = express();
var server = require('http').createServer(app);
var compress = require('compression');
var bodyParser = require('body-parser');
var url = require('url');
var request = require('request');
var domain = require('domain');

var taobao = require('./lib/merchant_ticket/taobao');

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
                        Message: stack.slice(0, 120)
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
    var goodsUrl = req.query.url;
    var urlInfo = goodsUrl ?  url.parse(goodsUrl, true, true) : {path:'',host:''};

    var storeObj = getStoreObj(urlInfo);
    if(typeof storeObj == 'object'){
        storeObj.getInfo(encodeURI(goodsUrl) ,function(error, itemInfo){
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




// uncaughtException 避免程序崩溃
process.on('uncaughtException', function (err) {
    console.log('uncaughtException->',err);

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
function getStoreObj(urlInfo){
    switch(urlInfo.host){
        case 'item.taobao.com':
        case 'detail.tmall.com':
        case 'detail.tmall.hk':
            return taobao;
        default:
            return '';
    }
}

app.listen(3012,function(){
   console.log('listen 3012');
})

