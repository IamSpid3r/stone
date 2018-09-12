var express = require('express'), app = express();
var url = require('url');
var request = require('request');

var taobaoask = require('./tools/taobaosearch/ask');
app.get('/info',function (req, res) {
    var url = req.query.url;

    taobaoask.getInfo(url, function (err, itemInfo) {
        if (err) {
            res.json({ Status: false,Msg: err});
        } else {
            res.json({ Status: true, Data: itemInfo});
        }
    });
})

app.listen(3016, function () {
    console.log(3016)
});