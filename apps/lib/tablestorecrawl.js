var TableStore = require('tablestore');
var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';

var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var tablestoreConf = config.db.tablestore;
var tableName = 'stone_sku_crawl';

//guowai tablestore 走公网
const os = require('os');
const guowaiIp = config.app.ip.guowai;
if (guowaiIp.indexOf(os.networkInterfaces().eth0[0].address)) {
    tablestoreConf.endpoint = 'https://stone.cn-hangzhou.ots.aliyuncs.com';
}

var client = new TableStore.Client({
    accessKeyId: tablestoreConf.accessKeyId,
    secretAccessKey:tablestoreConf.secretAccessKey,
    endpoint: tablestoreConf.endpoint,
    instancename: tablestoreConf.instancename,
    maxRetries:10,//默认10次重试，可以省略这个参数。
})
var Long = TableStore.Long;

//插入新数据
function insert(taskId, skuId, attributes, callback) {
    var params = {
        tableName: tableName,
        condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, null),
        primaryKey: [
            { 'task_id': taskId },
            { 'sku_id':  skuId}
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
            { 'sku_id':  row.skuId}
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
function update(taskId, skuId, attributes, callback) {
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
                { 'sku_id': skuId }
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
            data.sku_id = skuId;
            callback(null, data)
        });
    });
}

//查询数据
function query(taskId, skuId, callback) {
    var params = {
        tableName: tableName,
        primaryKey: [{ 'task_id': taskId }, { 'sku_id': skuId }],
    };

    client.getRow(params, function (err, data) {
        if (err) {
            callback(err)
            return;
        }

        callback(null, data.rows)
    })
}

//查询未处理成功数据
function queryStatus(taskId, status, pageSize, callback) {
    var params = {
        tableName: tableName,
        direction: TableStore.Direction.FORWARD,
        inclusiveStartPrimaryKey: [ {"task_id": taskId },  { "sku_id": TableStore.INF_MIN }],
        exclusiveEndPrimaryKey: [ {"task_id": taskId },  { "sku_id": TableStore.INF_MAX }],
        limit: pageSize,
        maxVersions:1
    };

    // var condition = new TableStore.CompositeCondition(TableStore.LogicalOperator.AND);
    // condition.addSubCondition(new TableStore.SingleColumnCondition('handle_status', status, TableStore.ComparatorType.EQUAL));
    // condition.addSubCondition(new TableStore.SingleColumnCondition('handle_status', status, TableStore.ComparatorType.EQUAL));

    // params.columnFilter = condition;

    params.columnFilter =  new TableStore.SingleColumnCondition('handle_status', status, TableStore.ComparatorType.EQUAL);

    client.getRange(params, function (err, data) {
        if (err) {
            callback(err)
            return;
        }

        callback(null, data)
    })
}

//查询数据
function queryRange(taskId, pageSize, callback) {
    var params = {
        tableName: tableName,
        direction: TableStore.Direction.FORWARD,
        inclusiveStartPrimaryKey: [ {"task_id": taskId },  { "sku_id": TableStore.INF_MIN }],
        exclusiveEndPrimaryKey: [ {"task_id": taskId },  { "sku_id": TableStore.INF_MAX }],
        limit: pageSize,
        maxVersions:1
    };

    client.getRange(params, function (err, data) {
        if (err) {
            callback(err)
            return;
        }
        //如果data.next_start_primary_key不为空，说明需要继续读取
        // if (data.next_start_primary_key) {}

        callback(null, data)
    })
}


exports.tableStore = {
    TableStore: TableStore,
    Insert: insert,
    InsertBatch:insertBatch,
    Update: update,
    Query: query,
    queryRange:queryRange,
    queryStatus:queryStatus
}
