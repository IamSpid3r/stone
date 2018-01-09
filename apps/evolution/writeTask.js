//推送url的接收处理

const md5 = require('md5');
const Q = require('q');
const _ = require('lodash');
const dateFormat = require('dateformat');

const stoneTaskES = require(process.cwd()+"/apps/lib/elasticsearch/stoneTasks.js").esClient;
const fun = require(process.cwd()+'/apps/lib/fun.js');

const maxTaskNum = 2000;

function handler(request, response) {
    if (request.method == 'POST') {
        //验证
        var body = request.body;
        if (!body || !('url' in body)) {
            return response.json({code: 400, msg: '缺少url参数'});
        }
        var urls = body.url;
        var from = body.from || 0;
        from = Number(from);
    } else {
        var url = request.query.url;
        if (!url) {
            return response.json({code: 400, msg: '缺少url参数'});
        }
        var urls = [url];
        var from = request.query.from || 0;
        from = Number(from);
    }

    //检测当前有多少未处理的任务
    stoneTaskES.search({'status': [0], 'size': 0}, function (err, res) {
        if (err) {
            return response.json({code: 405, msg: err.message});
        }

        //队列阈值限制[from正常kunlun来源]
        if (res.hits.total > maxTaskNum && !from) {
            return response.json({code: 410, msg: '队列待处理数量为'+res.hits.total+',稍后再次投递'});
        }

        //把url写入es
        controller.writeUrlTask(urls, from).then(function (taskIds) {
            return response.json({code: 200, msg: 'ok', data: taskIds});
        },function (err) {
            return response.json({code: 401, msg: err.message});
        })
    })
}

var controller = {
    //任务url写入数据库
    writeUrlTask: function (urls, from) {
        var defer = Q.defer();

        var that = this;
        var taskIds = []
        var now = new Date();
        var urlToTaskId = [];
        var body = urls.map(function (url) {
            var taskId = that.generateTaskId(url);
            var store = fun.getStore(url);

            urlToTaskId[taskId] = url;

            return {
                "task_id" : taskId,
                "url" : url,
                "store" : store,
                "status" : 0,
                "from" : from,
                "create_at" : now,
                "update_at" : now,
            };
        })

        var opration = 'create';
        stoneTaskES.bulk(body, opration, function (err, res) {
            if (err){
                return defer.reject(err);
            }

            res.items.forEach(function (item) {
                taskId = item.create._id;
                url = urlToTaskId[taskId];

                if (item.create.created) {
                    taskIds.push({
                        url: url, task_id: taskId
                    })
                }else {
                    taskIds.push({
                        url: url, task_id: null, err: 'create err'
                    })
                }
            })

            return defer.resolve(taskIds);
        })
        return defer.promise;
    },
    //生成taskid,随机数+时间+url
    generateTaskId: function (url) {
        var millisecond = (new Date()).getTime();
        var rand = Math.random();

        return  md5(rand+url+millisecond);
    }
};

exports.handler = handler;

