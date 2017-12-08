//推送url的接收处理

const md5 = require('md5');
const Q = require('q');
const events = require('events');

const SequelizeDb = require(process.cwd()+'/apps/lib/db.js').db;
const fun = require(process.cwd()+'/apps/lib/fun.js');


function handler(request, response) {
    var body = request.body;

    //验证
    if (!body || !('url' in body)) {
        response.json({code: 400, msg: '缺少url参数'});
        return;
    }

    //把url写入mysql
    var urls = body.url;
    var from = body.from || 0;
    from = Number(from);
    
    controller.writeUrlTask(urls, from).then(function (taskIds) {
        response.json({code: 200, msg: 'ok', data: taskIds});
    },function (err) {
        response.json({code: 401, msg: err.message});
    })
}

var controller = {
    //任务url写入数据库
    writeUrlTask: function (urls, from) {
        var that = this;
        var taskIds = [];

        var defer = Q.defer();
        var emitter = new events.EventEmitter();
        emitter.on('create_ok', function(taskIds) {
            return defer.resolve(taskIds);
        });

        urls.forEach(function (url) {
            var taskId = that.generateTaskId(url);
            var store = fun.getStore(url);

            //保存
            SequelizeDb.StoneTasks().create({
                "task_id" : taskId,
                "url" : url,
                "store" : store,
                "status" : 0,
                "from" : from,
            }).then(row => {
                if (row) {
                    taskIds.push({
                        url : url , task_id: row.task_id
                    })
                } else {
                    taskIds.push({
                        url: url, task_id: null, err: 'create err'
                    })
                }

                //时间监听回调 全部创建完成
                if (taskIds.length == urls.length) {
                    emitter.emit('create_ok', taskIds);
                }
            }).catch(function (err) {
                taskIds.push({url : url, err : err.message})

                //时间监听回调 全部创建完成
                if (taskIds.length == urls.length) {
                    emitter.emit('create_ok', taskIds);
                }
            });
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

