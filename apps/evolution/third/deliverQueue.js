//投递至抓取队列
const _ = require('lodash');
const dateFormat = require('dateformat');

const Q = require("q");
const sequelizeDb = require('../../lib/dbKunlun').db;
const Op = sequelizeDb.sequelize.Op;
const fun = require(process.cwd()+"/apps/lib/fun.js");
const crawlMain = require(process.cwd()+'/apps/evolution/crawlMain').saveTask;

async function handler () {
    var data = await controller.getWaitList();
    if (data.length > 0){
        console.log('execute..')
        controller.deliverQueue(data);
    } else {
        console.log('waiting..')
        setTimeout(function () {
            handler();
        }, 4000);
    }
}

var controller = {
    getWaitList: async function () {
        let that = this;

        let date = fun.dateformat(new Date(), 'yyyy.MM.dd');
        let yestedaydate = fun.dateformat(new Date(Date.now()-3600*24*1000), 'yyyy.MM.dd');
        let KunlunTasks = sequelizeDb.KunlunTasks(date);
        let yestedayKunlunTasks = sequelizeDb.KunlunTasks(yestedaydate);
        let result = await KunlunTasks.findAll({
            where: {
                status: 0,
            },
            attributes: ['task_id', 'url', 'from'],
            limit: 500,
            order : [
                ['from', 'desc'],
                ['create_at', 'asc']
            ],
            raw: true
        })
        let yestedayResult = await yestedayKunlunTasks.findAll({
            where: {
                status: 0,
            },
            attributes: ['task_id', 'url', 'from'],
            limit: 500,
            order : [
                ['from', 'desc'],
                ['create_at', 'asc']
            ],
            raw: true
        })
        let data = [...yestedayResult, ...result];

        return data;
    },
    deliverQueue: function (data) {
        //投递至抓取处
        crawlMain(data, function (err, result) {
            if (err) {
                console.log('deliver queue err '+err)
                fun.stoneLog('deliver_queue', 'error', {
                    "param" : err
                })

                setTimeout(function () {
                    handler();
                }, 3000);
                return;
            }

            //更新状态
            var errMsg = null;
            if (result.Code == 'ok') {
                var now = new Date();
                let date = KunlunTasks = taskId = null;
                var body = result.data.map(function (val) {
                    if (val.status) {
                        taskId = val.task_id;
                        date = taskId.substr(0, 10);
                        KunlunTasks = sequelizeDb.KunlunTasks(date);
                        KunlunTasks.update({
                            status: 1,
                            update_at : now
                        },{
                            where : {task_id: taskId}
                        }).then(row=>{

                        }).catch(err=> {
                            console.log(err.message)
                        })
                    } else {
                        errMsg = val.msg;
                    }
                })

                setTimeout(function () {
                    handler();
                }, 1000);
                return;
            }
        })
    }
};

handler();