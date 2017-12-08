//接收抓取队列的推送处理

const Q = require("q");
const SequelizeDb = require(process.cwd()+"/apps/lib/db.js").db;
const fun = require(process.cwd()+"/apps/lib/fun.js");
const tableStore = require(process.cwd()+"/apps/lib/tablestore.js").tableStore;

function handler(taskId, url,  data, callack) {
    try {
        if (!taskId || !url || !data) {
            throw new Error('参数错误');
        }

        //存入数据库
        controller.updateTask(taskId, data).then(function (row) {
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
        SequelizeDb.StoneTasks().findOne({
            where : {task_id: taskId}
        }).then(row => {
            //正在抓取状态
            if (row.status == 1) {
                var packageInfo = this.packageInfo(data)
                var updateInfo = packageInfo[0];
                var updateStatus = packageInfo[1];
                var updateErrStatus = packageInfo[2];

                row.update(
                    {
                        'status' : 2,
                        'update_info' : JSON.stringify(updateInfo),
                        'update_status' : updateStatus,
                        'update_err_status' : updateErrStatus,
                    },
                    { where: {task_id: taskId} }
                ).then(row => {
                    return defer.resolve(row);
                }).catch(err => {
                    return defer.reject(err);
                });
            } else {
                return defer.reject(new Error('当前状态不能消费抓取信息'));
            }
        }).catch(err => {
            return defer.reject(err);
        });

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


// var data = {
//     "Status": true,
//     "Data": {
//         "Unique": "cn.taobao.543352005477",
//         "Md5": "ea3516f9f4bad171f81ca913a9494898",
//         "Status": "inStock",
//         "Url": "https://item.taobao.com/item.htm?id=543352005477",
//         "ItemAttributes": {
//             "Title": "男女运动跑步空顶帽子吸汗排汗速干轻量户外网球加长帽檐防晒遮阳",
//             "ShopName": "11度体育",
//             "ShopId": "cn.taobao.100073088",
//             "ImageUrl": "http://img.alicdn.com/imgextra/i2/1040020027/TB2X9rHf8TH8KJjy0FiXXcRsXXa_!!1040020027.jpg",
//             "ImageUrls": [
//                 "http://img.alicdn.com/imgextra/i2/1040020027/TB2X9rHf8TH8KJjy0FiXXcRsXXa_!!1040020027.jpg",
//                 "http://img.alicdn.com/imgextra/i3/1040020027/TB2swDNbfBNTKJjSszeXXcu2VXa_!!1040020027.jpg",
//                 "http://img.alicdn.com/imgextra/i2/1040020027/TB29KozsbFlpuFjy0FgXXbRBVXa_!!1040020027.jpg",
//                 "http://img.alicdn.com/imgextra/i4/1040020027/TB2tDH3ajmfF1JjSspcXXXZMXXa_!!1040020027.jpg",
//                 "http://img.alicdn.com/imgextra/i1/1040020027/TB2USbsf_nI8KJjSszbXXb4KFXa_!!1040020027.jpg"
//             ],
//             "CategoryId": "50015369",
//             "StageInfo": "",
//             "Region": false,
//             "Tax": 1
//         },
//         "Variations": [
//             {
//                 "Id": "-2",
//                 "Name": "帽舌长度",
//                 "Values": [
//                     {
//                         "ValueId": "-2",
//                         "Name": "9cm"
//                     }
//                 ]
//             },
//             {
//                 "Id": "-1",
//                 "Name": "适用性别",
//                 "Values": [
//                     {
//                         "ValueId": "-1",
//                         "Name": "男女通用"
//                     }
//                 ]
//             },
//             {
//                 "Id": "20509",
//                 "Name": "尺码",
//                 "Values": [
//                     {
//                         "ValueId": "28383",
//                         "Name": "均码"
//                     }
//                 ]
//             },
//             {
//                 "Id": "1627207",
//                 "Name": "颜色",
//                 "Values": [
//                     {
//                         "ValueId": "28320",
//                         "Name": "白色",
//                         "ImageUrls": [
//                             "http://gd3.alicdn.com/bao/uploaded/i3/1040020027/TB2bZ3ljm0jpuFjy0FlXXc0bpXa_!!1040020027.jpg"
//                         ]
//                     },
//                     {
//                         "ValueId": "28341",
//                         "Name": "黑色",
//                         "ImageUrls": [
//                             "http://gd3.alicdn.com/bao/uploaded/i3/1040020027/TB2OR3PjmFjpuFjSszhXXaBuVXa_!!1040020027.jpg"
//                         ]
//                     },
//                     {
//                         "ValueId": "28324",
//                         "Name": "黄色",
//                         "ImageUrls": [
//                             "http://gd4.alicdn.com/bao/uploaded/i4/1040020027/TB29A24jhXlpuFjSsphXXbJOXXa_!!1040020027.jpg"
//                         ]
//                     },
//                     {
//                         "ValueId": "237096418",
//                         "Name": "荧光橘色",
//                         "ImageUrls": [
//                             "http://gd1.alicdn.com/bao/uploaded/i1/1040020027/TB2YjgajgxlpuFjSszgXXcJdpXa_!!1040020027.jpg"
//                         ]
//                     },
//                     {
//                         "ValueId": "103626055",
//                         "Name": "荧光黄色",
//                         "ImageUrls": [
//                             "http://gd2.alicdn.com/bao/uploaded/i2/1040020027/TB2M.Uxjl8kpuFjSspeXXc7IpXa_!!1040020027.jpg"
//                         ]
//                     },
//                     {
//                         "ValueId": "478461100",
//                         "Name": "荧光橘-印猫",
//                         "ImageUrls": [
//                             "http://gd1.alicdn.com/bao/uploaded/i1/1040020027/TB2n6jAavMTUeJjSZFKXXagopXa_!!1040020027.jpg"
//                         ]
//                     },
//                     {
//                         "ValueId": "478461101",
//                         "Name": "荧光橘-广马",
//                         "ImageUrls": [
//                             "http://gd3.alicdn.com/bao/uploaded/i3/1040020027/TB28JZlbaigSKJjSsppXXabnpXa_!!1040020027.jpg"
//                         ]
//                     },
//                     {
//                         "ValueId": "502311008",
//                         "Name": "荧光黄-marathon",
//                         "ImageUrls": [
//                             "http://gd4.alicdn.com/bao/uploaded/i4/1040020027/TB2zRRpaLBNTKJjSszcXXbO2VXa_!!1040020027.jpg"
//                         ]
//                     }
//                 ]
//             }
//         ],
//         "Items": [
//             {
//                 "Unique": "cn.taobao.3488864886522",
//                 "Attr": [
//                     {
//                         "Nid": "-2",
//                         "N": "帽舌长度",
//                         "Vid": "-2",
//                         "V": "9cm"
//                     },
//                     {
//                         "Nid": "-1",
//                         "N": "适用性别",
//                         "Vid": "-1",
//                         "V": "男女通用"
//                     },
//                     {
//                         "Nid": "20509",
//                         "N": "尺码",
//                         "Vid": "28383",
//                         "V": "均码"
//                     },
//                     {
//                         "Nid": "1627207",
//                         "N": "颜色",
//                         "Vid": "103626055",
//                         "V": "荧光黄色"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "淘宝"
//                         },
//                         "List": [
//                             {
//                                 "Price": 139,
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Unique": "cn.taobao.3315717841466",
//                 "Attr": [
//                     {
//                         "Nid": "-2",
//                         "N": "帽舌长度",
//                         "Vid": "-2",
//                         "V": "9cm"
//                     },
//                     {
//                         "Nid": "-1",
//                         "N": "适用性别",
//                         "Vid": "-1",
//                         "V": "男女通用"
//                     },
//                     {
//                         "Nid": "20509",
//                         "N": "尺码",
//                         "Vid": "28383",
//                         "V": "均码"
//                     },
//                     {
//                         "Nid": "1627207",
//                         "N": "颜色",
//                         "Vid": "28324",
//                         "V": "黄色"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "淘宝"
//                         },
//                         "List": [
//                             {
//                                 "Price": 139,
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Unique": "cn.taobao.3315717841467",
//                 "Attr": [
//                     {
//                         "Nid": "-2",
//                         "N": "帽舌长度",
//                         "Vid": "-2",
//                         "V": "9cm"
//                     },
//                     {
//                         "Nid": "-1",
//                         "N": "适用性别",
//                         "Vid": "-1",
//                         "V": "男女通用"
//                     },
//                     {
//                         "Nid": "20509",
//                         "N": "尺码",
//                         "Vid": "28383",
//                         "V": "均码"
//                     },
//                     {
//                         "Nid": "1627207",
//                         "N": "颜色",
//                         "Vid": "28341",
//                         "V": "黑色"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "淘宝"
//                         },
//                         "List": [
//                             {
//                                 "Price": 139,
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Unique": "cn.taobao.3315717841465",
//                 "Attr": [
//                     {
//                         "Nid": "-2",
//                         "N": "帽舌长度",
//                         "Vid": "-2",
//                         "V": "9cm"
//                     },
//                     {
//                         "Nid": "-1",
//                         "N": "适用性别",
//                         "Vid": "-1",
//                         "V": "男女通用"
//                     },
//                     {
//                         "Nid": "20509",
//                         "N": "尺码",
//                         "Vid": "28383",
//                         "V": "均码"
//                     },
//                     {
//                         "Nid": "1627207",
//                         "N": "颜色",
//                         "Vid": "28320",
//                         "V": "白色"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "淘宝"
//                         },
//                         "List": [
//                             {
//                                 "Price": 139,
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Unique": "cn.taobao.3478896708254",
//                 "Attr": [
//                     {
//                         "Nid": "-2",
//                         "N": "帽舌长度",
//                         "Vid": "-2",
//                         "V": "9cm"
//                     },
//                     {
//                         "Nid": "-1",
//                         "N": "适用性别",
//                         "Vid": "-1",
//                         "V": "男女通用"
//                     },
//                     {
//                         "Nid": "20509",
//                         "N": "尺码",
//                         "Vid": "28383",
//                         "V": "均码"
//                     },
//                     {
//                         "Nid": "1627207",
//                         "N": "颜色",
//                         "Vid": "478461100",
//                         "V": "荧光橘-印猫"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "淘宝"
//                         },
//                         "List": [
//                             {
//                                 "Price": 139,
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Unique": "cn.taobao.3488864886524",
//                 "Attr": [
//                     {
//                         "Nid": "-2",
//                         "N": "帽舌长度",
//                         "Vid": "-2",
//                         "V": "9cm"
//                     },
//                     {
//                         "Nid": "-1",
//                         "N": "适用性别",
//                         "Vid": "-1",
//                         "V": "男女通用"
//                     },
//                     {
//                         "Nid": "20509",
//                         "N": "尺码",
//                         "Vid": "28383",
//                         "V": "均码"
//                     },
//                     {
//                         "Nid": "1627207",
//                         "N": "颜色",
//                         "Vid": "237096418",
//                         "V": "荧光橘色"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "淘宝"
//                         },
//                         "List": [
//                             {
//                                 "Price": 139,
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Unique": "cn.taobao.3478896708255",
//                 "Attr": [
//                     {
//                         "Nid": "-2",
//                         "N": "帽舌长度",
//                         "Vid": "-2",
//                         "V": "9cm"
//                     },
//                     {
//                         "Nid": "-1",
//                         "N": "适用性别",
//                         "Vid": "-1",
//                         "V": "男女通用"
//                     },
//                     {
//                         "Nid": "20509",
//                         "N": "尺码",
//                         "Vid": "28383",
//                         "V": "均码"
//                     },
//                     {
//                         "Nid": "1627207",
//                         "N": "颜色",
//                         "Vid": "478461101",
//                         "V": "荧光橘-广马"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "淘宝"
//                         },
//                         "List": [
//                             {
//                                 "Price": 139,
//                                 "Type": "RMB"
//                             }
//                         ]
//                     }
//                 ]
//             },
//             {
//                 "Unique": "cn.taobao.3488569113568",
//                 "Attr": [
//                     {
//                         "Nid": "-2",
//                         "N": "帽舌长度",
//                         "Vid": "-2",
//                         "V": "9cm"
//                     },
//                     {
//                         "Nid": "-1",
//                         "N": "适用性别",
//                         "Vid": "-1",
//                         "V": "男女通用"
//                     },
//                     {
//                         "Nid": "20509",
//                         "N": "尺码",
//                         "Vid": "28383",
//                         "V": "均码"
//                     },
//                     {
//                         "Nid": "1627207",
//                         "N": "颜色",
//                         "Vid": "502311008",
//                         "V": "荧光黄-marathon"
//                     }
//                 ],
//                 "Offers": [
//                     {
//                         "Merchant": {
//                             "Name": "淘宝"
//                         },
//                         "List": [
//                             {
//                                 "Price": 139,
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
// handler('281ae02a167c14155e9fb353cf940309', 'https://detail.tmall.com/item.htm?id=43151258699', data, function (err, data) {
//     console.log(err, data)
// });
exports.handler = handler;