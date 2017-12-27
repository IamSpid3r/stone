var SequelizeDb = require('../lib/db').db;
var receiveQueue = require('./receiveQueue.js');
const Op = SequelizeDb.sequelize.Op;
var url  = require('url');
var fun  = require('../lib/fun');

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
                            skuInfo = {Status:false,Msg:{Errors:[{Code:'Error',Message:'多次抓取失败'}]}}
                        } else {
                            skuInfo = JSON.parse(skuInfo);
                        }
                        receiveQueue.handler(row.task_id, row.url,  skuInfo, function(error, info){
                            if(error){
                                //失败
                                controller.updateDataError(row.id,parseInt(row.callback_err_num)+1).then(function (data) {})
                            } else {
                                //成功
                                controller.updateDataSuccess(row.id).then(function (data) {})
                            }
                        });
                        
                    } 
                    
                })
            }
        },function (err) {
            
        })
}

var controller = {
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
    getDataList:function(pagesize){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findAll({
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
