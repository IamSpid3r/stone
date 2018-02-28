var SequelizeDb = require('../lib/db').db;
const Op = SequelizeDb.sequelize.Op;
var url  = require('url');
var fun  = require('../lib/fun');
const crawlmainTaskES = require(process.cwd()+"/apps/lib/elasticsearch/crawlMainTasks.js").esClient;

const Q = require("q");
var limit = 15000;//最大任务

exports.saveTask = function(param, callback) {
    try{
        var timely_data_param = [];
        var data_param = [];
        var now = new Date();
        var yesterday = new Date();
        yesterday.setTime(yesterday.getTime()-24*60*60*1000);
        param.forEach(function (row,index) {
            if(row.task_id == undefined || row.url == undefined){
                throw new Error('task_id和url不可为空');
                return '';
            }else{
                param[index].store = fun.getStore(row.url);
                param[index].sku_info = '';
                param[index].update_err_num = 0;
                param[index].status = 0;
                param[index].callback_status = 0;
                param[index].callback_err_num = 0;
                param[index].update_at = now;
                param[index].create_at = now;
                if (row.from != undefined && row.from >0){//需要及时插入
                    param[index].update_at = yesterday;
                    timely_data_param.push(param[index]);
                } else {//正常插入
                    data_param.push(param[index]);
                }
            }
        })

        var response = [];
        if (timely_data_param.length>0){
            controller.writeUrlTask(timely_data_param).then(function (data) {
                response = data;
                if(data_param.length == 0){
                    var msg = {
                            'Code':'ok',
                            'msg':'',
                            'data':response
                        }
                        callback(null, msg);
                        return '';
                }
                //获取条数
                crawlmainTaskES.count({status:0},function(err, res){
                    if (err){
                        callback(err.message,null)
                        return '';
                    }
                    if (res.count >= limit){
                        data_param.forEach(function (row) {
                                response.push(
                                    {task_id:row.task_id,status:false,msg:'抓取任务已达最大'+limit}
                                );
                                
                            })
                        var msg = {
                            'Code':'ok',
                            'msg':'',
                            'data':response
                        }
                        callback(null, msg);
                        return '';
                    } else {
                        controller.writeUrlTask(data_param).then(function (datanormal) {
                            if (datanormal) {
                                datanormal.forEach(function (row) {
                                    response.push(row);
                                })
                            }
                            var msg = {
                                'Code':'ok',
                                'msg':'',
                                'data':response
                            }
                            callback(null, msg);
                        },function (err) {
                            callback(err.message,null)
                            return '';
                        })
                    }
                })
            },function (err) {
                callback(err.message,null)
                return '';
            })
        } else if(data_param.length>0) {
            //获取条数
            crawlmainTaskES.count({status:0},function(err, res){
                if (err){
                    callback(err.message,null)
                    return '';
                }
                if (res.count >= limit){
                    data_param.forEach(function (row) {
                            response.push(
                                {task_id:row.task_id,status:false,msg:'抓取任务已达最大'+limit}
                            );
                            
                        })
                    var msg = {
                        'Code':'ok',
                        'msg':'',
                        'data':response
                    }
                    callback(null, msg);
                    return '';
                } else {
                    controller.writeUrlTask(data_param).then(function (datanormal) {
                        if (datanormal) {
                            datanormal.forEach(function (row) {
                                response.push(row);
                            })
                        }
                        var msg = {
                            'Code':'ok',
                            'msg':'',
                            'data':response
                        }
                        callback(null, msg);
                    },function (err) {
                        callback(err.message,null)
                        return '';
                    })
                }
            })

        } else {
            callback('数据格式有误',null)
            return '';
        }

    }catch(err){
        callback(err.message, null)
    }
    return;
}

var controller = {
    saveData:function(param){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({where : {task_id:param.task_id }})
            .then(crawlmain => {
                if (crawlmain){
                    throw new Error('已经存在此任务');
                } else {
                    SequelizeDb.CrawlMain.create({
                        task_id: param.task_id,
                        url: param.url,
                        store:fun.getStore(param.url),
                        status:0,
                      }).then(row=>{
                        if (!row) {
                            return defer.reject(new Error('保存数据库错误'));
                        }
                        return defer.resolve({
                            status : true,
                            task_id: param.task_id
                        });
                    });
                }
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    saveBulkData:function(param){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .bulkCreate(param, { ignoreDuplicates : true })
            .then(crawlmain => {
                return defer.resolve({
                    status : true,
                    data: crawlmain
                });
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    getDataCount:function(){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .count({where:{status:{[Op.in]:[0]}}})
            .then(crawlmain => {
                return defer.resolve({
                    status : true,
                    data: CrawlMain
                });
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    //任务url写入数据库
    writeUrlTask: function (data, from) {
        var defer = Q.defer();

        var that = this;
        var taskIds = []

        crawlmainTaskES.bulk(data, 'create', function (err, res) {
            if (err){
                return defer.reject(err);
            }

            res.items.forEach(function (item) {
                taskId = item.create._id;
                if (item.create.created) {
                    taskIds.push({task_id:taskId,status:true,msg:'success'})
                }else {
                    //taskIds.push({task_id:taskId,status:false,msg:'create err'})
                    taskIds.push({task_id:taskId,status:true,msg:'success'})
                }
            })

            return defer.resolve(taskIds);
        })
        return defer.promise;
    }
}