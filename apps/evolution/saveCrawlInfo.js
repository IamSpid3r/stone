var SequelizeDb = require('../lib/db').db;
const Op = SequelizeDb.sequelize.Op;
const Q = require("q");
const _ = require('lodash');
const tableStore = require(process.cwd()+"/apps/lib/tablestorecrawlcontent.js").tableStore;

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
    var status = body.status;
    var  dataStr= body.data;
    if (!dataStr){
        response.json({code: 400, msg: '参数有误'});
        return;
    }

    //先保存tablestore 再保存数据库
    controller.insertTableStore(taskId,dataStr,function(err,row){
        if (!err){
            controller.updateData(taskId,dataStr,status).then(function (data) {
                if(data){
                    response.json({code: 200, msg: 'success',data:''});
                } 
            },function (err) {
                response.json({code: 400, msg: err.message});
            })
        } else{
            response.json({code: 400, msg: '保存tablestore出错'});
        }
    });
    return;
}

var controller = {
    insertTableStore : function (taskId, data, callback) {
        var attributes = [];
        attributes.push({
            'data' : JSON.stringify(data),
        })
        tableStore.Insert(taskId, attributes, callback)
    },
    updateData:function(taskId, data, status){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({where:{task_id:taskId,status:{[Op.in]:[0,1,3]} }})
            .then(crawlmain => {
                if (crawlmain){
                    crawlmain.update({
                        //sku_info:data,
                        status: status == 'success' ? 2 : 3//更新成功
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
                    return defer.reject(new Error('不存在此任务或者此任务已完成更新'));
                }
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    }
}