//获取关于taskid的信息

const Q = require("q");
const fun = require(process.cwd()+"/apps/lib/fun.js");
const tableStore = require(process.cwd()+"/apps/lib/tablestore.js").tableStore;
const stoneTaskES = require(process.cwd()+"/apps/lib/elasticsearch/stoneTasks.js").esClient;

function handler(request, response) {
    var body = request.query;
    //验证
    if (!body || !('task_id' in body)) {
        response.json({code: 400, msg: '缺少task_id参数'});
        return;
    }

    var taskId = body.task_id;
    controller.getTaskStatus(taskId, function (err, res) {
        if (err) {
            return response.json({code: 401, msg: err.message});
        }

        //获取详情
        controller.getTablestoreData(taskId, function (err, tsdata) {
            if (err) {
                return response.json({code: 402, msg: err.message});
            }

            return response.json({code: 200, msg: 'ok', data: tsData});
        })
    })
}

var controller = {
    //获取任务状态
    getTaskStatus: function (taskId, callback) {
        stoneTaskES.search({
            task_id : taskId,
        }, function (err, res) {
            if (err){
                return callback(err);
            }
            if (res.hits.hits.length <= 0) {
                return callback(new Error('未找到此taskid相关数据'));
            }
            var status = res.hits.hits[0]._source.status;

            //ok的状态
            if (status == 2 || status == 3) {
                return callback(null, 'ok');
            } else {
                return callback(new Error("任务尚未处理完成,当前状态码为"+status));
            }
        })
    },
    //获取tablestore中的数据
    getTablestoreData: function (taskId , callback) {
       tableStore.Query(taskId, function (err, data) {
           if(err){
               return callback(err);
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

