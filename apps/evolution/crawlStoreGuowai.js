var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var crawltaskConfig = config.crawltask;
const tableStore = require(process.cwd()+"/apps/lib/tablestorecrawl.js").tableStore;
var request = require('request');
var url = require('url');
const fun = require(process.cwd()+"/apps/lib/fun.js");
const Q = require("q");
var taobao = require('../../lib/taobao');
var taobaoV2 = require('../../lib/taobaoV2');
var amazonCn = require('../../lib/amazonCn');
var nikeStore = require('../../lib/nikeStore');
var yougou = require('../../lib/yougou');
var _6pm = require('../../lib/6pm');
var shihuoHaitao = require('../../lib/shihuoHaitao');
var shihuoTuangou = require('../../lib/shihuoTuangou');
var amazonJp = require('../../lib/amazonJp');
var amazonUsa = require('../../lib/amazonUsa');
var nbaStore = require('../../lib/nbaStore');
var yohobuy = require('../../lib/yohobuy');
var yintai = require('../../lib/yintai');
var kaluli = require('../../lib/kaluli');
var footlocker = require('../../lib/footlocker');
var jd = require('../../lib/jd');
var underarmour = require('../../lib/underarmour');
var xtep = require('../../lib/xtep');
// 适合卡路里的考拉拉取方式
// var kaola = require('./lib/kaola');
var kaola = require('../../lib/kaola');
var beibei = require('../../lib/kaluli/beibei');
var meitun = require('../../lib/kaluli/meitun');
var xiji = require('../../lib/kaluli/xiji');

var taobaos11 = require('../../lib/shuang11/taobaoV2');
var taobaos12 = require('../../lib/shuang12/taobao');
var suning = require('../../lib/suning');
var gome = require('../../lib/gome');
var du = require('../../lib/du');
var iherb = require('../../lib/iherb');
var abcpost = require('../../lib/abcpost');
var apo = require('../../lib/cnapo');
var mia = require('../../lib/mia');
var chemistdirect = require('../../lib/chemistdirect');

var taobaos112017 = require('../../lib/shuang112017/taobao');

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
                'shop_name' : data.Data.ItemAttributes.ShopName
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
	        controller.callbackData(crawltaskConfig.postUrl,taskId,response,'error').then(function (res) {
	        	
	        },function (err) {
	        	console.log(err.message)
				
			})
}

//处理
var deal = function(){
	console.log('start guowai')
	
		controller.getData(crawltaskConfig.getUrl+'?store=guowai').then(function (res) {
		    if (res.code == 200){
		    
		    	console.log(res.data.url)
			    var urlInfo = res.data.url ?  url.parse(res.data.url, true, true) : {path:'',host:''};
		    	var storeObj = getStoreObj(urlInfo);
			    if(typeof storeObj == 'object'){
			        storeObj.getInfo(res.data.url ,function(error, itemInfo){
			            if(error){
			            	dealerrorcallback(res.data.task_id, error);
			            }else{
			                //保存tablestore
			                var dataJson = { Status: true, Data: itemInfo};
			                controller.insertTableStore(res.data.task_id, itemInfo.Unique, res.data.url, dataJson, function (err, rows) {
				                if (err) {
				                	dealerrorcallback(res.data.task_id, err.message);
				                } else {
				                    console.log('success')
				                    //callback
				                    controller.callbackData(crawltaskConfig.postUrl,res.data.task_id,dataJson,'success').then(function (res) {
				                    	console.log(res)
				                    },function (err) {
				                    	console.log(err)
				                    	dealerrorcallback(res.data.task_id, err.message);
									})
				                }
				            })
			            }
			        })
			    }else{
			    	dealerrorcallback(res.data.task_id, '当前地址不支持爬取');
			    }

		    } else {

		    }
		},function (err) {
		    console.log(err.message)
            
		})
	
}



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

//start
setInterval(function(){
    deal();
},4000)




