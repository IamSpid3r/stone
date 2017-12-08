//投递至抓取队列

const Q = require("q");
const sequelizeDb = require(process.cwd()+"/apps/lib/db.js").db;
const fun = require(process.cwd()+"/apps/lib/fun.js");

//kunlun推送的处理
function handler() {
    controller.getWaitList().then(function (data) {
        controller.deliverQueue(data);
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

        sequelizeDb.StoneTasks().findAll({
            where: { status : 0 },
            attributes: ["id","task_id", "url", "from"],
            limit: 100,
        }).then(rows => {
            var data = [];
            rows.forEach(function (row) {
                data.push({
                    task_id: row.task_id,
                    url: row.url,
                    from: row.from,
                })

                that.taskMasterIds.push(row.id);
            })

            return defer.resolve(data);
        }).catch(function (err) {
            return defer.reject(err);
        });

        return defer.promise;
    },
    deliverQueue: function (data) {
        //todo 投递

        //更新状态
        if (this.taskMasterIds.length > 0) {
            sequelizeDb.sequelize.query('update stone_tasks set status = 1 where id in ('+this.taskMasterIds.join(',')+')').then(row => {
                console.log('change status ok')
            }).catch(function (err) {
                console.log(err)

                fun.stoneLog('stone_db', 'err', {
                    "param" : err.message
                })
            });
        }
    }
};

setInterval(function () {
    console.log('deliver...')
    handler();
}, 5000)