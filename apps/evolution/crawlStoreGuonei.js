/*
 * @author hanxiaolin
 * @date 2018年06月12日15:28:56
 * */
const NODE_ENV = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
const config = require(process.cwd() + '/config/' + NODE_ENV + '/app.json');
const crawltaskConfig = config.crawltask;
const tableStore = require(process.cwd() + "/apps/lib/tablestorecrawl.js").tableStore;
const request = require('request');
const url = require('url');
const cluster = require('cluster');
const fun = require(process.cwd() + "/apps/lib/fun.js");
const Q = require("q");

const getTaskApi = crawltaskConfig.getUrl.guonei;
const saveTaskApi = crawltaskConfig.postUrl.guonei;
//商城集合
const store = require(process.cwd()+'/lib/store');

const controller = {
    dealTime : null,
    run : async function () {
        try {
            var _this = this;
            var isNowTask = true; //正在运行

            _this.dealTime= Date.now();
            var taskInfo = await _this.getTask();
            if (taskInfo.code == 200) {
                var taskUrl = taskInfo.data.url;
                var taskId= taskInfo.data.task_id;

                //商城
                console.log(cluster.worker.id, taskUrl, taskId);
                var storeObj = store.getStore(taskUrl);
                if (!storeObj) {
                    throw new Error(' 当前地址不支持爬取');
                }

                //抓取
                storeObj.getInfo(taskUrl, function (error, itemInfo) {
                    (async () => {
                        try {
                            if (error) {
                                console.log(cluster.worker.id , JSON.stringify(error));

                                fun.stoneLog('crawlMainGuonei', 'error', {
                                    "param1": _this.taskId,
                                    "param2": taskUrl,
                                    "param": {"message":  JSON.stringify(error)}
                                })

                                var response = {
                                    Status: false,
                                    Msg: error
                                };

                                await _this.saveTask(taskId, response, 'error')
                            } else {
                                //保存tablestore
                                var dataJson = {Status: true, Data: itemInfo};
                                var saveInfo =  await _this.insertTableStore(taskId, itemInfo.Unique, taskUrl, dataJson);
                                //save task
                                await _this.saveTask(taskId, dataJson, 'success');

                                fun.stoneLog('crawlMainGuonei', 'trace', {
                                    "param1": _this.taskId,
                                    "param2": taskUrl,
                                    "param": {"message": '抓取完成'}
                                })

                                console.log(cluster.worker.id , ' ok');
                            }
                        } catch (e){
                            console.log(cluster.worker.id , e.message);
                            fun.stoneLog('crawlMainGuonei', 'error', {
                                "param1": taskId,
                                "param2": taskUrl,
                                "param": {"message": e.message}
                            })
                            var response = {
                                Status: false,
                                Msg: {
                                    Errors: {
                                        Code: 'Error',
                                        Message: e.message
                                    }
                                }
                            };
                            //callback
                            await _this.saveTask(taskId, response, 'error')
                        }

                        //检测是否重复回调
                        if (!isNowTask) {
                            console.log(cluster.worker.id, 'now running task');
                            return;
                        }
                        isNowTask = false;

                        //再次
                        _this.run();
                    }) ()
                })
            } else {
                console.log(cluster.worker.id , ' wait ..');
                setTimeout(function () {
                    _this.run();
                }, 2500)
            }
        } catch (e){
            //写入错误日志
            console.log(cluster.worker.id , e.message);

            if (typeof taskId != 'undefined') {
                fun.stoneLog('crawlMainGuonei', 'error', {
                    "param1": taskId,
                    "param2": taskUrl,
                    "param": {"message":  e.message}
                })

                //保存错误
                if (typeof e.message == 'object') {
                    var response = {
                        Status: false,
                        Msg: e.message
                    };
                } else {
                    var response = {
                        Status: false,
                        Msg: {
                            Errors: {
                                Code: 'Error',
                                Message: e.message
                            }
                        }
                    };
                }
                //callback
                await _this.saveTask(taskId, response, 'error')
            }

            //检测是否重复回调
            if (!isNowTask) {
                console.log(cluster.worker.id, 'now running task');
                return;
            }
            isNowTask = false;

            //再来
            setTimeout(function () {
                _this.run();
            }, 2500)
        }
    },
    getTask: function () {
        return new Promise((resolve, reject) => {
            request({url:getTaskApi + '?store=guonei', timeout: 3000}, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    if (response.statusCode != 200) {
                        reject(new Error(' getTask statusCode '+response.statusCode));
                    } else {
                        resolve(JSON.parse(body))
                    }
                }
            })
        })
    },
    insertTableStore: function (taskId, skuId, url, data) {
        return new Promise((resolve, reject) => {
            var attributes = [];
            attributes.push({
                'data': JSON.stringify(data),
            })
            attributes.push({
                'url': url
            })
            attributes.push({
                'store': fun.getStore(url)
            })
            if (data.Status) {
                attributes.push({
                    'status': data.Data.Status
                })
                attributes.push({
                    'handle_status': 1
                })
                attributes.push({
                    'update_status': 'success'
                })
                attributes.push({
                    'shop_name': data.Data.ItemAttributes.ShopName
                })
            } else {
                attributes.push({
                    'update_status': 'error'
                })
            }

            tableStore.Insert(taskId, skuId, attributes, function (err, rows) {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows)
                }
            })
        })
    },
    saveTask: function (taskId, data, status) {
        return new Promise((resolve, reject) => {
            _this = this;
            request.post(saveTaskApi, {
                form: {
                    task_id: taskId,
                    data: JSON.stringify(data),
                    status: status
                }
            }, function (error, response, body) {
                if (error) {
                    fun.stoneLog('crawlMainGuonei', 'error', {
                        "param1": taskId,
                        "param2": 'saveTask',
                        "param": {"message":  'save task:' + error.message}
                    })
                }

                if (!error && response.statusCode != 200) {
                    fun.stoneLog('crawlMainGuonei', 'error', {
                        "param1": taskId,
                        "param2": 'saveTask',
                        "param": {"message": "saveTask statusCode "+response.statusCode}
                    })
                }

                resolve('ok')
            })
        })
    }
}


//多进程
if (cluster.isMaster) {
    for (var i = 0; i < crawltaskConfig.taskNum.guonei; i++) {
        cluster.fork();
    }
    cluster.on('exit', function (worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
        cluster.fork();
    });
} else {
    //start
    console.log("I am worker #" + cluster.worker.id);
    controller.run()

    //listen timeout
    setInterval(function () {
        if ((new Date()).getTime() - controller.dealTime > 200 * 1000) {
            fun.stoneLog('crawlMainGuonei', 'error', {
                "param1": controller.taskUrl,
                "param2": 'timeout',
            })

            //杀掉进程
            setTimeout(function () {
                process.exit();
            },1500)
        }
    }, 5000)
}



