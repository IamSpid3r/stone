// var request = require('request');
// var _ = require('lodash');
// var jschardet = require('jschardet');
// var cheerio = require('cheerio');
// // var zlib = require('zlib');
var fs = require('fs');
var express = require('express'), app = express();
var server = require('http').createServer(app);
var compress = require('compression');
var bodyParser = require('body-parser');
var url = require('url');
var request = require('request');
var domain = require('domain');

var taobao = require('./lib/taobao');
var taobaoV2 = require('./lib/taobaoV2');
var amazonCn = require('./lib/amazonCn');
var nikeStore = require('./lib/nikeStore');
var yougou = require('./lib/yougou');
var _6pm = require('./lib/6pm');
var shihuoHaitao = require('./lib/shihuoHaitao');
var shihuoTuangou = require('./lib/shihuoTuangou');
var amazonJp = require('./lib/amazonJp');
var amazonUsa = require('./lib/amazonUsa');
var nbaStore = require('./lib/nbaStore');
var yohobuy = require('./lib/yohobuy');
var yintai = require('./lib/yintai');
var kaluli = require('./lib/kaluli');
var footlocker = require('./lib/footlocker');
var jd = require('./lib/jd');
var underarmour = require('./lib/underarmour');
var xtep = require('./lib/xtep');
// 适合卡路里的考拉拉取方式
// var kaola = require('./lib/kaola');
var kaola = require('./lib/kaola');
var beibei = require('./lib/kaluli/beibei');
var meitun = require('./lib/kaluli/meitun');
var xiji = require('./lib/kaluli/xiji');

var taobaos11 = require('./lib/shuang11/taobaoV2');
var taobaos12 = require('./lib/shuang12/taobao');
var suning = require('./lib/suning');
var gome = require('./lib/gome');
var du = require('./lib/du');
var iherb = require('./lib/iherb');
var abcpost = require('./lib/abcpost');
var apo = require('./lib/cnapo');
var mia = require('./lib/mia');
var chemistdirect = require('./lib/chemistdirect');

var taobaos112017 = require('./lib/shuang112017/taobao');

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
    var goodsUrl = req.query.url;
    var urlInfo = goodsUrl ?  url.parse(goodsUrl, true, true) : {path:'',host:''};

    var storeObj = getStoreObj(urlInfo);
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
    var goodsUrl = req.query.url;
    var urlInfo = goodsUrl ?  url.parse(goodsUrl, true, true) : {path:'',host:''};

    taobaoV2.getInfo(encodeURI(goodsUrl) ,function(error, itemInfo){
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

    var storeObj = getStoreObj(urlInfo);
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
    console.log(url)
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
var pushUrlhandler = require('./apps/evolution/pushUrl').handler;
app.post('/push', function (req, res) {
    pushUrlhandler(req, res);
})

//按taskid获取信息
var getTaskInfohandler = require('./apps/evolution/getTaskInfo').handler;
app.post('/getTaskInfo', function (req, res) {
    getTaskInfohandler(req, res);
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
        case 'www.amazon.cn':
            return amazonCn;
        case 'www.amazon.co.jp':
            return amazonJp;
        case 'www.amazon.com':
            return amazonUsa;
        case 'item.taobao.com':
        case 'detail.tmall.com':
        case 'detail.tmall.hk':
            return taobao;
        //return taobaoV2;
        case 'store.nike.com':
        case 'www.nike.com':
            return nikeStore;
        case 'www.yougou.com':
        case 'seoul.yougou.com':
            return yougou;
        case 'www.shihuo.cn':
            var xianhuoExp = /\/xianhuo\/buy\/(\d+)(-(\d+)){0,1}\.html/ig;
            var haitaoExp = /\/haitao\/buy\/(\d+)(-(\d+)){0,1}\.html/ig;
            var tuangouExp = /\/tuangou\/(\d+)/ig;

            if(xianhuoExp.exec(urlInfo.path) || haitaoExp.exec(urlInfo.path)){
                return shihuoHaitao;
            }else if(tuangouExp.exec(urlInfo.path)){
                return shihuoTuangou;
            }else{
                return '';
            }
        case 'www.haitaodashi.cn':
            var haitaoExp = /\/haitao\/buy\/(\d+)(-(\d+)){0,1}\.html/ig;

            if(haitaoExp.exec(urlInfo.path)){
                return shihuoHaitao;
            }else{
                return '';
            }
        case 'www.6pm.com':
            return _6pm;
        case 'store.nba.com':
            return nbaStore;
        case 'item.yohobuy.com':
            return yohobuy;
        case 'item.yintai.com':
            return yintai;
        case 'www.kaluli.com':
            return kaluli;
        case 'www.footlocker.com':
            return footlocker;
        case 'item.jd.com':
        case 'item.jd.hk':
            return jd;
        case 'www.underarmour.cn':
            return underarmour;
        case 'www.xtep.com.cn':
            return xtep;
        case 'www.kaola.com':
        case 'www.kaola.com.hk':
            return kaola;

        // 贝贝网
        case 'global.beibei.com':
        case 'www.beibei.com':
        case 'you.beibei.com':
            return beibei;
        //美囤网
        case 'item.meitun.com':
            return meitun;
        //西集网
        case 'www.xiji.com':
            return xiji;


        case 'product.suning.com':
            return suning;
        case 'item.gome.com.cn':
            return gome;
        case 'du.hupu.com':
        case 'dev.du.hupu.com':
            return du;
        case 'cn.iherb.com':
            return iherb;
        case 'cn.chemistdirect.com.au':
        case 'cn.pharmacy4less.com.au':
        case 'cn.pharmacyonline.com.au':
        case 'cn.pharmacydirect.co.nz':
        case 'cn.discount-apotheke.de':
        case 'cn.amcal.com.au':
            return chemistdirect;
        case 'www.abcpost.com.au':
            return abcpost;
        case 'cn.apo.com':
            return apo;
        //蜜芽

        case 'www.miyabaobei.hk':
        case 'www.mia.com':
            return mia;
        default:
            return '';
    }
}

app.get('/qqq', function (req, res) {
    content = JSON.stringify({'header':res.req.headers,'ip':req.ip});

    fs.writeFile(process.cwd()+"/logs/tmp33.txt", content,  function(err) {
        if (err) {
            return console.error(err);
        }

        return true
    });

    console.log({'header':res.req.headers,'ip':req.ip})
    res.send({'header':res.req.headers,'ip':req.ip, iplist:[
        req.headers['x-forwarded-for'] ,
        req.connection.remoteAddress ,
        req.socket.remoteAddress ,
    ]}).end();
})

app.listen(3000,function(){
    console.log('listen 3000');
})

