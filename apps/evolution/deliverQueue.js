//投递至抓取队列

const _ = require('lodash');
const dateFormat = require('dateformat');

const Q = require("q");
const stoneTaskES = require(process.cwd()+"/apps/lib/elasticsearch/stoneTasks").esClient;
const fun = require(process.cwd()+"/apps/lib/fun.js");

function handler() {
    controller.getWaitList().then(function (data) {
        if (data.length > 0){
            controller.deliverQueue(data);
        } else {
            console.log('waitting..')
        }
    },function (err) {
        fun.stoneLog('stone_db', 'err', {
            "param" : err.message
        })
    })
}

var controller = {
    taskMasterIds: [],
    getWaitList: function () {
        var that = this;
        var defer = Q.defer();
        
        stoneTaskES.search({ status: 0, size: 100}, function (err, res) {
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

                that.taskMasterIds.push(row._source.task_id);
            })

            return defer.resolve(data);
        })

        return defer.promise;
    },
    deliverQueue: function (data) {
        //todo 投递

        //更新状态
        var now = dateFormat(_.now(), "yyyy-mm-dd HH:MM:ss");
        var body = data.map(function (val) {
            return {
                task_id: val.task_id,
                status: 1,
                updated_at : now
            }
        })

        stoneTaskES.bulk(body, 'update', function (err, res) {
            if (err) {
                console.log('change status error')
                fun.stoneLog('stone_db', 'err', {
                    "param" : err.message
                })
            }

            console.log('change status ok')
        })
    }
};

setInterval(function () {
    handler();
}, 5000)