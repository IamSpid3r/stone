const esClient = require(process.cwd()+'/apps/lib/elasticsearch.js').esClient;
const _index = 'crawl_main_tasks';
const _type = 'crawl_main_tasks';

//search
function search(condition, callback) {
    var boolMust = boolMustNot = [] ,body = {};

    body.query = {};
    body.size = condition.hasOwnProperty('size') ? condition.size : 30;
    //系统级别的from
    body.from = condition.hasOwnProperty('offset') ? condition.offset : 0;
    if (condition.hasOwnProperty('status')) {
        boolMust.push(
            {
                "terms": {
                    "status":  Array.isArray(condition.status) ? condition.status : [condition.status]
                }
            }
        )
    }
    if (condition.hasOwnProperty('callback_status')) {
        boolMust.push(
            {
                "terms": {
                    "callback_status":  Array.isArray(condition.callback_status) ? condition.callback_status : [condition.callback_status]
                }
            }
        )
    }
    if (condition.hasOwnProperty('task_id')) {
        boolMust.push(
            {
                "terms": {
                    "task_id": Array.isArray(condition.task_id) ? condition.task_id : [condition.task_id]
                }
            }
        )
    }
    if (condition.hasOwnProperty('url')) {
        boolMust.push(
            {
                "terms": {
                    "url":  Array.isArray(condition.url) ? condition.url : [condition.url]
                }
            }
        )
    }
    if (condition.hasOwnProperty('store')) {
        boolMust.push(
            {
                "terms": {
                    "store":  Array.isArray(condition.store) ? condition.store : [condition.store]
                }
            }
        )
    }
    if (condition.hasOwnProperty('update_err_num')) {
        boolMust.push(
            {
                "range": {
                    "update_err_num":  {"lt":condition.update_err_num}
                }
            }
        )
    }
    if (condition.hasOwnProperty('updateErrNum')) {
        boolMust.push(
            {
                "range": {
                    "update_err_num":  {"gt":condition.updateErrNum}
                }
            }
        )
    }
    if (condition.hasOwnProperty('callback_err_num')) {
        boolMust.push(
            {
                "range": {
                    "callback_err_num":  {"lt":condition.callback_err_num}
                }
            }
        )
    }
    if (condition.hasOwnProperty('update_at')) {
        boolMust.push(
            {
                "range": {
                    "update_at":  {"lt":condition.update_at}
                }
            }
        )
    }
    if (condition.hasOwnProperty('create_at')) {
        boolMust.push(
            {
                "range": {
                    "create_at":  {"gt":condition.create_at}
                }
            }
        )
    }
    if (condition.hasOwnProperty('updateAt')) {
        boolMust.push(
            {
                "range": {
                    "update_at":  {"gt":condition.updateAt}
                }
            }
        )
    }

    if (condition.hasOwnProperty('notice')) {
        boolMust.push(
            {"bool":
                {"should":[
                            {"term":{"status":2}},
                            {"range": {"update_err_num":{"gt":3}}}
                        ]
                }
            }
        );
    }

    var aggs;
    //aggs
    if (condition.hasOwnProperty('aggs')) {
        if (condition.aggs == 'store'){
            aggs = {
                "store": {
                    "terms": {
                    "field": "store",
                    "size": condition.size
                  }
                }
            };
        } else if(condition.aggs == 'url'){
            aggs = {
                "url": {
                    "terms": {
                    "field": "url",
                    "size": condition.size
                  }
                }
            };
        }
    }

    if (condition.hasOwnProperty('sort')) {
        var sort = condition.sort;
        body.sort = [];
        sort.forEach(function (sortRow) {
            var tmpSort = {};
            tmpSort[sortRow[0]] = sortRow[1];
            body.sort.push(tmpSort);
        })
    }
    if (boolMust) {
        body.query.bool = {};
        body.query.bool.must = boolMust;
    }

    if(aggs){
        body.aggs = aggs;
    }
    var params = {
        index : _index,
        type  : _type,
        body   : body
    };

    esClient.search(params, function (err, res) {
        return callback(err, res);
    })
}

//count
function count(condition, callback) {
    var boolMust = boolMustNot = [] ,body = {};

    body.query = {};
    if (condition.hasOwnProperty('status')) {
        boolMust.push(
            {
                "terms": {
                    "status":  Array.isArray(condition.status) ? condition.status : [condition.status]
                }
            }
        )
    }
    if (condition.hasOwnProperty('callback_status')) {
        boolMust.push(
            {
                "terms": {
                    "callback_status":  Array.isArray(condition.callback_status) ? condition.callback_status : [condition.callback_status]
                }
            }
        )
    }
    if (condition.hasOwnProperty('task_id')) {
        boolMust.push(
            {
                "terms": {
                    "task_id": Array.isArray(condition.task_id) ? condition.task_id : [condition.task_id]
                }
            }
        )
    }
    if (condition.hasOwnProperty('url')) {
        boolMust.push(
            {
                "terms": {
                    "url":  Array.isArray(condition.url) ? condition.url : [condition.url]
                }
            }
        )
    }
    if (condition.hasOwnProperty('store')) {
        boolMust.push(
            {
                "terms": {
                    "store":  Array.isArray(condition.store) ? condition.store : [condition.store]
                }
            }
        )
    }
    if (boolMust) {
        body.query.bool = {};
        body.query.bool.must = boolMust;
    }

    var params = {
        index : _index,
        type  : _type,
        body   : body
    };

    esClient.count(params, function (err, res) {
        return callback(err, res);
    })
}

//create
function create(body, callback) {
    if (typeof body.task_id == 'undefined') {
        return callback(new Error('缺少task_id'));
    }

    var params = {
        index : _index,
        type  : _type,
        id : body.task_id,
        body   : body
    };

    esClient.create(params, function (err, res) {
        return callback(err, res);
    })
}

//update
function update(body, callback, refresh) {
    if (typeof body.task_id == 'undefined') {
        return callback(new Error('缺少task_id'));
    }

    var params = {
        index  : _index,
        type  : _type,
        id    : body.task_id,
        body   : {
            doc: body
        }
    };

     //立即刷新
    if (refresh) {
        params.refresh = true;
    }

    esClient.update(params, function (err, res) {
        return callback(err, res);
    })
}

//delete
function _delete(body, callback) {
    if (typeof body.task_id == 'undefined') {
        return callback(new Error('缺少task_id'));
    }

    var params = {
        index  : _index,
        type  : _type,
        id    : body.task_id,
    };

    esClient.delete(params, function (err, res) {
        return callback(err, res);
    })
}

//bulk
function bulk(body, operate, callback) {
    var params = [];

    body.forEach(function (val) {
        if ('create' == operate) {
            params.push({ 'create' :  { _index: _index, _type: _index, _id: val.task_id } });
            params.push(val);
        } else {
            params.push({ 'update' :  { _index: _index, _type: _index, _id: val.task_id } });
            params.push({ doc: val});
        }
    })

    esClient.bulk({body : params}, function (err, res) {
        return callback(err, res);
    })
}

//mapping
function mapping(callback) {
    var mappingBody = {
        "properties": {
            "task_id": {
                "type": "keyword"
            },
            "url": {
                "type": "keyword"
            },
            "store": {
                "type": "keyword"
            },
            "sku_info": {
                "type": "keyword"
            },
            "from": {
                "type": "byte"
            },
            "update_err_num": {
                "type": "byte"
            },
            "status": {
                "type": "byte"
            },
            "callback_status": {
                "type": "byte"
            },
            "callback_err_num": {
                "type": "byte"
            },
            "update_at" : {
                "type":   "date"
            },
            "create_at" : {
                "type":   "date"
            }
        }
    };

    var params = {
        'index' : _index,
        'type'  : _type,
        'body'  : mappingBody
    };

    esClient.indices.putMapping(params,function (err, res) {
        return callback(err, res);
    });
}

exports.esClient = {
    search : search,
    create : create,
    update : update,
    count  : count,
    delete : _delete,
    bulk : bulk,
    mapping: mapping
}

// create({
//     'task_id' : '43dec2e034a4fdf18fe2d666d0f03553',
//     'url' : 'https://detail.tmall.com/item.htm?id=540219887479',
//     'store' :'天猫',
//     'status' : 1,
//     'from' : 0,
//     'update_info' : '{"unique":"cn.taobao.543352005477","md5":"ea3516f9f4bad171f81ca913a9494898","items":8,"vals":4}',
//     'update_status' : 0,
//     'update_err_status' : 0,
//     'updated_at' : '2017-12-08 15:31:31',
//     'created_at' : '2017-12-08 15:31:31',
// }, function (err, res) {
//     console.log(err, res)
// })

// update({'task_id' : '43dec2e034a4fdf18fe2d666d0f03553','status' : 2},
//     function (err, res) {
//     console.log(err, res)
// })

// bulk([
//     {"task_id": "69e1f814894b36a9acc0267f49d88345", "url" : "http://item.yohobuy.com/product/p149591.html"},
//     {"task_id": "0b5a69cf8fae49ddf5a89a54e7e22529", "url" : "http://item.yohobuy.com/product/p803452.html"},
// ], 'create', function (err, res) {
//     console.log(err, res)
// });

// search({status : 2}, function (err, res) {
//     console.log(err, res.hits.hits[0]._source)
// })
//
// _delete({task_id:'0b5a69cf8fae49ddf5a89a54e7e22529'},function (err, res) {
//     console.log(err, res)
// } )