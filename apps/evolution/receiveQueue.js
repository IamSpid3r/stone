//接收抓取队列的推送处理
const _ = require('lodash');
const dateFormat = require('dateformat');
const Q = require("q");

//const stoneTaskES = require(process.cwd()+"/apps/lib/elasticsearch/stoneTasks").esClient;
const superTaskES = require(process.cwd()+"/apps/lib/elasticsearch/superTask").esClient;
const fun = require(process.cwd()+"/apps/lib/fun.js");
const tableStore = require(process.cwd()+"/apps/lib/tablestore.js").tableStore;

function handler(taskId, url,  data, callback) {
    if (!taskId || !url || !data) {
        return callback('参数错误');
    }

    //存入数据库
    controller.updateTask(taskId, data, function (err, result) {
        if (err) {
            console.log(err.message);
            fun.stoneLog('stone_db', 'error', {
                'param' : err.message,
                'param2' : taskId,
            });
            return callback(err.message)
        }

        //写入tablestore
        controller.insertTableStore(taskId, url, data, function (err, rows) {
            if (err) {
                return  callback(err.message)
            } else {
                return  callback(null, 'ok')
            }
        })
    })
}

var controller = {
    updateTask: function (taskId, data, callback) {
        var packageInfo = this.packageInfo(data)
        if (!Array.isArray(packageInfo)) {
            return callback(packageInfo);
        }

        var updateInfo = packageInfo[0];
        var updateStatus = packageInfo[1];
        var updateErrStatus = packageInfo[2];
        var now = new Date();

        superTaskES.update({
            task_id: taskId,
            'status' : 2,
            'update_info' : JSON.stringify(updateInfo),
            'update_status' : updateStatus,
            'update_err_status' : updateErrStatus,
            'update_at' : now
        }, function (err, res) {
            if (err) {
                return callback(err);
            }

            return callback(null, res);
        })
    },
    packageInfo: function (data) {
        try {
            if (!'Status' in data) {
                throw new Error('数据包缺少Status参数');
            }

            var updateInfo = {};
            var updateStatus = 0;
            var updateErrStatus = 0;
            if (data.Status) {
                var updateData = data.Data;
                updateStatus = (updateData.Status == 'inStock') ? 0 : 1;

                updateInfo.unique = updateData.Unique;
                updateInfo.md5 = updateData.Md5;
                updateInfo.items = updateData.Items.length;
                updateInfo.vals = updateData.Variations.length;
            } else {
                updateInfo.err = JSON.stringify(data.Msg).slice(0, 180);
                updateErrStatus = 1;
            }

            return [updateInfo, updateStatus, updateErrStatus]
        } catch (e){
            return e;
        }
    },
    insertTableStore : function (taskId, url, data, callback) {
        var attributes = [];
        attributes.push({
            'data' : JSON.stringify(data),
        })
        attributes.push({
            'url' : url
        })
        attributes.push({
            'store' : fun.getStore(url)
        })
        if (data.Status) {
            attributes.push({
                'status' : data.Data.Status
            })
            attributes.push({
                'update_status' : 'success'
            })
            attributes.push({
                'shop_name' : 'ShopName' in data.Data.ItemAttributes ? data.Data.ItemAttributes.ShopName : ''
            })
        } else {
            attributes.push({
                'update_status' : 'error'
            })
        }
        tableStore.Insert(taskId, attributes, callback)
    }
};


// var data =  {
//     "Status": true,
//     "Data": {
//         "Unique": "cn.yohobuy.264081",
//         "Md5": "e91c218857ff5f0dac07cab82a1cd654",
//         "Status": "inStock",
//         "Url": "http://item.yohobuy.com/product/p264081.html",
//         "ItemAttributes": {
//             "Title": "Into The Rainbow 波点字母棒球夹克",
//             "ShopName": "有货",
//             "ShopId": "cn.yohobuy",
//             "ImageUrl": "http://img11.static.yhbimg.com/goodsimg/2017/07/14/12/0171a1a0d324aaaf3b99ede78b305c270e.jpg"
//         },
//         "Variations": [
//             {
//                 "Id": 1,
//                 "Name": "颜色",
//                 "Values": [
//                     {
//                         "ValueId": 273186,
//                         "Name": "白色",
//                         "ImageUrls": [
//                             "http://img11.static.yhbimg.com/goodsimg/2017/07/14/12/0171a1a0d324aaaf3b99ede78b305c270e.jpg"
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Id": 2,
//                 "Name": "尺码",
//                 "Values": [
//                     {
//                         "ValueId": 207,
//                         "Name": "S"
//                     },
//                     {
//                         "ValueId": 203,
//                         "Name": "M"
//                     },
//                     {
//                         "ValueId": 201,
//                         "Name": "L"
//                     }
//                 ]
//             }
//         ],
//         "Items": [
//             {
//                 "Unique": "cn.yohobuy.874750",
//                 "Attr": [
//                     {
//                         "Nid": 1,
//                         "N": "颜色",
//                         "Vid": 273186,
//                         "V": "白色"
//                     },
//                     {
//                         "Nid": 2,
//                         "N": "尺码",
//                         "Vid": 207,
//                         "V": "S"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "yohobuy"
//                         },
//                         "List": [
//                             {
//                                 "Price": "149.00",
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Unique": "cn.yohobuy.874751",
//                 "Attr": [
//                     {
//                         "Nid": 1,
//                         "N": "颜色",
//                         "Vid": 273186,
//                         "V": "白色"
//                     },
//                     {
//                         "Nid": 2,
//                         "N": "尺码",
//                         "Vid": 203,
//                         "V": "M"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "yohobuy"
//                         },
//                         "List": [
//                             {
//                                 "Price": "149.00",
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Unique": "cn.yohobuy.874752",
//                 "Attr": [
//                     {
//                         "Nid": 1,
//                         "N": "颜色",
//                         "Vid": 273186,
//                         "V": "白色"
//                     },
//                     {
//                         "Nid": 2,
//                         "N": "尺码",
//                         "Vid": 201,
//                         "V": "L"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "yohobuy"
//                         },
//                         "List": [
//                             {
//                                 "Price": "149.00",
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             }
//         ]
//     }
// };
//
// handler('485795cb73026bbb11e5952ab7a0b05b', "https://item.taobao.com/item.htm?id=44696285660", data, function (err, data) {
//     console.log(err, data)
// });
exports.handler = handler;