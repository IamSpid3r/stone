var TableStore = require('tablestore');
var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';

var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var tablestoreConf = config.db.tablestore;
var tableName = 'stone_ticket';

var client = new TableStore.Client({
    accessKeyId: tablestoreConf.accessKeyId,
    secretAccessKey:tablestoreConf.secretAccessKey,
    endpoint: tablestoreConf.endpoint,
    instancename: tablestoreConf.instancename,
    maxRetries:10,//默认10次重试，可以省略这个参数。
})
var Long = TableStore.Long;

//插入新数据
function insert(shopId, attributes, callback) {
    var params = {
        tableName: tableName,
        condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, null),
        primaryKey: [
            { 'shop_id': shopId },
        ],
        attributeColumns: attributes,
        returnContent: { returnType: TableStore.ReturnType.Primarykey }
    };

    client.putRow(params, function (err, data) {
        callback(err, data);
    });
}

//更新数据
function update(shopId, attributes, callback) {
    var params = {
        tableName: tableName,
        condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, null),
        primaryKey: [
            { 'shop_id': shopId },
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
}

//查询数据
function query(shopId, callback) {
    var params = {
        tableName: tableName,
        primaryKey:  [{ 'shop_id': shopId }],
        maxVersions:1
    };

    client.getRow(params, function (err, data) {
        if (err) {
            return callback(err)
        }

        callback(null, data.row)
    })
}


exports.tableStore = {
    TableStore: TableStore,
    Insert: insert,
    Update: update,
    Query: query,
}
