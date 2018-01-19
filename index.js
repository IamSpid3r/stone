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
var delemei = require('./lib/kaluli/delemei');
var ba = require('./lib/kaluli/ba');
var kiwi = require('./lib/kaluli/kiwistarcare');
var uka = require('./lib/uka');
var discovery = require('./lib/kaluli/discovery');
var dod = require('./lib/kaluli/dod');
var pharmacyonline = require('./lib/kaluli/pharmacyonline');



var taobaos11 = require('./lib/shuang11/taobaoV2');
var taobaos12 = require('./lib/shuang12/taobao');
var suning = require('./lib/suning');
var gome = require('./lib/gome');
var du = require('./lib/du');
var iherb = require('./lib/iherb');
var abcpost = require('./lib/kaluli/abcpost');
var apo = require('./lib/kaluli/cnapo');
// var mia = require('./lib/mia');蜜芽新测试
var mia = require('./lib/kaluli/mia');
var chemistdirect = require('./lib/chemistdirect');

var taobaos112017 = require('./lib/shuang112017/taobao');
var getcrawltask = require('./apps/evolution/getCrawlTask');
var savecrawlinfo = require('./apps/evolution/saveCrawlInfo');
var writeTaskhandler = require('./apps/evolution/writeTask').handler;
var getTaskInfohandler = require('./apps/evolution/getTaskInfo').handler;

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

//获取抓取任务
app.get('/getCrawlTask', function (req, res) {
    getcrawltask.getMainList(req, res);
})
//保存抓取任务
app.post('/saveCrawlInfo', function (req, res) {
    savecrawlinfo.saveData(req, res);
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
            break;
        case 'www.amazon.co.jp':
            return amazonJp;
            break;
        case 'www.amazon.com':
            return amazonUsa;
            break;
        case 'item.taobao.com':
        case 'detail.tmall.com':
        case 'detail.tmall.hk':
            return taobao;
            break;
        //return taobaoV2;
        case 'store.nike.com':
        case 'www.nike.com':
            return nikeStore;
            break;
        case 'www.yougou.com':
        case 'seoul.yougou.com':
            return yougou;
            break;
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
            break;
        case 'www.haitaodashi.cn':
            var haitaoExp = /\/haitao\/buy\/(\d+)(-(\d+)){0,1}\.html/ig;

            if(haitaoExp.exec(urlInfo.path)){
                return shihuoHaitao;
            }else{
                return '';
            }
            break;
        case 'www.6pm.com':
            return _6pm;
            break;
        case 'store.nba.com':
            return nbaStore;
            break;
        case 'item.yohobuy.com':
        case 'www.yohobuy.com':
            return yohobuy;
            break;
        case 'item.yintai.com':
            return yintai;
            break;
        case 'www.kaluli.com':
            return kaluli;
            break;
        case 'www.footlocker.com':
            return footlocker;
            break;
        case 'item.jd.com':
        case 'item.jd.hk':
            return jd;
            break;
        case 'www.underarmour.cn':
            return underarmour;
            break;
        case 'www.xtep.com.cn':
            return xtep;
        case 'www.kaola.com':
        case 'www.kaola.com.hk':
            return kaola;
            break;

        // 贝贝网
        case 'global.beibei.com':
        case 'www.beibei.com':
        case 'you.beibei.com':
            return beibei;
            break;
        //美囤网
        case 'item.meitun.com':
            return meitun;
            break;
        //西集网
        case 'www.xiji.com':
            return xiji;
            break;

        case 'product.suning.com':
            return suning;
            break;
        case 'item.gome.com.cn':
            return gome;
            break;
        case 'du.hupu.com':
        case 'dev.du.hupu.com':
            return du;
            break;
        case 'cn.iherb.com':
            return iherb;
        case 'cn.chemistdirect.com.au':
        case 'cn.pharmacy4less.com.au':
        // case 'cn.pharmacyonline.com.au':
        case 'cn.pharmacydirect.co.nz':
        case 'cn.discount-apotheke.de':
        case 'cn.amcal.com.au':
            return chemistdirect;
            break;
        case 'cn.pharmacyonline.com.au':
            return pharmacyonline;
            break;
        case 'www.abcpost.com.au':
            return abcpost;
            break;
        case 'cn.apo.com':
            return apo;
            break;
        //蜜芽
        case 'www.miyabaobei.hk':
        case 'www.mia.com':
            return mia;
            break;
        case 'www.delemei.de':
            return delemei;
        case 'www.ba.de':
            return ba;
        case 'www.kiwistarcare.com':
            return kiwi;
        case 'cn.unserekleineapotheke.de':
            return uka;
        case 'cn.kiwidiscovery.co.nz':
            return discovery;
        case 'cn.dod.nl':
            return dod;
        default:
            return '';
            break;
    }
}

// app.get('/qqq', function (req, res) {
//     content = JSON.stringify({'header':res.req.headers,'ip':req.ip});
//
//     fs.writeFile(process.cwd()+"/logs/tmp33.txt", content,  function(err) {
//         if (err) {
//             return console.error(err);
//         }
//
//         return true
//     });
//
//     console.log({'header':res.req.headers,'ip':req.ip})
//     res.send({'header':res.req.headers,'ip':req.ip, iplist:[
//         req.headers['x-forwarded-for'] ,
//         req.connection.remoteAddress ,
//         req.socket.remoteAddress ,
//     ]}).end();
// })

app.listen(3000,function(){
    console.log('listen 3000');
})

