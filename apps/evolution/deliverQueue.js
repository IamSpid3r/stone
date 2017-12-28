//投递至抓取队列

const _ = require('lodash');
const dateFormat = require('dateformat');

const Q = require("q");
const stoneTaskES = require(process.cwd()+"/apps/lib/elasticsearch/stoneTasks").esClient;
const fun = require(process.cwd()+"/apps/lib/fun.js");

const crawlMain = require('./crawlMain').saveTask;

function handler() {
    controller.getWaitList().then(function (data) {
        if (data.length > 0){
            console.log('execute..')
            controller.deliverQueue(data);
        } else {
            console.log('waiting..')
        }
    },function (err) {
        console.log(err.message)
        fun.stoneLog('deliver_queue', 'error', {"param" : err.message})
    }).then(function () {},function (err) {
        console.log(err.message);
        fun.stoneLog('deliver_queue', 'error', {"param" : err.message})
    })
}

var controller = {
    getWaitList: function () {
        var that = this;
        var defer = Q.defer();
        
        stoneTaskES.search(
            { status: 0, size: 100, sort: [['from', 'desc'],['created_at', 'asc']]
        }, function (err, res) {
            if (err) {
                return defer.reject(err);
            }

            var rows = res.hits.hits;
            var data = [];
            rows.forEach(function (row) {
                data.push({
                    task_id: row._source.task_id,
                    url: row._source.url,
                    from : row._source.from
                })
            })

            return defer.resolve(data);
        })

        return defer.promise;
    },
    deliverQueue: function (data) {
        //投递至抓取处
        crawlMain(data, function (err, result) {
            if (err) {
                console.log('deliver queue err '+err)
                fun.stoneLog('deliver_queue', 'error', {
                    "param" : err
                })
                return;
            }

            //更新状态
            var errMsg = null;
            if (result.Code == 'ok') {
                var now = dateFormat(_.now(), "yyyy-mm-dd HH:MM:ss");
                var body = result.data.map(function (val) {
                    if (val.status) {
                        return {
                            task_id: val.task_id,
                            status: 1,
                            updated_at : now
                        }
                    } else {
                        errMsg = val.msg;
                    }
                })
                body = body.filter(function (val) {
                    if (val) {
                        return val;
                    }
                })
                if (body.length > 0) {
                    stoneTaskES.bulk(body, 'update', function (err, res) {
                        if (err) {
                            console.log('change status err '+err.message)
                            fun.stoneLog('deliver_queue', 'error', {
                                "param" : err.message
                            })
                            return;
                        }

                        console.log('change status ok')
                    })
                } else {
                    console.log(errMsg)
                }
                return;
            }
        })
    }
};

setInterval(function () {
    handler();
}, 5000)