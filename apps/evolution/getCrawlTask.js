var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var redisConfig = config.db.redis;
var SequelizeDb = require('../lib/db').db;
const Op = SequelizeDb.sequelize.Op;
const tableStore = require(process.cwd()+"/apps/lib/tablestore.js").tableStore;
const Q = require("q");
const _ = require('lodash');
var url  = require('url');

var RedLock = require('redlock-node');
var client = require('redis').createClient(redisConfig.port,redisConfig.host);
if (!NODE_ENV){
	//线上环境需要认证
    client.auth(redisConfig.password);
}
var redlock = new RedLock(client);
var lock;

//特殊处理的商城
var storeArr = [
	{'name':'京东'},
	{'name':'日本亚马逊'},
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
    	redlock.lock('stone_get_crawl_task_'+ store, 3).done(//锁3秒
		  function(lock){
		  	//拿到锁以后获取一条数据
	    	controller.getData(store).then(function (data) {
		    	if(data){
		    		//获取完把状态更新成1（处理中）
		    		controller.updateData(data.data.id).then(function (datas) {
		    			response.json({code: 200, msg: '',data:data.data});
		    			redlock.unlock(lock);//释放锁
		    		}, function (errs) {
				        response.json({code: 400, msg: err.message});
				        redlock.unlock(lock);//释放锁
				    })
		    	} else {
		    		redlock.unlock(lock);//释放锁
		    	}
		    },function (err) {
		        response.json({code: 400, msg: err.message});
		        redlock.unlock(lock);//释放锁
		    })
		  },function(err){
		  	//没有获取到锁则循环获取
		  	setTimeout(function(){
		  		handle(request, response);
		  	},500)
	      }); 
    } else {//其他的商城
		redlock.lock('stone_get_crawl_task_'+ store, 3).done(//锁3秒
		  function(lock){
		  	//拿到锁以后获取一条数据
	    	controller.getDataOther().then(function (data) {
		    	if(data){
		    		//获取完把状态更新成1（处理中）
		    		controller.updateData(data.data.id).then(function (datas) {
		    			response.json({code: 200, msg: '',data:data.data});
		    			redlock.unlock(lock);//释放锁
		    		}, function (errs) {
				        response.json({code: 400, msg: err.message});
				        redlock.unlock(lock);//释放锁
				    })
		    	} else {
		    		redlock.unlock(lock);//释放锁
		    	}
		    },function (err) {
		        response.json({code: 400, msg: err.message});
		        redlock.unlock(lock);//释放锁
		    })
		  },function(err){
		  	//没有获取到锁则循环获取
		  	setTimeout(function(){
		  		handle(request, response);
		  	},500)
	      }); 
    }
    return;
}

var controller = {
    getData:function(store){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({
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
    getDataOther:function(){
    	var storeStr = _.chain(storeArr)
		  .map(function(mall){
		    return mall.name;
		  })
		  .value();
		  console.log(storeStr)
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({
	            	where: {store: {[Op.notIn]:storeStr},status:0},
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
    }
}