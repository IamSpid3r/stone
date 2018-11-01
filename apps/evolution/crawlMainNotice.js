var SequelizeDb = require('../lib/db').db;
var receiveQueue = require('./third/receiveQueue.js');
//var receiveQueue = require('./receiveQueue.js');
const Op = SequelizeDb.sequelize.Op;
var url = require('url');
var fun = require('../lib/fun');
const tableStore = require(process.cwd() + "/apps/lib/tablestorecrawlcontent.js").tableStore;
const crawlmainTaskES = require(process.cwd() + "/apps/lib/elasticsearch/crawlMainTasks.js").esClient;
const Q = require("q");
const events = require('events');


var deal = function () {
    console.log('start notice')
    controller.getDataListEs(400).then(function (data) {
        if (data.status) {
            //bulk es data
            var bulkData = [];
            var n = 0;
            var dataLength =  data.data.length;
            var emitter = new events.EventEmitter();
            emitter.on('ok', function() {
                controller.updateDataBulkEs(bulkData, function (success) {
                    console.log('es bulk success');
                    fun.stoneLog('crawlMainNotice', 'info', {"param":{"message":'notice es bulk success'}})
                },function (err) {
                    fun.stoneLog('crawlMainNotice', 'error',{"param":{"message":'notice es bulk '+err.message}})
                    console.log('es bulk '+err.message)
                });
            });

            data.data.forEach(function (row) {
                if (row.task_id) {
                    //通知给晓林
                    var skuInfo = row.sku_info;
                    if (!skuInfo) {
                        //从tablestore里获取
                        controller.getTablestoreData(row.task_id, function (tberr, skuInfo) {
                            if (tberr) {
                                n++;
                                console.log(n, dataLength)
                                if (n >= dataLength) {
                                    emitter.emit('ok');
                                }
                                return;
                            }

                            if (!skuInfo) {
                                skuInfo = {
                                    Status: false,
                                    Msg: {
                                        Errors: [{
                                            Code: 'Error', Message: '多次抓取失败'
                                        }]
                                    }
                                }
                            } else {
                                skuInfo = JSON.parse(skuInfo);
                            }

                            receiveQueue.handler(row.task_id, row.url, skuInfo, function (error, info) {
                                if (error) {
                                    console.log(row.task_id + ' callback error');
                                    fun.stoneLog('crawlMainNotice', 'error', {
                                        "param1": row.task_id,
                                        "param2": row.url,
                                        "param": {"message": 'notice error1--' + error}
                                    })
                                    //失败
                                    //controller.updateDataErrorEs(row.task_id,parseInt(row.callback_err_num)+1).then(function (data) {})
                                    bulkData.push({
                                        task_id: row.task_id,
                                        callback_status: 0,
                                        callback_err_num: parseInt(row.callback_err_num) + 1
                                    });
                                    n++;
                                    console.log(n, dataLength)
                                    if (n >= dataLength) {
                                        emitter.emit('ok');
                                    }
                                } else {
                                    //成功
                                    // controller.updateDataSuccessEs(row.task_id).then(function (data) {
                                    //     console.log(row.task_id+' callback success');
                                    //     fun.stoneLog('crawlMainNotice', 'info', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice success'}})
                                    // },function (err) {
                                    //     fun.stoneLog('crawlMainNotice', 'error', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice error2--'+err.message}})
                                    //     console.log(err.message)
                                    // })
                                    bulkData.push({
                                        task_id: row.task_id,
                                        callback_status: 1
                                    });
                                    n++;
                                    console.log(n, dataLength)
                                    if (n >= dataLength) {
                                        emitter.emit('ok');
                                    }
                                }
                            });
                        })
                    } else {
                        if (!fun.isJson(skuInfo)) {
                            console.log(row.task_id + ' callback json error');
                            fun.stoneLog('crawlMainNotice', 'error', {
                                "param1": row.task_id,
                                "param2": row.url,
                                "param": {"message": 'notice json error'}
                            })
                            //失败
                            //controller.updateDataErrorEs(row.task_id, parseInt(row.callback_err_num) + 1).then(function (data) {})
                            bulkData.push({
                                task_id: row.task_id,
                                callback_status: 0,
                                callback_err_num: parseInt(row.callback_err_num) + 1
                            });
                            n++;
                            console.log(n, dataLength)
                            if (n >= dataLength) {
                                emitter.emit('ok');
                            }
                        } else {
                            skuInfo = JSON.parse(skuInfo);
                            receiveQueue.handler(row.task_id, row.url, skuInfo, function (error, info) {
                                if (error) {
                                    console.log(row.task_id + ' callback error');
                                    fun.stoneLog('crawlMainNotice', 'error', {
                                        "param1": row.task_id,
                                        "param2": row.url,
                                        "param": {"message": 'notice error--' + error}
                                    })
                                    //失败
                                    //controller.updateDataErrorEs(row.task_id,parseInt(row.callback_err_num)+1).then(function (data) {})
                                    bulkData.push({
                                        task_id: row.task_id,
                                        callback_status: 0,
                                        callback_err_num: parseInt(row.callback_err_num) + 1
                                    });
                                    n++;
                                    console.log(n, dataLength)
                                    if (n >= dataLength) {
                                        emitter.emit('ok');
                                    }
                                } else {
                                    //成功
                                    // controller.updateDataSuccessEs(row.task_id).then(function (data) {
                                    //     console.log(row.task_id+' callback success');
                                    //     fun.stoneLog('crawlMainNotice', 'info', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice success'}})
                                    // },function (err) {
                                    //     fun.stoneLog('crawlMainNotice', 'error', {"param1" : row.task_id, "param2":row.url, "param":{"message":'notice error--'+err.message}})
                                    //     console.log(err.message)
                                    // })
                                    bulkData.push({
                                        task_id: row.task_id,
                                        callback_status: 1,
                                    });
                                    n++;
                                    console.log(n, dataLength)
                                    if (n >= dataLength) {
                                        emitter.emit('ok');
                                    }
                                }
                            });
                        }
                    }

                }
            })
        }
    }, function (err) {
        console.log('flag 1', err.message);
    }).then(function () {
    }, function (err) {
        console.log('flag 2', err.message);
    })
}

var controller = {
    //获取tablestore中的数据
    getTablestoreData: function (taskId, callback) {
        tableStore.Query(taskId, function (err, data) {
            if (err) {
                return callback(err);
            }
            tsData = {};
            if (data.attributes != undefined && data.attributes.length > 0) {
                data.attributes.forEach(function (val) {
                    if (val.columnName == 'data') {
                        tsData = JSON.parse(val.columnValue);
                    }
                })

                callback(null, tsData)
            } else {
                callback(null, null)
            }
        })
    },
    updateDataError: function (id, err_num) {
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .update({callback_status: 0, callback_err_num: err_num}, {where: {id: id}})
            .then(crawlmain => {
                    if (crawlmain) {
                        throw new Error('更新出错');
                    } else {
                        return defer.resolve({
                            status: true,
                            id: id
                        });
                    }
                }
            ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    updateDataSuccess: function (id) {
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .update({callback_status: 1}, {where: {id: id}})
            .then(crawlmain => {
                    if (crawlmain) {
                        return defer.resolve({
                            status: true,
                            id: id
                        });
                    } else {
                        return defer.reject('更新出错');
                    }
                }
            ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    getDataList: function (pagesize) {
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findAll({
                attributes: ['id', 'task_id', 'url', 'update_err_num', 'sku_info', 'callback_err_num'],
                where: {
                    callback_status: 0,
                    callback_err_num: {[Op.lt]: 5},
                    [Op.or]: [
                        {status: 2},
                        {update_err_num: {[Op.gt]: 3}}
                    ],
                },
                limit: pagesize
            })
            .then(crawlmain => {
                    return defer.resolve({
                        status: true,
                        data: crawlmain
                    });
                }
            ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    getDataListEs: function (pagesize) {
        var defer = Q.defer();

        crawlmainTaskES.search(
            {
                callback_status: 0, callback_err_num: 5, notice: 1, size: pagesize, sort: [['update_at', 'asc']]
            }, function (err, res) {
                if (err) {
                    return defer.reject(err);
                }

                var data;
                var rows = res.hits.hits;
                var data = [];
                rows.forEach(function (row) {
                    data.push({
                        task_id: row._source.task_id,
                        update_err_num: row._source.update_err_num,
                        url: row._source.url,
                        sku_info: row._source.sku_info,
                        callback_err_num: row._source.callback_err_num
                    })
                })

                if (rows.length > 0) {
                    return defer.resolve({
                        status: true,
                        data: data
                    });
                } else {
                    return defer.reject('没有任务了');
                }
            })
        return defer.promise;
    },
    updateDataErrorEs: function (task_id, err_num) {
        var defer = Q.defer();
        var now = new Date();

        crawlmainTaskES.update({
            task_id: task_id,
            'callback_status': 0,
            'callback_err_num': err_num
        }, function (err, res) {
            if (err) {
                return defer.reject(new Error('保存ES错误'));
            }

            return defer.resolve({
                status: true
            });
        })
        return defer.promise;
    },
    updateDataSuccessEs: function (task_id) {
        var defer = Q.defer();
        var now = new Date();

        crawlmainTaskES.update({
            task_id: task_id,
            'callback_status': 1
        }, function (err, res) {
            if (err) {
                return defer.reject(new Error('保存ES错误'));
            }

            return defer.resolve({
                status: true
            });
        })
        return defer.promise;
    },
    updateDataBulkEs: function (bulkData) {
        var defer = Q.defer();
        crawlmainTaskES.bulk(bulkData, 'update', function (err, res) {
            if (err) {
                return defer.reject(new Error('bulk es error'));
            }
            return defer.resolve({
                status: true
            });
        })
        return defer.promise;
    }
}

//start
setInterval(function () {
    deal();
}, 5000)
