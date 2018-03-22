var SequelizeDb = require('../lib/db').db;
const Op = SequelizeDb.sequelize.Op;
var url  = require('url');
var fun  = require('../lib/fun');
const crawlmainTaskES = require(process.cwd()+"/apps/lib/elasticsearch/crawlMainTasks.js").esClient;

const Q = require("q");


var deal = function(){
	console.log('start monitor')
    var curr_time = new Date();
        curr_time.setTime(curr_time.getTime()-15*60*1000);
	    controller.getDataListEs(curr_time, 500).then(function (data) {
            if (data.status){
                data.data.forEach(function (row) {
                    if (row.task_id){
                    	console.log(row.task_id)
                        fun.stoneLog('crawlMainMonitor', 'info', {"param1" : row.task_id, "param2":row.url, "param":{"message":'15分钟没有抓取成功，重新抓取'}})
                        controller.updateDataEs(row.task_id,parseInt(row.update_err_num)+1).then(function (data) {})
                    } 
                    
                })
            }
        },function (err) {
            
        })
}

var controller = {
    updateData:function(id,err_num){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .update({status:0,update_err_num:err_num},{where : {id:id}})
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
    getDataList:function(curr_time, pagesize){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findAll({
                attributes: ['id', 'update_err_num'],
                where:{status:{[Op.in]:[1,3]},updatedAt:{[Op.lt]:curr_time},update_err_num:{[Op.lt]:4}},limit:pagesize})
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
    getDataListEs:function(curr_time, pagesize){
        var defer = Q.defer();
        
        crawlmainTaskES.search(
            { status: [1,3], update_err_num: 4,update_at:curr_time, size: pagesize, sort: [['update_at', 'asc']]
        }, function (err, res) {
            if (err) {
                return defer.reject(err);
            }

            var data;
            var rows = res.hits.hits;
            

            var data = [];
            rows.forEach(function (row) {
                data.push({
                    task_id: row._source.task_id,
                    update_err_num: row._source.update_err_num,
                    url:row._source.url
                })
            })

            if (rows.length > 0){
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
    updateDataEs:function(taskId,err_num){
        var defer = Q.defer();
        var now = new Date();

        crawlmainTaskES.update({
            task_id: taskId,
            'status':0,
            'update_err_num' : err_num,
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

//时间戳转日期
function getLocalTime(nS) {     
    return new Date(parseInt(nS) * 1000).toLocaleString().replace(/年|月/g, "-").replace(/日/g, " ");      
 }  
//deal();
//start
setInterval(function(){
	deal();
},5000)
