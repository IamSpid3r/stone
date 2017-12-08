var TableStore = require('tablestore');
var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';

var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var tablestoreConf = config.db.tablestore;
var tableName = tablestoreConf.tableName;

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
    var currentTimeStamp = Date.now();
    var params = {
        tableName: tableName,
        condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, null),
        primaryKey: [
            { 'task_id': taskId },
            { 'update_time':  Long.fromNumber(currentTimeStamp)}
        ],
        attributeColumns: attributes,
        returnContent: { returnType: TableStore.ReturnType.Primarykey }
    };

    client.putRow(params, function (err, data) {
        callback(err, data);
    });
}

//更新数据
function update(taskId, attributes, callback) {
    query(taskId, function (err, rows) {
        if (err) {
            callback(err);
            return;
        }

        var updateTime = null;
        rows[0].primaryKey.forEach(function (primaryVal) {
            if (primaryVal.name == 'update_time') {
                updateTime = primaryVal.value;
            }
        })
        if (!updateTime) {
            callback(new Error('miss primaryKey update_time'));
            return;
        }

        var currentTimeStamp = Date.now();
        var params = {
            tableName: tableName,
            condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, null),
            primaryKey: [
                { 'task_id': taskId },
                { 'update_time': updateTime }
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
        direction: TableStore.Direction.FORWARD,
        inclusiveStartPrimaryKey: [{ 'task_id': taskId }, { "update_time": TableStore.INF_MIN }],
        exclusiveEndPrimaryKey: [{ "task_id": taskId }, { "update_time": TableStore.INF_MAX }],
        limit: 1,
        maxVersions:1
    };

    client.getRange(params, function (err, data) {
        if (err) {
            callback(err)
            return;
        }

        callback(null, data.rows)
    })
}


//查询数据
function queryRange(starTime, endTime, pageSize, callback) {
    var params = {
        tableName: tableName,
        direction: TableStore.Direction.FORWARD,
        inclusiveStartPrimaryKey: [ {"task_id": TableStore.INF_MIN },  { "update_time": Long.fromNumber(starTime) }],
        exclusiveEndPrimaryKey: [ {"task_id": TableStore.INF_MAX },  { "update_time": Long.fromNumber(endTime) }],
        limit: pageSize,
        maxVersions:1
    };

    //console.log(starTime, endTime);
    // var condition = new TableStore.CompositeCondition(TableStore.LogicalOperator.AND);
    // condition.addSubCondition(new TableStore.SingleColumnCondition('store', '京东', TableStore.ComparatorType.EQUAL));
    // condition.addSubCondition(new TableStore.SingleColumnCondition('store', '京东', TableStore.ComparatorType.EQUAL));
    // params.columnFilter = condition;

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
    Update: update,
    Query: query,
    QueryRange: queryRange
}
