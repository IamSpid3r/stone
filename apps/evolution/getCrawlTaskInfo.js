//获取关于taskid的信息
var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var SequelizeDb = require('../lib/db').db;
const Q = require("q");
const fun = require(process.cwd()+"/apps/lib/fun.js");
const tableStore = require(process.cwd()+"/apps/lib/tablestorecrawlcontent.js").tableStore;
const crawlmainTaskES = require(process.cwd()+"/apps/lib/elasticsearch/crawlMainTasks.js").esClient;


function handler(request, response) {
    var body = request.query;
    var task_id = body.task_id;
    var url = body.url;
    //验证
    if (!body || (!task_id && !url)) {
        response.json({code: 400, msg: '缺少参数'});
        return;
    }

    if (task_id){
        controller.getTaskStatusEs(task_id).then(function (data) {
          if(data){
            //获取详情
            controller.getTablestoreData(task_id, function (err, tsdata) {
                if (err) {
                    return response.json({code: 402, msg: err.message});
                }
                tsData = JSON.parse(tsData);
                return response.json({code: 200, msg: 'ok', data: tsData});
            })
          } else {
            return response.json({code: 200, msg: '没有此数据'});
          }
        },function (err) {
            return response.json({code: 401, msg: err.message});
        })
    } else {
        controller.getTaskUrlStatusEs(url).then(function (data) {
          if(data.data.task_id){
            //获取详情
            controller.getTablestoreData(data.data.task_id, function (err, tsdata) {
                if (err) {
                    return response.json({code: 402, msg: err.message});
                }
                tsData = JSON.parse(tsData);
                return response.json({code: 200, msg: 'ok', data: tsData});
            })
          } else {
            return response.json({code: 200, msg: '没有此数据'});
          }
        },function (err) {
              return response.json({code: 401, msg: err.message});
        })
    }
    
}

var controller = {
    //获取任务状态
    getTaskStatus: function (taskId) {
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({
                attributes: ['id', 'task_id', 'url', 'status', 'sku_info'],
                where: {task_id:taskId,status:2}
              }
          )
            .then(crawlmain => {
                if (!crawlmain){
                    throw new Error('没有此task_id或者没有抓取到数据');
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
    //获取任务状态
    getTaskStatusEs: function (taskId) {
        var defer = Q.defer();
        
        crawlmainTaskES.search(
            { task_id:taskId, status: 2
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
                    store : rows[0]._source.store,
                    status:rows[0]._source.status
                };
            return defer.resolve({
                    status : true,
                    data:data
                });
          } else {
            return defer.reject('没有此task_id或者没有抓取到数据');
          }
        })
        return defer.promise;
    },
    //获取任务状态
    getTaskUrlStatusEs: function (url) {
        var defer = Q.defer();
        
        crawlmainTaskES.search(
            { url:url, status: 2
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
                    store : rows[0]._source.store,
                    status:rows[0]._source.status
                };
            return defer.resolve({
                    status : true,
                    data:data
                });
          } else {
            return defer.reject('没有此task_id或者没有抓取到数据');
          }
        })
        return defer.promise;
    }
};

exports.handler = handler;

