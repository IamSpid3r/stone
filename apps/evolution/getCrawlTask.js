var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var redisConfig = config.db.redis;
var SequelizeDb = require('../lib/db').db;
const Op = SequelizeDb.sequelize.Op;
const tableStore = require(process.cwd()+"/apps/lib/tablestore.js").tableStore;
const Q = require("q");
const _ = require('lodash');
var url  = require('url');
const crawlmainTaskES = require(process.cwd()+"/apps/lib/elasticsearch/crawlMainTasks.js").esClient;


var os = require("os")

var RedLock = require('redlock-node');
var ethInfo = os.networkInterfaces().eth1;

var initFlag = true;
if (!NODE_ENV &&  ethInfo != undefined){
	if (ethInfo[0].address == '47.88.18.192' || ethInfo[0].address == '47.88.77.102'){
		initFlag = false;
	}
}
if (initFlag){
	var client = require('redis').createClient(redisConfig.port,redisConfig.host);
	if (!NODE_ENV){
		//线上环境需要认证
	    client.auth(redisConfig.password);
	}
	var redlock = new RedLock(client);
} else {
	var redlock;
}

var lock;

//特殊处理的商城
var storeArr = [
	{'name':'京东'},
];
var guowaiArr = [
	{'name':'美亚'},
	{'name':'日亚'},
	{'name':'6pm'},
	{'name':'nbaStore'},
	{'name':'footlocker官网'},
	{'name':'UA官网'},
    {'name':'识货海淘'},
	// 卡路里国外
  {'name':'澳洲chemistdirect'},
  {'name':'澳洲pharmacy4less'},
  {'name':'澳洲pharmacyonline'},
  {'name':'新西兰pharmacydirect'},
  {'name':'德国discount-apotheke'},
  {'name':'德国amcal'},
  {'name':'德国apo'},
  {'name':'澳洲abcpost'},
  {'name':'德国delemei'},
  {'name':'德国BA保镖'},
  {'name':'新西兰Kiwistarcare'},
  {'name':'德国UKA'},
  {'name':'荷兰DOD'},
];
var guoneiArr = [
	{'name':'中亚'},
	{'name':'优购'},
	{'name':'NIKE官网'},
	{'name':'识货团购'},
	{'name':'有货'},
	{'name':'银泰'},
	{'name':'识货自营'},
	{'name':'卡路里商城'},
	{'name':'特步官网'},
	{'name':'考拉海购'},
	{'name':'国美在线'},
	{'name':'苏宁易购'},
    {'name':'苏宁'},
    {'name':'唯品会'},
    {'name':'考拉海购'},
	{'name':'毒'},
	{'name':'西集'},
	{'name':'美囤妈妈'},
	{'name':'贝贝'},
	{'name':'蜜芽'},
	{'name':'其他'},
];

var taobaoArr = [
	{'name':'淘宝'},
	{'name':'天猫'},
];


exports.getMainList = function(request, response) {
	handler(request, response);
}

//处理核心逻辑
var handler = function (request, response){
	var store = request.query.store;
    //验证 必须传store
    if (!store) {
        response.json({code: 400, msg: '缺少store参数'});
        return;
    }

    if (_.findIndex(storeArr, {'name':store}) != -1){//是否是需要单独获取的商城
    	redlock.lock('stone_get_crawl_task1_'+ store, 4).done(//锁3秒
		  function(lock){
		  	//拿到锁以后获取一条数据
	    	controller.getDataEs(store).then(function (data) {
		    	if(data){
		    		var redis_key = 'stone_get_crawl_task1_'+data.data.task_id;
		    		//用redis的方式存储是否获取过，防止es更新缓慢造成重复抓取的问题
		    		client.get(redis_key, function (err, reply) {
	                    if (!reply){//没有获取过
	                    	//获取完把状态更新成1（处理中）
				    		controller.updateDataEs(data.data.task_id).then(function (datas) {
				    			client.set(redis_key, 1);
		                    	client.expire(redis_key, 10);
				    			redlock.unlock(lock);//释放锁
				    			response.json({code: 200, msg: '',data:data.data});
				    		}, function (errs) {
						        redlock.unlock(lock);//释放锁
						        response.json({code: 400, msg: err.message});
						    })
	                    } else {
	                    	redlock.unlock(lock);//释放锁
	                    	//100ms后继续获取
	                    	setTimeout(function(){
	                    		handler(request, response);
	                    	},50)
	                    }
	                });
		    		
		    	} else {
		    		redlock.unlock(lock);//释放锁
		    		response.json({code: 400, msg: err.message});
		    	}
		    },function (err) {
		    	redlock.unlock(lock);//释放锁
		        response.json({code: 400, msg: err.message});
		    })
		  },function(err){
		  	//没有获取到锁则循环获取
		  	setTimeout(function(){
		  		handler(request, response);
		  	},50)
	      }); 
    } else {//其他的商城
		redlock.lock('stone_get_crawl_task1_'+ store, 4).done(//锁3秒
		  function(lock){
		  	//拿到锁以后获取一条数据
	    	controller.getDataOtherEs(store).then(function (data) {
		    	if(data){
		    		var redis_key = 'stone_get_crawl_task1_'+data.data.task_id;
		    		//用redis的方式存储是否获取过，防止es更新缓慢造成重复抓取的问题
		    		client.get(redis_key, function (err, reply) {
	                    if (!reply){//没有获取过
	                    	//获取完把状态更新成1（处理中）
				    		controller.updateDataEs(data.data.task_id).then(function (datas) {
				    			client.set(redis_key, 1);
		                    	client.expire(redis_key, 10);
				    			redlock.unlock(lock);//释放锁
				    			response.json({code: 200, msg: '',data:data.data});
				    		}, function (errs) {
						        redlock.unlock(lock);//释放锁
						        response.json({code: 400, msg: err.message});
						    })
	                    } else {
	                    	redlock.unlock(lock);//释放锁
	                    	//100ms后继续获取
	                    	setTimeout(function(){
	                    		handler(request, response);
	                    	},50)
	                    }
	                });
		    	} else {
		    		redlock.unlock(lock);//释放锁
		    		response.json({code: 400, msg: err.message});
		    	}
		    },function (err) {
		    	redlock.unlock(lock);//释放锁
		        response.json({code: 400, msg: err.message});
		        
		    })
		  },function(err){
		  	//没有获取到锁则循环获取
		  	setTimeout(function(){
		  		handler(request, response);
		  	},50)
	      }); 
    }
    return;
}

var controller = {
    getData:function(store){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({
            		attributes: ['id', 'task_id', 'url', 'store'],
	            	where: {store:store,status:0},
	            	order: [['updatedAt','asc']]
	                //[Op.or]: [{status: 0}, {status: 1}]
             	}
        	)
            .then(crawlmain => {
                if (!crawlmain){
                    throw new Error('没有任务了');
                } else {
                    return defer.resolve({
                        status : true,
                        data:crawlmain
                    });

                }
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    getDataOther:function(store){
    	if(store == 'guonei'){
    		var storeStr = _.chain(guoneiArr)
			  .map(function(mall){
			    return mall.name;
			  })
			  .value();
	    }else if(store == 'taobao'){
	    	var storeStr = _.chain(taobaoArr)
			  .map(function(mall){
			    return mall.name;
			  })
			  .value();
    	} else {
    		var storeStr = _.chain(guowaiArr)
			  .map(function(mall){
			    return mall.name;
			  })
			  .value();
    	}
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({
            		attributes: ['id', 'task_id', 'url', 'store'],
	            	where: {store: {[Op.in]:storeStr},status:0},
	            	order: [['updatedAt','asc']]
             	}
        	)
            .then(crawlmain => {
                if (!crawlmain){
                    throw new Error('没有任务了');
                } else {
                    return defer.resolve({
                        status : true,
                        data:crawlmain
                    });

                }
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    updateData:function(id){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({where:{id:id }})
            .then(crawlmain => {
                if (crawlmain){
                    crawlmain.update({
                        status:1,
                      }).then(row=>{
                        if (!row) {
                            return defer.reject(new Error('保存数据库错误'));
                        }
                        return defer.resolve({
                            status : true
                        });
                    });
                } else {
                    return defer.reject(new Error('不存在此任务'));
                }
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    getDataEs:function(store){
    	var that = this;
        var defer = Q.defer();
        
        crawlmainTaskES.search(
            { store:store, status: 0, size: 1, sort: [['from', 'desc'],['update_at', 'asc']]
        }, function (err, res) {
            if (err) {
                return defer.reject(err);
            }

            var data;
            var rows = res.hits.hits;
            if (rows.length > 0){
            	data = {
                    task_id: rows[0]._source.task_id,
                    url: rows[0]._source.url,
                    store : rows[0]._source.store
                };
            return defer.resolve({
                    status : true,
                    data:data
                });
        	} else {
        		return defer.reject('没有任务了');
        	}
        })
        return defer.promise;
    },
    getDataOtherEs:function(store){
    	if(store == 'guonei'){
    		var storeStr = _.chain(guoneiArr)
			  .map(function(mall){
			    return mall.name;
			  })
			  .value();
	    }else if(store == 'taobao'){
	    	var storeStr = _.chain(taobaoArr)
			  .map(function(mall){
			    return mall.name;
			  })
			  .value();
    	} else {
    		var storeStr = _.chain(guowaiArr)
			  .map(function(mall){
			    return mall.name;
			  })
			  .value();
    	}
        var defer = Q.defer();

        crawlmainTaskES.search(
            { store:storeStr, status: 0, size: 1, sort: [['from', 'desc'],['update_at', 'asc']]
        }, function (err, res) {
            if (err) {
                return defer.reject(err);
            }

            var data;
            var rows = res.hits.hits;
            if (rows.length > 0){
            	data = {
                    task_id: rows[0]._source.task_id,
                    url: rows[0]._source.url,
                    store : rows[0]._source.store
                };
            return defer.resolve({
                        status : true,
                        data:data
                    });
        	} else {
        		return defer.reject('没有任务了');
        	}
        })

        return defer.promise;
    },
    updateDataEs:function(taskId){
        var defer = Q.defer();
        var now = new Date();

        crawlmainTaskES.update({
            task_id: taskId,
            'status' : 1,
            'update_at' : now
        }, function (err, res) {
            if (err) {
                return defer.reject(new Error('保存ES错误'));
            }

            return defer.resolve({
                status : true
            });
        }, true)
        return defer.promise;
    }
}