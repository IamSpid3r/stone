const NODE_ENV = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
const config = require(process.cwd() + '/config/' + NODE_ENV + '/app.json');
const crawltaskConfig = config.crawltask;
const tableStore = require(process.cwd() + "/apps/lib/tablestorecrawl.js").tableStore;
const request = require('request');
var url = require('url');
const fun = require(process.cwd() + "/apps/lib/fun.js");
const Q = require("q");
const _ = require('lodash');
const cluster = require('cluster');
const jd = require('../../lib/jd');
const iconv = require('iconv-lite');
const proxyRequest = require('../../lib/proxyRequest2');

var controller = {
    getData: function (url) {
        var defer = Q.defer();
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                return defer.resolve(JSON.parse(body));
            } else {
                return defer.reject(error);
            }
        })
        return defer.promise;
    },
    updateTableStore: function (taskId, skuId, subtitle, callback) {
        var attributes = [];
        attributes.push({
            'handle_status': 1
        })
        attributes.push({
            'update_status': 'success'
        })
        attributes.push({
            'subtitle': subtitle
        })
        tableStore.Update(taskId, skuId, attributes, callback);
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
                'shop_name': (data.Data.ItemAttributes.ShopName != undefined) ? data.Data.ItemAttributes.ShopName : ''
            })
        } else {
            attributes.push({
                'update_status': 'error'
            })
        }
        tableStore.Insert(taskId, skuId, attributes, callback)
    },
    insertBatchTableStore: function (taskId, data, callback) {
        var attributes = [];
        data.Data.Items.forEach(function (row) {
            var unique_id = row.Unique.replace(/cn.jd./g, "");
            attributes.push({
                taskId: taskId,
                skuId: row.Unique,
                attributeColumns: [
                    {'data': JSON.stringify(data)},
                    {'url': 'https://item.jd.com/' + unique_id + '.html'},
                    {'subtitle': ''},
                    {'store': '京东'},
                    {'handle_status': 0},
                ]
            })
            if (attributes.length > 50) {
                tableStore.InsertBatch(attributes, callback);
                attributes = [];
            }
        })
        tableStore.InsertBatch(attributes, callback);
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
            if (!error && response.statusCode == 200) {
                return defer.resolve({status: true});
            } else {
                return defer.reject(error);
            }
        })
        return defer.promise;
    },
    queryRange: function (taskId, pagesize, callback) {
        tableStore.queryRange(taskId, pagesize, callback);
    },
    queryStatus: function (taskId, status, pagesize, callback) {
        tableStore.queryStatus(taskId, status, pagesize, callback);
    },
    curlHtml: function (taskId, data, callback) {
        data.Items.forEach(function (row) {
            var unique_id = row.Unique.replace(/cn.jd./g, "");
            //var url = "https://cd.jd.com/promotion/v2?skuId="+unique_id+"&area=1_72_2799_0&shopId=&venderId=93447&cat=1315%2C1345%2C9744&isCanUseDQ=isCanUseDQ-1&isCanUseJQ=isCanUseJQ-1&_=1513654815684";
            var url = "https://cd.jd.com/promotion/v2?skuId=" + unique_id + "&area=1_72_2799_0&shopId=1000000127&venderId=1000000127&cat=9987%2C653%2C655&isCanUseDQ=isCanUseDQ-0&isCanUseJQ=isCanUseJQ-0&_=1519444914343";
            getHtml(url, function (err, body) {
                if (err) {
                    console.log(unique_id + ' error')
                } else {
                    body = JSON.parse(body);
                    if (body) {
                        var subtitle = '';
                        if (body.hasOwnProperty('ads')) {
                            subtitle = body.ads[0].ad
                        }
                        var dd = subtitle.replace(/<.+?>.*<\/?.+?>/g, "");

                        subtitle = dd.replace(/ /g, "");
                        //保存到tablestore
                        controller.updateTableStore(taskId, 'cn.jd.' + unique_id, subtitle, callback);
                    } else {
                        console.log('切换识货proxy')
                        getHtmlShihuo(url, function (err, body) {
                            if (err) {
                                console.log(unique_id + ' error')
                            } else {
                                body = JSON.parse(body);
                                if (body) {
                                    var subtitle = '';
                                    if (body.hasOwnProperty('ads')) {
                                        subtitle = body.ads[0].ad
                                    }
                                    var dd = subtitle.replace(/<.+?>.*<\/?.+?>/g, "");
                                    subtitle = dd.replace(/ /g, "");
                                    //保存到tablestore
                                    controller.updateTableStore(taskId, 'cn.jd.' + unique_id, subtitle, callback);
                                } else {
                                    console.log('识货proxy 抓取error')
                                }
                            }
                        })
                    }
                }
            })
        })
    }
}

var dealerrorcallback = function (taskId, error) {
    var response = {Status: false, Msg: {Errors: [{Code: 'Error', Message: error}]}}
    //callback
    controller.callbackData(crawltaskConfig.postUrl.guonei, taskId, response, 'error').then(function (res) {
        console.log(res)
    }, function (err) {
        console.log(err.message)
    })
}

/*
 *获取html
 **/
function getHtml(urlStr, callback) {

    var options = {};
    options.timeout = 15000;
    options.url = urlStr;
    options.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
        "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        "Accept-Encoding": "deflate, sdch",
        "Accept-Language": "zh-CN,zh;q=0.8",
        "cookie": ":thw=cn; cna=fR+hDeeT50ICATr3cloaZbmD; miid=6345998908287345826; x=e%3D1%26p%3D*%26s%3D0%26c%3D0%26f%3D0%26g%3D0%26t%3D0%26__ll%3D-1%26_ato%3D0; lzstat_uv=8629291913329613887|2144678; tracknick=hxl724753832; _cc_=VT5L2FSpdA%3D%3D; tg=0; _m_h5_tk=a8c851e108396671a4a47fe2800f8b1c_1453691787833; _m_h5_tk_enc=cc4c05577d30d7d43b66584d2846a3d7; v=0; linezing_session=9q62Zftrxc6myk5U5wogiuSm_1453875476406Wc5G_1; isg=4BDE5B1133BD9B93442D2FA1B939DF07; _tb_token_=583e611e13374; mt=ci%3D-1_0; uc1=cookie14=UoWyjVdEi6VXIg%3D%3D; cookie2=1c7b75338f80538f4f0548e69714c245; t=17cb7c33aba0dc662a5d8eb53fdf6401; l=ApCQQCCBQfb994wdQkfa8wZJ4NDlzHTW"
    };

    var urlParsed = url.parse(urlStr);
    var proxyHost = "http-dyn.abuyun.com";
    var proxyPort = "9020";
    var proxyUser = "H1B70L4D3801OSOD";
    var proxyPass = "96FA7DBB0020A1E6";

    var base64 = new Buffer(proxyUser + ":" + proxyPass).toString("base64");

    options.url = 'http://' + proxyHost + ":" + proxyPort + urlParsed.path;
    !options.headers && (options.headers = {});
    options.headers['Host'] = urlParsed.hostname;
    options.headers['Proxy-Authorization'] = "Basic " + base64;

    var chunks = [];
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var decodedBody = iconv.decode(Buffer.concat(chunks), 'gbk');
            callback(null, decodedBody, response);
        } else {
            callback(error, null, null);
        }
    }).on('data', function (data) {
        chunks.push(data);
    });
}

/*
 *获取html
 **/
function getHtmlShihuo(urlStr, callback) {

    var options = {};
    options.url = urlStr;
    options.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
        "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        "Accept-Encoding": "deflate, sdch",
        "Accept-Language": "zh-CN,zh;q=0.8",
        "cookie": ":thw=cn; cna=fR+hDeeT50ICATr3cloaZbmD; miid=6345998908287345826; x=e%3D1%26p%3D*%26s%3D0%26c%3D0%26f%3D0%26g%3D0%26t%3D0%26__ll%3D-1%26_ato%3D0; lzstat_uv=8629291913329613887|2144678; tracknick=hxl724753832; _cc_=VT5L2FSpdA%3D%3D; tg=0; _m_h5_tk=a8c851e108396671a4a47fe2800f8b1c_1453691787833; _m_h5_tk_enc=cc4c05577d30d7d43b66584d2846a3d7; v=0; linezing_session=9q62Zftrxc6myk5U5wogiuSm_1453875476406Wc5G_1; isg=4BDE5B1133BD9B93442D2FA1B939DF07; _tb_token_=583e611e13374; mt=ci%3D-1_0; uc1=cookie14=UoWyjVdEi6VXIg%3D%3D; cookie2=1c7b75338f80538f4f0548e69714c245; t=17cb7c33aba0dc662a5d8eb53fdf6401; l=ApCQQCCBQfb994wdQkfa8wZJ4NDlzHTW"
    };

    var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
    Q('get').then(function (success) {
        var defer = Q.defer();
        request({url: developUrl, timeout: 2000}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if (body.status == 'ok') {
                    options.proxy = 'http://' + body.Ip.Ip + ':' + body.Ip.Port;
                    defer.resolve('success');
                }
            } else {
                defer.reject('代理服务器错误');
            }
        })

        return defer.promise;
    }).then(function (success) {
        var chunks = [];
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var decodedBody = iconv.decode(Buffer.concat(chunks), 'gbk');
                callback(null, decodedBody, response);
            } else {
                callback(error, null, null);
            }
        }).on('data', function (data) {
            chunks.push(data);
        });

    }, function (rejected) {
        callback(rejected, null, null);
    })
}


var task_id;
var crawl_num = 0;
//处理
var deal = function () {
    console.log(cluster.worker.id + ' start jd');
    if (task_id) {
        //记日志
        fun.stoneLog('crawlStoreJd', 'info', {"param1": task_id, "param2": '', "param": {"message": '继续处理'}})
        crawl(res.data.task_id);
    } else {
        controller.getData(crawltaskConfig.getUrl.guonei + '?store=%e4%ba%ac%e4%b8%9c').then(function (res) {
            if (res.code == 200) {
                //记日志
                fun.stoneLog('crawlStoreJd', 'info', {
                    "param1": res.data.task_id,
                    "param2": res.data.url,
                    "param": {"message": '开始处理'}
                })
                crawl(res.data.task_id, res.data.url);
            }
        }, function (err) {
            fun.stoneLog('crawlStoreJd', 'error', {"param1": '', "param2": '', "param": {"message": '获取数据错误'}})
            console.log(err.message)
        })
    }

}
var crawl = function (taskId, url) {
    controller.queryRange(taskId, 1000, function (err, rows) {
        if (rows.rows.length > 0) {//有抓取过
            var tmpArr = {Items: []};
            rows.rows.forEach(function (row) {
                var handle_index = _.findIndex(row.attributes, {'columnName': 'handle_status'});
                if (handle_index && row.attributes[handle_index].columnValue == 0) {
                    tmpArr.Items.push({Unique: row.primaryKey[1].value});
                }
            })
            controller.curlHtml(taskId, tmpArr, function (err, rows) {
                if (!err) {
                    fun.stoneLog('crawlStoreJd', 'info', {
                        "param1": taskId,
                        "param2": '',
                        "param": {"message": '子商品抓取副标题成功', 'unique_id': rows.sku_id}
                    })
                    controller.queryStatus(taskId, 0, 1, function (err_st, rows_st) {
                        if (rows_st.rows.length == 0) {
                            controller.queryStatus(taskId, 1, 1000, function (err_stst, rows_stst) {
                                if (rows_stst.rows.length > 0) {
                                    var tmpTitleArr = {};
                                    var content;
                                    rows_stst.rows.forEach(function (row_ststfe) {
                                        var index = _.findIndex(row_ststfe.attributes, {'columnName': 'subtitle'});
                                        tmpTitleArr[row_ststfe.primaryKey[1].value] = row_ststfe.attributes[index].columnValue;
                                        var index_data = _.findIndex(row_ststfe.attributes, {'columnName': 'data'});
                                        if (!content) content = row_ststfe.attributes[index_data].columnValue;
                                    })
                                    if (content) {
                                        content = JSON.parse(content);
                                        content.Data.Items.forEach(function (row_ststfeItem, row_index) {
                                            content.Data.Items[row_index].Offers[0].Subtitle = tmpTitleArr[row_ststfeItem.Unique];
                                        })
                                    }
                                    //callback
                                    controller.callbackData(crawltaskConfig.postUrl.guonei, taskId, content, 'success').then(function (res) {
                                        console.log(res)
                                        task_id = '';
                                        crawl_num = 0;
                                        fun.stoneLog('crawlStoreJd', 'info', {
                                            "param1": taskId,
                                            "param2": '',
                                            "param": {"message": 'callback成功'}
                                        })
                                    }, function (err) {
                                        fun.stoneLog('crawlStoreJd', 'error', {
                                            "param1": taskId,
                                            "param2": '',
                                            "param": {"message": 'callback失败--' + err.message}
                                        })
                                        console.log(err.message)
                                    })
                                }
                            })
                        }
                    })
                } else {
                    crawl_num++;
                    fun.stoneLog('crawlStoreJd', 'error', {"param1": taskId, "param2": '', "param": {"message": err}})
                    if (crawl == 3) dealerrorcallback(task_id, err);
                }
            })
        } else if (url) {
            console.log(url)
            jd.getInfo(url, function (error, itemInfo) {
                if (error) {
                    fun.stoneLog('crawlStoreJd', 'error', {"param1": taskId, "param2": url, "param": error})
                    crawl_num++;
                    if (crawl == 3) dealerrorcallback(task_id, error);
                } else {
                    fun.stoneLog('crawlStoreJd', 'info', {
                        "param1": taskId,
                        "param2": '',
                        "param": {"message": '获取基本信息成功'}
                    })

                    //不正常
                    if (itemInfo.Status != 'inStock') {

                        //保存tablestore
                        var content = {Status: true, Data: itemInfo};
                        controller.insertTableStore(taskId, itemInfo.Unique, url, content, function (err, rows) {
                            if (err) {
                                fun.stoneLog('crawlStoreJd', 'error', {
                                    "param1": taskId,
                                    "param2": url,
                                    "param": {"message": '保存tablestore失败--' + err.message}
                                })
                                dealerrorcallback(taskId, err.message);
                            } else {
                                console.log('success')
                                fun.stoneLog('crawlStoreJd', 'info', {
                                    "param1": taskId,
                                    "param2": url,
                                    "param": {"message": '保存tablestore成功'}
                                })
                                //callback
                                controller.callbackData(crawltaskConfig.postUrl.guonei, taskId, content, 'success').then(function (res) {
                                    console.log(res)
                                    task_id = '';
                                    crawl_num = 0;
                                    fun.stoneLog('crawlStoreJd', 'info', {
                                        "param1": taskId,
                                        "param2": url,
                                        "param": {"message": 'callback成功'}
                                    })
                                }, function (err) {
                                    fun.stoneLog('crawlStoreJd', 'error', {
                                        "param1": taskId,
                                        "param2": url,
                                        "param": {"message": 'callback失败--' + err.message}
                                    })
                                    console.log(err.message)
                                })
                            }
                        })


                    } else {
                        controller.insertBatchTableStore(taskId, {Status: true, Data: itemInfo}, function (err, rows) {
                            if (err) {
                                fun.stoneLog('crawlStoreJd', 'error', {"param1": taskId, "param2": url, "param": err})
                                crawl_num++;
                                if (crawl == 3) dealerrorcallback(task_id, err);
                                console.log(err.message)
                            } else {
                                controller.curlHtml(taskId, itemInfo, function (err, rows) {
                                    if (!err) {
                                        fun.stoneLog('crawlStoreJd', 'info', {
                                            "param1": taskId,
                                            "param2": url,
                                            "param": {"message": '子商品抓取副标题成功', 'unique_id': rows.sku_id}
                                        })
                                        controller.queryStatus(taskId, 0, 1, function (err_st, rows_st) {
                                            if (rows_st.rows.length == 0) {
                                                controller.queryStatus(taskId, 1, 1000, function (err_stst, rows_stst) {
                                                    if (rows_stst.rows.length > 0) {
                                                        var tmpTitleArr = {};
                                                        var content
                                                        rows_stst.rows.forEach(function (row_ststfe) {
                                                            var index = _.findIndex(row_ststfe.attributes, {'columnName': 'subtitle'});
                                                            tmpTitleArr[row_ststfe.primaryKey[1].value] = row_ststfe.attributes[index].columnValue;
                                                            var index_data = _.findIndex(row_ststfe.attributes, {'columnName': 'data'});
                                                            if (!content) content = row_ststfe.attributes[index_data].columnValue;
                                                        })
                                                        if (content) {
                                                            content = JSON.parse(content);
                                                            content.Data.Items.forEach(function (row_ststfeItem, row_index) {
                                                                content.Data.Items[row_index].Offers[0].Subtitle = tmpTitleArr[row_ststfeItem.Unique];
                                                            })
                                                        }
                                                        //callback
                                                        controller.callbackData(crawltaskConfig.postUrl.guonei, taskId, content, 'success').then(function (res) {
                                                            console.log(res)
                                                            task_id = '';
                                                            crawl_num = 0;
                                                            fun.stoneLog('crawlStoreJd', 'info', {
                                                                "param1": taskId,
                                                                "param2": url,
                                                                "param": {"message": 'callback成功'}
                                                            })
                                                        }, function (err) {
                                                            fun.stoneLog('crawlStoreJd', 'error', {
                                                                "param1": taskId,
                                                                "param2": url,
                                                                "param": {"message": 'callback失败--' + err.message}
                                                            })
                                                            console.log(err.message)
                                                        })
                                                    }
                                                })
                                            }
                                        })
                                    } else {
                                        fun.stoneLog('crawlStoreJd', 'error', {
                                            "param1": taskId,
                                            "param2": url,
                                            "param": {"message": err}
                                        })
                                        crawl_num++;
                                        if (crawl == 3) dealerrorcallback(task_id, err);
                                    }
                                })
                            }
                        });
                    }
                }
            });
        }
    })
}

process.on('uncaughtException', function (err) {
    console.log(err.message);
    fun.stoneLog('crawlStoreJd', 'error', {"param1": '', "param2": '', "param": {"message": '捕捉到错误--' + err.message}})
    if (task_id) {
        //dealerrorcallback(task_id, err.message);
    }
});

if (cluster.isMaster) {
    for (var i = 0; i < crawltaskConfig.taskNum.jd; i++) {
        cluster.fork();
    }
    cluster.on('exit', function (worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
        cluster.fork();
    });
} else {
    //start
    console.log("I am worker #" + cluster.worker.id);
    setInterval(function () {
        deal(task_id);
    }, 10000)
}




