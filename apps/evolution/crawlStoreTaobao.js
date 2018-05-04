var NODE_ENV = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd() + '/config/' + NODE_ENV + '/app.json');
var crawltaskConfig = config.crawltask;
const tableStore = require(process.cwd() + "/apps/lib/tablestorecrawl.js").tableStore;
const request = require('request');
var url = require('url');
const cluster = require('cluster');
const fun = require(process.cwd() + "/apps/lib/fun.js");
const Q = require("q");
var taobaoV2 = require('../../lib/taobaoV2');
var task_id;//当前在跑的任务id

var controller = {
    getData: function (url) {
        var defer = Q.defer();
        request(url, function (error, response, body) {
            if (error) {
                return defer.reject('get task:'+error);
            }
            if (response.statusCode != 200) {
                return defer.reject('get task: http code '+response.statusCode);
            }

            return defer.resolve(JSON.parse(body));
        })

        return defer.promise;
    },
    insertTableStore: function (taskId, skuId, url, data, callback) {
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
                'shop_name': data.Data.ItemAttributes.ShopName ? data.Data.ItemAttributes.ShopName : ''
            })
        } else {
            attributes.push({
                'update_status': 'error'
            })
        }
        tableStore.Insert(taskId, skuId, attributes, callback)
    },
    callbackData: function (url, taskId, data, status) {
        var defer = Q.defer();
        request.post(url, {
            form: {
                task_id: taskId,
                data: JSON.stringify(data),
                status: status
            }
        }, function (error, response, body) {
            if (error) {
                return defer.reject('save task:'+error.message);
            }
            if (response.statusCode != 200) {
                return defer.reject('save task: http code '+response.statusCode);
            }

            return defer.resolve({status: true});
        })
        return defer.promise;
    }
}

var dealerrorcallback = function (taskId, error) {
    var response = {Status: false, Msg: {Errors: [{Code: 'Error', Message: error}]}}
    //callback
    controller.callbackData(crawltaskConfig.postUrl.guonei, taskId, response, 'error').then(function (res) {
        //start
        deal();
    }, function (err) {
        console.log(err)
        setTimeout(function () {deal();}, 2000)
    })
}


//处理
var deal_time;
var deal = function () {
    deal_time = (new Date()).getTime();
    task_id = '';
    console.log(cluster.worker.id + ' start taobao');

    controller.getData(crawltaskConfig.getUrl.guonei + '?store=taobao').then(function (res) {
        if (res.code == 200) {
            console.log(cluster.worker.id + ' crawl '+ res.data.url)

            task_id = res.data.task_id;
            //记日志
            fun.stoneLog('crawlStoreTaobao', 'info', {
                "param1": task_id,
                "param2": res.data.url,
                "param": {"message": '开始处理'}
            })

            taobaoV2.getInfo(res.data.url, function (error, itemInfo) {
                if (error) {
                    console.log(cluster.worker.id + ' error1 '+ error.Errors.Message)

                    fun.stoneLog('crawlStoreTaobao', 'error', {
                        "param1": task_id,
                        "param2": res.data.url,
                        "param": {"message": error.Errors.Message}
                    })

                    return dealerrorcallback(res.data.task_id, error.Errors.Message);
                }

                //保存tablestore
                var dataJson = {Status: true, Data: itemInfo};
                controller.insertTableStore(res.data.task_id, itemInfo.Unique, res.data.url, dataJson, function (err, rows) {
                    if (err) {
                        console.log(cluster.worker.id + ' error2 '+ err.message)
                        fun.stoneLog('crawlStoreTaobao', 'error', {
                            "param1": task_id,
                            "param2": res.data.url,
                            "param": {"message": '保存tablestore失败--' + err.message}
                        })
                        return dealerrorcallback(res.data.task_id, err.message);
                    } else {
                        console.log(cluster.worker.id + ' success')

                        fun.stoneLog('crawlStoreTaobao', 'info', {
                            "param1": task_id,
                            "param2": res.data.url,
                            "param": {"message": '保存tablestore成功'}
                        })
                        //callback
                        controller.callbackData(crawltaskConfig.postUrl.guonei, res.data.task_id, dataJson, 'success').then(function (result) {
                            console.log(result)
                            fun.stoneLog('crawlStoreTaobao', 'info', {
                                "param1": task_id,
                                "param2": res.data.url,
                                "param": {"message": 'callback成功'}
                            })
                            //start
                            deal();
                        }, function (err) {
                            console.log(err)
                            fun.stoneLog('crawlStoreTaobao', 'error', {
                                "param1": task_id,
                                "param2": res.data.url,
                                "param": {"message": 'callback失败--' + err}
                            })
                            //dealerrorcallback(res.data.task_id, err);
                        })
                    }
                })
            })
        } else {
            setTimeout(function () {deal();}, 5000)
        }
    }, function (err) {
        console.log(err)
        setTimeout(function () { deal() }, 3000)
    }).then(function () {
    }, function (err) {
        console.log(err)
        setTimeout(function () { deal() }, 3000)
    })

}

//错误日志
process.on('uncaughtException', function (err) {
    console.log(err.message);
    if (task_id) {
        fun.stoneLog('crawlStoreTaobao', 'error', {
            "param1": task_id,
            "param2": '',
            "param": {"message": "捕捉到错误--" + err.message}
        })
        dealerrorcallback(task_id, err.message);
    }
});

if (cluster.isMaster) {
    for (var i = 0; i < crawltaskConfig.taskNum.taobao; i++) {
        cluster.fork();
    }
    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
        cluster.fork();
    });
} else {
    //start
    console.log("I am worker #"+cluster.worker.id);
    deal();

    //listen timeout
    setInterval(function () {
        if ((new Date()).getTime() - deal_time > 120 * 1000) {
            deal();
        }
    }, 5000)
}