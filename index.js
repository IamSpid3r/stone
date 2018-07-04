// var request = require('request');
var _ = require('lodash');
// var jschardet = require('jschardet');
// var cheerio = require('cheerio');
// // var zlib = require('zlib');
const fs = require('fs');
const express = require('express'), app = express();
const server = require('http').createServer(app);
const compress = require('compression');
const bodyParser = require('body-parser');
const url = require('url');
const request = require('request');
const domain = require('domain');

const NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';

const taobaos11 = require(process.cwd()+'/lib/shuang11/taobaoV2');
const taobaos12 = require(process.cwd()+'/lib/shuang12/taobao');
const taobaos112017 = require('./lib/shuang112017/taobao');
const taobaoOrigin =  require(process.cwd()+'/lib/special/taobao');  //淘宝原始抓取信息

const writeTaskhandler = require('./apps/evolution/writeTask').handler;
const getTaskInfohandler = require('./apps/evolution/getTaskInfo').handler;
const getCrawlTaskInfohandler = require('./apps/evolution/getCrawlTaskInfo').handler;
const getCrawlStatInfohandler = require('./apps/evolution/getCrawlStatInfo').handler;

//淘宝店铺信息
const taobaoShop = require('./lib/taobaoShop');

//商城集合
const store = require(process.cwd()+'/lib/store');

app.use(compress());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ limit: '50mb',extended: true }));
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
            console.log('error when exit', e.message);
        }
    });

    reqDomain.run(next);
});


app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

app.get('/info', function (req, res) {
    var goodsUrl = req.query.url;
    var urlInfo = goodsUrl ?  url.parse(goodsUrl, true, true) : {path:'',host:''};
    var storeObj = store.getStore(urlInfo);
    if(typeof storeObj == 'object'){
        storeObj.getInfo(goodsUrl ,function(error, itemInfo){
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

app.get('/taobao', function (req, res) {
    var id = req.query.id;
    if (!id)  {
        res.json({
            Status: false,
            Msg: '缺少商品id'
        }).end();
    }

    taobaoOrigin.getInfo(id ,function(error, itemInfo){
        if(error){
            res.json({
                Status: false,
                Msg: error
            }).end();
        }else{
            res.json({ Status: true, Data: itemInfo}).end();
        }
    })
})


app.get('/i', function (req, res) {
    var goodsUrl = req.query.url;
    var urlInfo = goodsUrl ?  url.parse(goodsUrl, true, true) : {path:'',host:''};

    var storeObj = store.getStore(urlInfo);
    if(typeof storeObj == 'object'){
        storeObj.getInfo(encodeURI(goodsUrl) ,function(error, itemInfo){
            if(error){
                res.json({
                    Status: false,
                    Msg: error
                })
            }else{
                var colorCount = 0,
                    sizeCount = 0,
                    itemCount = 0,
                    minPrice = 0,
                    minPriceType = 'RMB';

                itemInfo.Variations.forEach(function(val){
                    if(val.Name == '尺码'){
                        sizeCount = val.Values.length;
                    }else if((val.Name == '颜色')){
                        colorCount = val.Values.length;
                    }
                })
                itemInfo.Items.forEach(function(val){
                    if(minPrice == 0) {
                        minPrice = val.Offers[0].List[0].Price;
                        minPriceType = val.Offers[0].List[0].Type;
                    }else if(val.Offers[0].List[0].Price < minPrice){
                        minPrice = val.Offers[0].List[0].Price;
                        minPriceType = val.Offers[0].List[0].Type;
                    }
                })
                itemCount = itemInfo.Items.length;

                itemInfo.ItemAttributes.Price = minPrice;
                itemInfo.ItemAttributes.PriceType = minPriceType;
                itemInfo.ItemAttributes.ColorCount = colorCount;
                itemInfo.ItemAttributes.SizeCount = sizeCount;
                itemInfo.ItemAttributes.ItemCount = itemCount;

                delete itemInfo.Variations;
                delete itemInfo.Items;

                res.json({ Status: true, Data: itemInfo});
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
        })
    }
})

app.get('/s11', function (req, res) {
    var url = req.query.url;
    taobaos11.getInfo(encodeURI(url) ,function(error, itemInfo){
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

app.get('/s12', function (req, res) {
    var url = req.query.url;
    taobaos12.getInfo(encodeURI(url) ,function(error, itemInfo){
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


app.get('/s112017', function (req, res) {
    var url = req.query.url;
    taobaos112017.getInfo(encodeURI(url) ,function(error, itemInfo){
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

app.get('/test', function (req, res) {
    var url = req.query.url;
    taobaoV2.getInfo(encodeURI(url) ,function(error, itemInfo){
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

//接收推送
app.post('/push', function (req, res) {
    writeTaskhandler(req, res);
})
app.get('/push', function (req, res) {
    writeTaskhandler(req, res);
})

//按taskid获取信息
app.get('/getTaskInfo', function (req, res) {
    getTaskInfohandler(req, res);
})
//按taskid获取信息
app.get('/getCrawlTaskInfo', function (req, res) {
    getCrawlTaskInfohandler(req, res);
})
//按类型获取统计信息
app.get('/getCrawlStatInfo', function (req, res) {
    getCrawlStatInfohandler(req, res);
})

//获取抓取任务
// app.get('/getCrawlTask', function (req, res) {
//     getcrawltask.getMainList(req, res);
// })
//保存抓取任务
// app.post('/saveCrawlInfo', function (req, res) {
//     savecrawlinfo.saveData(req, res);
// })

//根据商品url查看店铺基本信息
app.get('/shopinfo', function (req, res) {
    var goodsUrl = req.query.url;
    var urlInfo = goodsUrl ?  url.parse(goodsUrl, true, true) : {path:'',host:''};

    var storeObjShop = getStoreObjShop(urlInfo);
    if(typeof storeObjShop == 'object'){
        storeObjShop.getInfo(goodsUrl ,function(error, itemInfo){
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

//获取商城店铺对象
function getStoreObjShop(urlInfo){
    switch(urlInfo.host){
        case 'item.taobao.com':
        case 'detail.tmall.com':
        case 'detail.tmall.hk':
            return taobaoShop;
        default:
            return taobaoShop;
            break;
    }
}

app.get('/qqq', function (req, res) {
    console.log(req.headers['x-forwarded-for'])
    res.send({'ip': req.headers['x-forwarded-for']}).end();
})

app.get('/cookie',function(req,res){
    if(!req.query.name){
        res.json({
            Status: false,
            Msg: '缺少指定的cookie名称'
        }).end();
    }
    let content = fs.readFileSync(process.cwd() + '/logs/' + 'taobaoCookie' + _.upperFirst(req.query.name) +'.txt');
    console.log(content);
    if(content){
        res.json({ Status: true, Data: content.toString()}).end();
    }else{
        res.json({
            Status: false,
            Msg: '获取指定cookie内容失败'
        }).end();
    }
});

app.listen(3000,function(){
    console.log('listen 3000');
})

