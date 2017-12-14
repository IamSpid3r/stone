//获取关于taskid的信息

const Q = require("q");
const SequelizeDb = require(process.cwd()+"/apps/lib/db.js").db;
const fun = require(process.cwd()+"/apps/lib/fun.js");
const tableStore = require(process.cwd()+"/apps/lib/tablestore.js").tableStore;;

function handler(request, response) {
    var body = request.body;
    console.log(body)
    //验证
    if (!body || !('task_id' in body)) {
        response.json({code: 400, msg: '缺少task_id参数'});
        return;
    }

    var taskId = body.task_id;
    controller.getTaskStatus(taskId).then(function (data) {
        //正常的和状态
        if (data.status) {
            //tablestore
            controller.getTablestoreData(taskId, function (err, tsdata) {
                if (err) {
                    response.json({code: 402, msg: err.message});
                    return;
                }

                data.data = tsData;

                response.json({code: 200, msg: 'ok', data: data});
            })
        } else {
            response.json({code: 200, msg: 'ok', data : data});
        }
    },function (err) {
        response.json({code: 401, msg: err.message});
    })
}

var controller = {
    //获取任务状态
    getTaskStatus: function (taskId) {
        var defer = Q.defer();

        SequelizeDb.StoneTasks().findOne({
            where : {task_id : taskId},
            attributes : ['task_id', 'status']
        }).then(row => {
            if (!row) {
                return defer.reject(new Error('未找到此taskid任务'));
            }

            if (row.status == 2 || row.status == 3) {
                return defer.resolve({
                    status : true
                });
            } else {
                return defer.resolve({
                    status : false,
                    msg : "任务尚未处理完成,当前状态码为"+row.status
                });
            }
        }).catch(err => {
            return defer.reject(err);
        });

        return defer.promise;
    },
    //获取tablestore中的数据
    getTablestoreData: function (taskId , callback) {
       tableStore.Query(taskId, function (err, data) {
           if(err){
               callback(err);
               return;
           }

           tsData = {};
           if (data.length > 0 && 'attributes'in data[0]) {
               data[0].attributes.forEach(function (val) {
                   if (val.columnName == 'data') {
                       tsData = JSON.parse(val.columnValue);
                   }
               })

               callback(null, tsData)
           } else {
               callback(new Error('未在tablestore找到此任务id的数据'))
           }
       })
    }
};

exports.handler = handler;

