var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var crawltaskConfig = config.crawltask;
const tableStore = require(process.cwd()+"/apps/lib/tablestorecrawl.js").tableStore;
var request = require('request');
var url = require('url');
const fun = require(process.cwd()+"/apps/lib/fun.js");
const Q = require("q");
const cluster = require('cluster');
var nikeStore = require('../../lib/nikeStore');
var _6pm = require('../../lib/6pm');
var farfetch = require('../../lib/farfetch');
var shihuoHaitao = require('../../lib/shihuoHaitao');
var amazonJp = require('../../lib/amazonJp');
var amazonUsa = require('../../lib/amazonUsa');
var nbaStore = require('../../lib/nbaStore');
var underarmour = require('../../lib/underarmour');
// 适合卡路里的考拉拉取方式
var delemei = require('../../lib/kaluli/delemei');
var footlocker = require('../../lib/footlocker');
var ba = require('../../lib/kaluli/ba');
var kiwi = require('../../lib/kaluli/kiwistarcare');
var uka = require('../../lib/uka');
var discovery = require('../../lib/kaluli/discovery');
var dod = require('../../lib/kaluli/dod');
var abcpost = require('../../lib/kaluli/abcpost');
var apo = require('../../lib/kaluli/cnapo');
var iherb = require('../../lib/iherb');
var chemistdirect = require('../../lib/kaluli/chemistdirect');
var pharmacy4less = require('../../lib/kaluli/pharmacy4less');
var pharmacydirect = require('../../lib/kaluli/pharmacydirect');
var discountApotheke = require('../../lib/kaluli/discountApotheke');
var amcal = require('../../lib/kaluli/amcal');
var pharmacyonline = require('../../lib/kaluli/pharmacyonline');


var task_id;//当前在跑的任务id

var controller = {
    getData:function(url){
        var defer = Q.defer();
        request(url, function (error, response, body) {
		  if (!error && response.statusCode == 200) {
		  	
		    return defer.resolve(JSON.parse(body));
		  } else {
		  	return defer.reject(error);
			}
		})
        return defer.promise;
    },
    insertTableStore : function (taskId, skuId, url, data, callback) {
        var attributes = [];
        attributes.push({
            'data' : JSON.stringify(data),
        })
        attributes.push({
            'url' : url
        })
        attributes.push({
            'store' : fun.getStore(url)
        })
        if (data.Status) {
            attributes.push({
                'status' : data.Data.Status
            })
            attributes.push({
                'handle_status' : 1
            })
            attributes.push({
                'update_status' : 'success'
            })
            attributes.push({
                'shop_name' : 'ShopName' in data.Data.ItemAttributes ? data.Data.ItemAttributes.ShopName : ''
            })
        } else {
            attributes.push({
                'update_status' : 'error'
            })
        }
        tableStore.Insert(taskId, skuId, attributes, callback)
    },
    callbackData:function(url, taskId, data, status){
        var defer = Q.defer();
        request.post(url, {form:{task_id:taskId,data:JSON.stringify(data),status:status}}, function (error, response, body) {
		  if (!error && response.statusCode == 200) {
		    return defer.resolve({status:true});
		  } else {
		  	return defer.reject(error);
			}
		})
        return defer.promise;
    }
}

var dealerrorcallback = function(taskId,error){
	var response = {Status:false,Msg:{Errors:[{Code:'Error',Message:error}]}}
			//callback
	        controller.callbackData(crawltaskConfig.postUrl.guowai,taskId,response,'error').then(function (res) {
	        	//start
                deal();
	        },function (err) {
	        	console.log(err.message)
				setTimeout(function(){
                    //start
                    deal();
                },1000)
			})
}


//处理
var deal_time;
var deal = function(){
    deal_time = (new Date()).getTime();
    task_id = '';

    console.log(cluster.worker.id + ' start guowai');
    controller.getData(crawltaskConfig.getUrl.guowai+'?store=guowai').then(function (res) {
        if (res.code == 200){
            console.log(cluster.worker.id + ' crawl ' +res.data.url);

            task_id = res.data.task_id;
            //记日志
            fun.stoneLog('crawlStoreGuowai', 'info', {"param1" : task_id, "param2":res.data.url, "param":{"message":"开始处理"}})
            var urlInfo = res.data.url ?  url.parse(res.data.url, true, true) : {path:'',host:''};
            var storeObj = getStoreObj(urlInfo);
            if(typeof storeObj == 'object'){
                storeObj.getInfo(res.data.url ,function(error, itemInfo){
                    if(error){
                        console.log(cluster.worker.id + ' crawl error'+ error);
                        fun.stoneLog('crawlStoreGuowai', 'error', {"param1" : task_id, "param2":res.data.url, "param":{"message":error}})
                        dealerrorcallback(res.data.task_id, error);
                    }else{
                        //保存tablestore
                        var dataJson = { Status: true, Data: itemInfo};
                        controller.insertTableStore(res.data.task_id, itemInfo.Unique, res.data.url, dataJson, function (err, rows) {
                            if (err) {
                                fun.stoneLog('crawlStoreGuowai', 'error', {"param1" : task_id, "param2":res.data.url, "param":{"message":'保存tablestore失败--'+err.message}})
                                dealerrorcallback(res.data.task_id, err.message);
                            } else {
                                console.log(cluster.worker.id + ' success');
                                fun.stoneLog('crawlStoreGuowai', 'info', {"param1" : task_id, "param2":res.data.url, "param":{"message":'保存tablestore成功'}})
                                //callback
                                controller.callbackData(crawltaskConfig.postUrl.guowai,res.data.task_id,dataJson,'success').then(function (result) {
                                    console.log(cluster.worker.id + ' success' + result)
                                    fun.stoneLog('crawlStoreGuowai', 'info', {"param1" : task_id, "param2":res.data.url, "param":{"message":'callback成功'}})
                                    //start
                                    deal();
                                },function (err) {
                                    console.log(cluster.worker.id + ' tablestore ' +err.message);
                                    fun.stoneLog('crawlStoreGuowai', 'error', {"param1" : task_id, "param2":res.data.url, "param":{"message":"callback失败--"+err.message}})
                                    dealerrorcallback(res.data.task_id, err.message);
                                })
                            }
                        })
                    }
                })
            }else{
                fun.stoneLog('crawlStoreGuowai', 'error', {"param1" : task_id, "param2":res.data.url, "param":{"message":'当前地址不支持爬取'}})
                dealerrorcallback(res.data.task_id, '当前地址不支持爬取');
            }

        } else {
            setTimeout(function(){deal();},5000)
        }
    },function (err) {
        console.log(cluster.worker.id + ' stone ' +err.message);
        setTimeout(function(){deal();},2000)
    }).then(function(){},function(err){
        console.log(cluster.worker.id + ' stone2 ' +err.message);
        setTimeout(function(){deal();},2000)
    })
}



//获取商城对象
function getStoreObj(urlInfo){
    switch(urlInfo.host){
        case 'www.amazon.co.jp':
            return amazonJp;
        case 'www.amazon.com':
            return amazonUsa;
        case 'store.nike.com':
        case 'www.nike.com':
            return nikeStore;
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
        case 'www.farfetch.com':
            return farfetch;
        case 'store.nba.com':
            return nbaStore;
        case 'www.footlocker.com':
            return footlocker;
        case 'www.underarmour.cn':
            return underarmour;
        //卡路里抓取部分
        case 'cn.iherb.com':
            return iherb;
        case 'cn.chemistdirect.com.au':
            return chemistdirect;
        case 'cn.pharmacy4less.com.au':
            return pharmacy4less;
        case 'cn.pharmacyonline.com.au':
            return pharmacyonline;
        case 'cn.pharmacydirect.co.nz':
            return pharmacydirect;
        case 'cn.discount-apotheke.de':
            return discountApotheke;
        case 'cn.amcal.com.au':
            return amcal;
        case 'www.abcpost.com.au':
            return abcpost;
        case 'cn.apo.com':
            return apo;
        //蜜芽
        case 'www.miyabaobei.hk':
        case 'www.mia.com':
            return mia;
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
    }
}

process.on('uncaughtException', function (err) {
    console.log(err.message);
    if (task_id){
        fun.stoneLog('crawlStoreGuowai', 'error', {"param1" : task_id, "param2":'', "param":{"message":"捕捉到错误--"+err.message}})
        dealerrorcallback(task_id, err.message);
    }
});


if (cluster.isMaster) {
    for (var i = 0; i < crawltaskConfig.taskNum.guowai; i++) {
        cluster.fork();
    }
    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
        cluster.fork();
    });
} else {
    //start
    console.log("I am worker #"+cluster.worker.id);
    deal();

    //listen timeout
    setInterval(function () {
        if ((new Date()).getTime() - deal_time > 120 * 1000) {
            deal();
        }
    }, 5000)
}



