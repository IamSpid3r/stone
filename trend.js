var express = require('express'), app = express();
var url = require('url');
var request = require('request');

var taobao = require('./lib/trend/taobao');

app.get('/d',function (req, res) {
    var goods_id = req.query.goods_id;
    var supplier_id = req.query.supplier_id;
    var supplier_title = req.query.supplier_title;
    var supplier_url = req.query.supplier_url;
    var goodsUrlHost = '';
    if (supplier_url) {
        var urlInfo = url.parse(supplier_url, true, true);
        goodsUrlHost = urlInfo.host;
    }
    //抓取数据
    var storeObj = [],
    itemInfo = [];
    //如果是淘宝单独处理
    if(goodsUrlHost == 'item.taobao.com' || goodsUrlHost == 'detail.tmall.com') {
    // if(1) {
        console.log('通过puppeteer抓取'+goodsUrlHost);
        if (!goods_id || !supplier_title) {
            res.json({ Status: false,Msg: {
                    "Errors":{
                        'Code': 'Error',
                        "Message": '缺少参数'
                    }
                }});
            return;
        }
        taobao.getInfo(supplier_url,supplier_title, function (err, itemInfo) {
            if (err) {
                res.json({ Status: false,Msg: err});
            } else {
                itemInfo.goods_id = goods_id;
                itemInfo.supplier_id = supplier_id;
                itemInfo.supplier_title = supplier_title;
                itemInfo.supplier_url = supplier_url;
                res.json({ Status: true, Data: itemInfo});
            }
        });
    } else {
        console.log("普通抓取"+goodsUrlHost);
        storeObj = getStoreObj(goodsUrlHost);
        if(typeof storeObj == 'object'){
            storeObj.getInfo(supplier_url ,function(error, itemInfo){
                if(error){
                    res.json({ Status: false,Msg: error});
                }else{
                    itemInfo.goods_id = goods_id;
                    itemInfo.supplier_id = supplier_id;
                    itemInfo.supplier_title = supplier_title;
                    itemInfo.supplier_url = supplier_url;
                    res.json({ Status: true, Data: itemInfo});
                }
            })
        }else{
            res.json(err_info);
        }
    }
})




app.listen(3020);