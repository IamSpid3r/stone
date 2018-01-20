var SequelizeDb = require('../lib/db').db;
var receiveQueue = require('./receiveQueue.js');
const Op = SequelizeDb.sequelize.Op;
var url  = require('url');
var fun  = require('../lib/fun');
const tableStore = require(process.cwd()+"/apps/lib/tablestorecrawlcontent.js").tableStore;

const Q = require("q");


var deal = function(){
    console.log('start notice')
	controller.getDataList(200).then(function (data) {
            if (data.status){
                data.data.forEach(function (row) {
                    if (row.id){
                        //通知给晓林
                        var skuInfo = row.sku_info;
                        if (!skuInfo){
                            //从tablestore里获取
                            controller.getTablestoreData(row.task_id,function(tberr,skuInfo){
                                if (!tberr){
                                    if (!skuInfo){
                                        skuInfo = {Status:false,Msg:{Errors:[{Code:'Error',Message:'多次抓取失败'}]}}
                                    } else {
                                        skuInfo = JSON.parse(skuInfo);

                                    }
                                    receiveQueue.handler(row.task_id, row.url,  skuInfo, function(error, info){
                                        if(error){
                                            console.log(row.id+' callback error');
                                            fun.stoneLog('crawlMainNotice', 'error', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice error--'+error}})
                                            //失败
                                            controller.updateDataError(row.id,parseInt(row.callback_err_num)+1).then(function (data) {})
                                        } else {
                                            //成功
                                            controller.updateDataSuccess(row.id).then(function (data) {
                                                console.log(row.id+' callback success');
                                                fun.stoneLog('crawlMainNotice', 'info', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice success'}})
                                            },function (err) {
                                                fun.stoneLog('crawlMainNotice', 'error', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice error--'+err.message}})
                                                console.log(err.message)
                                            })
                                        }
                                    });
                                }
                            })
                        }else{
                            if (!fun.isJson(skuInfo)){
                                    console.log(row.id+' callback json error');
                                    fun.stoneLog('crawlMainNotice', 'error', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice json error'}})
                                    //失败
                                    controller.updateDataError(row.id,parseInt(row.callback_err_num)+1).then(function (data) {})
                                } else {
                                    skuInfo = JSON.parse(skuInfo);
                                    receiveQueue.handler(row.task_id, row.url,  skuInfo, function(error, info){
                                        if(error){
                                            console.log(row.id+' callback error');
                                            fun.stoneLog('crawlMainNotice', 'error', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice error--'+error}})
                                            //失败
                                            controller.updateDataError(row.id,parseInt(row.callback_err_num)+1).then(function (data) {})
                                        } else {
                                            //成功
                                            controller.updateDataSuccess(row.id).then(function (data) {
                                                console.log(row.id+' callback success');
                                                fun.stoneLog('crawlMainNotice', 'info', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice success'}})
                                            },function (err) {
                                                fun.stoneLog('crawlMainNotice', 'error', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice error--'+err.message}})
                                                console.log(err.message)
                                            })
                                        }
                                    });
                                }
                        }
                        
                    } 
                    
                })
            }
        },function (err) {
            
        }).then(function () {},function (err) {
             console.log(err.message);
        })
}

var controller = {
    //获取tablestore中的数据
    getTablestoreData: function (taskId , callback) {
       tableStore.Query(taskId, function (err, data) {
           if(err){
               return callback(err);
           }
           tsData = {};
           if (data.attributes.length > 0) {
               data.attributes.forEach(function (val) {
                   if (val.columnName == 'data') {
                       tsData = JSON.parse(val.columnValue);
                   }
               })

               callback(null, tsData)
           } else {
               callback(new Error('未在tablestore找到此任务id的数据'))
           }
       })
    },
    updateDataError:function(id,err_num){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .update({callback_status:0,callback_err_num:err_num},{where : {id:id}})
            .then(crawlmain => {
                if (crawlmain){
                    throw new Error('更新出错');
                } else {
                    return defer.resolve({
                            status : true,
                            id: id
                        });
                }
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    updateDataSuccess:function(id){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .update({callback_status:1},{where : {id:id}})
            .then(crawlmain => {
                if (crawlmain){
                    return defer.resolve({
                        status : true,
                        id: id
                    });
                } else {
                    return defer.reject('更新出错');
                }
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    getDataList:function(pagesize){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findAll({
                attributes: ['id', 'task_id', 'url', 'update_err_num', 'sku_info', 'callback_err_num'],
                where:{
                    callback_status: 0,
                    callback_err_num:{[Op.lt]:5},
                    [Op.or]:[
                        {status: 2},
                        {update_err_num:{[Op.gt]:3}}
                    ],
                 },
                limit:pagesize
            })
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

//start
setInterval(function(){
	deal();
},5000)
