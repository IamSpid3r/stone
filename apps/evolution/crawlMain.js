var SequelizeDb = require('../lib/db').db;
var url  = require('url');
var fun  = require('../lib/fun');

const Q = require("q");

exports.saveTask = function(param, callback) {
    try{
        param.forEach(function (row,index) {
            if(row.task_id == undefined || row.url == undefined){
                throw new Error('task_id和url不可为空');
                return '';
            }else{
                param[index].store = fun.getStore(row.url);
            }
        })

        controller.saveBulkData(param).then(function (data) {
            var response = [];
            if (data.status){
                data.data.forEach(function (row) {
                    if (row.id){
                        response.push(
                            {task_id:row.task_id,status:true,msg:'success'}
                        );
                    } else {
                        response.push(
                            {task_id:row.task_id,status:false,msg:'该任务已经存在'}
                        );
                    }
                    
                })
            }
            callback(null, response);
        },function (err) {
            throw new Error(err.message);
            return '';
        })
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
    }
}