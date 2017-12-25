//投递至抓取队列
const request =require('request');
const Q = require("q");

const _ = require('lodash');
const dateFormat = require('dateformat');

const stoneTaskES = require(process.cwd()+"/apps/lib/elasticsearch/stoneTasks.js").esClient;
const fun = require(process.cwd()+"/apps/lib/fun.js");

const NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
const config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');

const receiveUrl = config.kunlun.receiveUrl;

//kunlun推送的处理
function handler() {
    controller.getOkList().then(function (data) {
        //有数据
        if (data.length > 0) {
            controller.sendKunlun(data);
        } else {
            console.log('waiting..')
        }
        return;
    },function (err) {
        console.log(err.message)
        fun.stoneLog('send_task', 'error', {
            "param" : err.message,
            "param2" : 'get_es_task'
        })
        return;
    })
}

var controller = {
    getOkList: function () {
        var that = this;
        var defer = Q.defer();

        stoneTaskES.search({
            status : 2,
            from : [0, 1],  //kunlun来源
            size : 100,
            sort : [['updated_at', 'asc']]
        },function (err, res) {
            if (err) {
                return defer.reject(err);
            }

            var rows = res.hits.hits;
            var data = [];
            rows.forEach(function (row) {
                data.push({
                    task_id: row._source.task_id,
                    url: row._source.url,
                    from: row._source.from,
                })
            })

            return defer.resolve(data);
        })

        return defer.promise;
    },
    sendKunlun: function (data) {
        request.post({url : receiveUrl , form : {data : data}}, function (err, res, body) {
            if (err || res.statusCode != 200) {
                fun.stoneLog('send_task', 'error', {
                    "param" :   err.message,
                    "param2" : 'send_error'
                })
                console.log(err.message);
                return;
            }
            if (!fun.isJson(body)) {
                fun.stoneLog('send_task', 'error', {
                    "param" : 'not a json!',
                    "param2" : 'send_error'
                })
                console.log('not a json!');
                return;
            }

            //更新状态 已发送
            var body = JSON.parse(body);
            if (body.code == 200) {
                var now = dateFormat(_.now(), "yyyy-mm-dd HH:MM:ss");
                var bulkData = data.map(function (val) {
                    return {
                        task_id : val.task_id,
                        status : 3,
                        updated_at : now
                    };
                })

                stoneTaskES.bulk(bulkData, 'update', function (err, res) {
                    if (err) {
                        fun.stoneLog('send_task', 'error', {
                            "param" : err.message,
                            "param2" : 'es_bulk'
                        })

                        console.log(err.message);
                        return;
                    }

                    console.log('change status ok')
                    return;
                })
            }
            return;
        })
    }
};

setInterval(function () {
    handler();
}, 5000)