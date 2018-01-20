var TableStore = require('tablestore');
var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';

var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var tablestoreConf = config.db.tablestore;
var tableName = 'stone_crawl_content';

var client = new TableStore.Client({
    accessKeyId: tablestoreConf.accessKeyId,
    secretAccessKey:tablestoreConf.secretAccessKey,
    endpoint: tablestoreConf.endpoint,
    instancename: tablestoreConf.instancename,
    maxRetries:10,//默认10次重试，可以省略这个参数。
})
var Long = TableStore.Long;

//插入新数据
function insert(taskId, attributes, callback) {
    var params = {
        tableName: tableName,
        condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, null),
        primaryKey: [
            { 'task_id': taskId }
        ],
        attributeColumns: attributes,
        returnContent: { returnType: TableStore.ReturnType.Primarykey }
    };

    client.putRow(params, function (err, data) {
        callback(err, data);
    });
}

//批量插入新数据
function insertBatch(attributes, callback) {
    
    var rows = [];
    attributes.forEach(function (row) {
        rows.push({
            type: 'PUT',
            condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, null),
            primaryKey: [
            { 'task_id': row.taskId },
            ],
            attributeColumns:row.attributeColumns,
            returnContent: { returnType: TableStore.ReturnType.Primarykey }
        });
    })
    var params = {tables:[{
        tableName: tableName,
        rows:rows
    }]};

    client.batchWriteRow(params, function (err, data) {
        callback(err, data);
    });
}

//更新数据
function update(taskId,attributes, callback) {
    query(taskId, skuId, function (err, rows) {
        if (err) {
            callback(err);
            return;
        }

        var currentTimeStamp = Date.now();
        var params = {
            tableName: tableName,
            condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, null),
            primaryKey: [
                { 'task_id': taskId },
            ],
            updateOfAttributeColumns: [
                { 'PUT': attributes},
            ]
        };

        client.updateRow(params, function (err, data) {
            if (err) {
                callback(err);
                return;
            }
            callback(null, data)
        });
    });
}

//查询数据
function query(taskId, callback) {
    var params = {
        tableName: tableName,
        primaryKey: [{ 'task_id': taskId }],
    };

    client.getRow(params, function (err, data) {
        if (err) {
            callback(err)
            return;
        }
        callback(null, data.row)
    })
}

exports.tableStore = {
    TableStore: TableStore,
    Insert: insert,
    InsertBatch:insertBatch,
    Update: update,
    Query: query
}
