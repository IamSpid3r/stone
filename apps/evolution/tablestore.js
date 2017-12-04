var TableStore = require('tablestore');
var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';

var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var tablestoreConf = config.db.tablestore;

var client = new TableStore.Client({
    accessKeyId: tablestoreConf.accessKeyId,
    secretAccessKey:tablestoreConf.secretAccessKey,
    endpoint: tablestoreConf.endpoint,
    instancename: tablestoreConf.instancename,
    maxRetries:20,//默认20次重试，可以省略这个参数。
})
var Long = TableStore.Long;
var currentTimeStamp = Date.now();

//console.log(TableStore.ComparatorType)

//  params = {
//     tableName: "han",
//     condition: new TableStore.Condition(TableStore.RowExistenceExpectation.IGNORE, null),
//     primaryKey: [{ 'taskId': Long.fromNumber(3) }, { 'update_time': Long.fromNumber(90) }],
//     updateOfAttributeColumns: [
//         { 'PUT': [{ 'store': '京东' }] },
//         { 'DELETE': [{ 'col1': Long.fromNumber(1496826473186) }] },
//         { 'DELETE_ALL': ['col2'] }
//     ]
// };
// client.updateRow(params,
//     function (err, data) {
//         if (err) {
//             console.log('error:', err);
//             return;
//         }
//         console.log('success:', data);
//     });



// var params = {
//     tableName: "han",
//     condition: new TableStore.Condition(TableStore.RowExistenceExpectation.EXPECT_NOT_EXIST, null),
//     primaryKey: [{ 'task_Id': Long.fromNumber(3) }, { 'update_time':  Long.fromNumber(currentTimeStamp)}],
//     attributeColumns: [
//         {"store":"京东"},
//         {"url":"https://help.aliyun.com/document_detail/27300.html"},
//         {"rank": "2"},
//     ],
//     returnContent: { returnType: TableStore.ReturnType.Primarykey }
// };
// client.putRow(params, function (err, data) {
//     if (err) {
//         console.log('error:', err);
//         return;
//     }
//     console.log('succes:', data);
// });



// params = {
//     tableName: "han",
//     primaryKey: [{ 'task_Id': Long.fromNumber(1) }, { 'update_time': Long.fromNumber(1) }],
//     maxVersions: 2
// };

// var params = {
//     tableName: "han",
//     direction: TableStore.Direction.FORWARD,
//     inclusiveStartPrimaryKey: [{ 'task_Id': Long.fromNumber(1) }, { "update_time": TableStore.INF_MIN }],
//     exclusiveEndPrimaryKey: [{ "task_Id":Long.fromNumber(2) }, { "update_time": TableStore.INF_MAX }],
//     limit: 1,
//     maxVersions:1
// };
//
// console.log(TableStore)
//
// var condition = new TableStore.CompositeCondition(TableStore.LogicalOperator.AND);
// condition.addSubCondition(new TableStore.SingleColumnCondition('store', '京东', TableStore.ComparatorType.EQUAL));
// condition.addSubCondition(new TableStore.SingleColumnCondition('store', '京东', TableStore.ComparatorType.EQUAL));
// params.columnFilter = condition;
//
// client.getRange(params, function (err, data) {
//     if (err) {
//         console.log('error:', err);
//         return;
//     }
//     //如果data.next_start_primary_key不为空，说明需要继续读取
//     if (data.next_start_primary_key) {
//     }
//     console.log(data);
//     data.rows.forEach(function (val) {
//         console.log('success:', val.attributes[0]);
//         console.log('success:', val.primaryKey[0].value.toString());
//         console.log('success:', val.attributes[0].timestamp.toString());
//     })
//})