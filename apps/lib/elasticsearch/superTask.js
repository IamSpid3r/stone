const esClient = require(process.cwd()+'/apps/lib/elasticsearch.js').esClient;
const _index = 'super_task_';
const _type = 'super_task';

const fun = require(process.cwd()+"/apps/lib/fun.js");

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
    if (condition.hasOwnProperty('task_id')) {
        boolMust.push(
            {
                "terms": {
                    "task_id": Array.isArray(condition.task_id) ? condition.task_id : [condition.task_id]
                }
            }
        )
    }
    if (condition.hasOwnProperty('from')) {
        boolMust.push(
            {
                "terms": {
                    "from": Array.isArray(condition.from) ? condition.from : [condition.from]
                }
            }
        )
    }
    if (condition.hasOwnProperty('update_at')) {
        boolMust.push(
            {
                "range": {
                    "update_at": {
                        "gte" : condition.update_at.from,
                        "lte" : condition.update_at.to,
                    }
                }
            }
        )
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

    if (boolMust.length > 0) {
        body.query.bool = {};
        body.query.bool.must = boolMust;
    } else {
        body.query.match_all  = {};
    }

    //查询的从最近三天的索引查询
    _dateToday = _index+fun.dateformat(new Date(), 'yyyy.MM.dd');
    _dateYesterday = _index+fun.dateformat(new Date(new Date()-24*60*60*1000), 'yyyy.MM.dd');
    _dateBeforeYd = _index+fun.dateformat(new Date(new Date()-48*60*60*1000), 'yyyy.MM.dd');
    _indexArr =[_dateToday, _dateYesterday ,_dateBeforeYd]

    var params = {
        index : _indexArr,
        body   : body
    };

    esClient.search(params, function (err, res) {
        return callback(err, res);
    })
}

//create
function create(body, callback) {
    if (typeof body.task_id == 'undefined') {
        return callback(new Error('缺少task_id'));
    }
    //索引和日期相关
    var task_id = body.task_id;
    var _date = task_id.substr(0, 10);
    if (!fun.isDate(_date)) {
        return callback(new Error('task_id非日期格式'));
    }
    var _indexReal = _index+_date;

    var params = {
        index : _indexReal,
        type : _type,
        id : task_id,
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
    //索引和日期相关
    var task_id = body.task_id;
    var _date = task_id.substr(0, 10);
    if (!fun.isDate(_date)) {
        return callback(new Error('task_id非日期格式'));
    }
    var _indexReal = _index+_date;

    var params = {
        index : _indexReal,
        type : _type,
        id : task_id,
        body   : {
            doc: body
        }
    };
    // if (refresh) {
    //     params.refresh = true;
    // }

    esClient.update(params, function (err, res) {
        return callback(err, res);
    })
}

//delete
function _delete(body, callback) {
    if (typeof body.task_id == 'undefined') {
        return callback(new Error('缺少task_id'));
    }
    //索引和日期相关
    var task_id = body.task_id;
    var _date = task_id.substr(0, 10);
    if (!fun.isDate(_date)) {
        return callback(new Error('task_id非日期格式'));
    }
    var _indexReal = _index+_date;

    var params = {
        index  : _indexReal,
        type  : _type,
        id    : task_id,
    };

    esClient.delete(params, function (err, res) {
        return callback(err, res);
    })
}

//bulk
function bulk(body, operate, callback) {
    var params = [];
    body.forEach(function (val) {
        //索引和日期相关
        task_id = val.task_id;
        _date = task_id.substr(0, 10);

        if (fun.isDate(_date)) {
            var _indexReal = _index+_date;
            if ('create' == operate) {
                params.push({ 'create' :  { _index: _indexReal, _type: _type, _id: task_id } });
                params.push(val);
            } else {
                params.push({ 'update' :  { _index: _indexReal, _type: _type, _id: task_id } });
                params.push({ doc: val});
            }
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
                "type": "keyword",
            },
            "url": {
                "type": "keyword",
            },
            "url_md5": {
                "type": "keyword",
            },
            "attr": {
                "type": "text",
                "analyzer": "ik_max_word",
                "search_analyzer": "ik_max_word"
            },
            "store": {
                "type": "keyword",
            },
            "status": {
                "type": "byte",
            },
            "from": {
                "type": "byte"
            },
            "update_info": {
                "type": "text",
                "analyzer": "ik_max_word",
                "search_analyzer": "ik_max_word"
            },
            "update_status": {
                "type": "byte",
            },
            "update_err_status": {
                "type": "byte",
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
//     'update_at' : '2017-12-08 15:31:31',
//     'create_at' : '2017-12-08 15:31:31',
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