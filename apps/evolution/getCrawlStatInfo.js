//获取关于taskid的信息
var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var SequelizeDb = require('../lib/db').db;
const Op = SequelizeDb.sequelize.Op;
const Q = require("q");
const fun = require(process.cwd()+"/apps/lib/fun.js");
const tableStore = require(process.cwd()+"/apps/lib/tablestorecrawlcontent.js").tableStore;
const crawlmainTaskES = require(process.cwd()+"/apps/lib/elasticsearch/crawlMainTasks.js").esClient;


function handler(request, response) {
    var body = request.query;
    //验证
    if (!body || !('type' in body)) {
        response.json({code: 400, msg: '缺少type参数'});
        return;
    }

    var type = body.type;
    var time = body.time;
    if (type == 'wait'){
        controller.getStatusDataEs(0).then(function (data) {
          return response.json({code: 200, msg: 'ok', data: data.data});
        },function (err) {
            return response.json({code: 401, msg: err.message});
        })
    } else if (type == 'process'){
      controller.getStatusDataEs(1).then(function (data) {
          return response.json({code: 200, msg: 'ok', data: data.data});
        },function (err) {
            return response.json({code: 401, msg: err.message});
        })
    } else if(type == 'store_error'){
        //获取time时间
        if (!time)  time = 3600*24*3;
        var curr_time = Date.parse(new Date())/1000 - time;
        var d = new Date(curr_time*1000); 
        curr_time = formatDate(d);
        curr_time = new Date(curr_time);
        controller.getErrorDataEs(curr_time,100,'store').then(function (data) {
          return response.json({code: 200, msg: 'ok', data: data.data});
        },function (err) {
            return response.json({code: 401, msg: err.message});
        })
    } else if(type == 'url_error'){
        //获取三天前时间
        if (!time)  time = 3600*24*3;
        var curr_time = Date.parse(new Date())/1000 - time;
        var d = new Date(curr_time*1000); 
        curr_time = formatDate(d);
        curr_time = new Date(curr_time);
        controller.getErrorDataEs(curr_time,100,'url').then(function (data) {
          return response.json({code: 200, msg: 'ok', data: data.data});
        },function (err) {
            return response.json({code: 401, msg: err.message});
        })
    } else {
      response.json({code: 400, msg: '暂不支持的类型'});
      return;
    }
}

var controller = {
    //获取正在等待抓取/抓取中的数据
    getStatusData: function (status) {
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findAll ({
                attributes: ['store',[SequelizeDb.sequelize.fn('COUNT', SequelizeDb.sequelize.col('id')), 'number']],
                where: {status:status,callback_status:0},
                group: 'store',
                raw:true
              }
          )
            .then(crawlmain => {
                if (!crawlmain){
                    throw new Error('没有数据');
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
    //获取最近三天错误的数据统计
    getErrorData: function (curr_time,pagesize,sort) {
        var defer = Q.defer();
        console.log(curr_time)
        SequelizeDb.CrawlMain
            .findAll ({
                attributes: [sort,[SequelizeDb.sequelize.fn('SUM', SequelizeDb.sequelize.col('update_err_num')), 'number']],
                where:{update_err_num:{[Op.gt]:0},createdAt:{[Op.gt]:curr_time}},
                limit:pagesize,
                group: sort,
                order:[[SequelizeDb.sequelize.literal('number'), 'DESC']],
                raw:true
              }
          )
            .then(crawlmain => {
                if (!crawlmain){
                    throw new Error('没有数据');
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
    //获取正在等待抓取/抓取中的数据
    getStatusDataEs: function (status) {
      var defer = Q.defer();
        
        crawlmainTaskES.search(
            { aggs:'store', status: status, callback_status:0
        }, function (err, res) {
            if (err) {
                return defer.reject(err);
            }

            var data;
            if (res.aggregations!= undefined){
              var rows = res.aggregations.store.buckets;
              
              if (rows.length > 0){
              return defer.resolve({
                      status : true,
                      data:rows
                  });
            }else{
              return defer.reject('没有数据了');

            }
            
          } else {
            return defer.reject('没有数据了');
          }
        })
        return defer.promise;
    },
    //获取最近错误的数据统计
    getErrorDataEs: function (curr_time,pagesize,sort) {
      var defer = Q.defer();
        
        crawlmainTaskES.search(
            { aggs:sort, size:pagesize, updateErrNum: 0, create_at:curr_time
        }, function (err, res) {
            if (err) {
                return defer.reject(err);
            }
            var data;
            if (res.aggregations != undefined){
                if (sort == 'store'){
                   var rows = res.aggregations.store.buckets;
                } else {
                    var rows = res.aggregations.url.buckets;
                }
                if (rows.length > 0){
                return defer.resolve({
                        status : true,
                        data:rows
                    });
            } else {
              return defer.reject('没有数据了');
            }
            
          } else {
            return defer.reject('没有数据了');
          }
        })
        return defer.promise;
      }
};

function formatDate(now) { 
  var year=now.getFullYear(); 
  var month=now.getMonth()+1; 
  var date=now.getDate(); 
  var hour=now.getHours(); 
  var minute=now.getMinutes(); 
  var second=now.getSeconds(); 
  if(month<10) month="0"+month; 
  if(date<10) date="0"+date;   
  if(hour<10) hour="0"+hour;   
  if(minute<10) minute="0"+minute;   
  if(second<10) second="0"+second;   
  return year+"-"+month+"-"+date+" "+hour+":"+minute+":"+second; 
} 

exports.handler = handler;

