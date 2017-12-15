var receiveQueue = require('./receiveQueue.js');
var SequelizeDb = require('../lib/db').db;
const Op = SequelizeDb.sequelize.Op;
const Q = require("q");
const _ = require('lodash');


exports.saveData = function(request, response) {
	handler(request, response);
}

//处理核心逻辑
var handler = function (request, response){
	var body = request.body;
    //验证
    if (!body || !('task_id' in body)) {
        response.json({code: 400, msg: '缺少task_id参数'});
        return;
    }
    var taskId = body.task_id;
    var  dataStr= body.data;
    if (!dataStr){
        response.json({code: 400, msg: '参数有误'});
        return;
    }
    
	controller.updateData(taskId,dataStr).then(function (data) {
    	if(data){
            console.log(receiveQueue)
            //通知给晓林
            receiveQueue.handler(data.data.task_id, data.data.url,  data.data.sku_info, function(error, info){
                console.log(error)
            });
    		response.json({code: 200, msg: 'success',data:''});
    	} 
    },function (err) {
        response.json({code: 400, msg: err.message});
    })
		  
    return;
}

var controller = {
    updateData:function(taskId, data){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({where:{task_id:taskId }})
            .then(crawlmain => {
                if (crawlmain){
                    crawlmain.update({
                        sku_info:data,
                        status:2//更新成功
                      }).then(row=>{
                        if (!row) {
                            return defer.reject(new Error('保存数据库错误'));
                        }
                        return defer.resolve({
                            status : true,
                            data:row
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