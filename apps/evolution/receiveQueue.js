//接收抓取队列的推送处理
const _ = require('lodash');
const dateFormat = require('dateformat');
const Q = require("q");

const stoneTaskES = require(process.cwd()+"/apps/lib/elasticsearch/stoneTasks").esClient;
const fun = require(process.cwd()+"/apps/lib/fun.js");
const tableStore = require(process.cwd()+"/apps/lib/tablestore.js").tableStore;

function handler(taskId, url,  data, callack) {
    try {
        if (!taskId || !url || !data) {
            throw new Error('参数错误');
        }

        //存入数据库
        controller.updateTask(taskId, data).then(function (res) {
            //写入tablestore
            controller.insertTableStore(taskId, url, data, function (err, rows) {
                if (err) {
                    callack(err.message)
                } else {
                    callack(null, 'ok')
                }
            })
        },function (err) {
            fun.stoneLog('stone_db', 'error', err.message);

            callack(err.message)
        })
    } catch (err) {
        console.log(err.message);

        callack(err.message)
    }

}

var controller = {
    updateTask: function (taskId, data) {
        var defer = Q.defer();

        var packageInfo = this.packageInfo(data)
        var updateInfo = packageInfo[0];
        var updateStatus = packageInfo[1];
        var updateErrStatus = packageInfo[2];
        var now = dateFormat(_.now(), "yyyy-mm-dd HH:MM:ss");

        stoneTaskES.update({
            task_id: taskId,
            'status' : 2,
            'update_info' : JSON.stringify(updateInfo),
            'update_status' : updateStatus,
            'update_err_status' : updateErrStatus,
            'updated_at' : now
        }, function (err, res) {
            if (err) {
                return defer.reject(err);
            }

            return defer.resolve(res);
        })

        return defer.promise;
    },
    packageInfo: function (data) {
        if (!'Status' in data) {
            throw new Error('数据包缺少Status参数');
            return;
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
            updateInfo.err = JSON.stringify(data.Msg).slice(0, 220);
            updateErrStatus = 1;
        }

        return [updateInfo, updateStatus, updateErrStatus]
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
                'shop_name' : data.Data.ItemAttributes.ShopName
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
// handler('50ad27b8947a0709334d54e819bcc13b', 'https://detail.tmall.com/item.htm?id=540219887479', data, function (err, data) {
//     console.log(err, data)
// });
exports.handler = handler;