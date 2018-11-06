var express = require('express'), app = express();

var askvalid = require('./tools/taobaosearch/askvalid');
app.get('/info',function (req, res) {
    var url = req.query.url;
    askvalid.urlSearch(url,function (err, itemInfo) {
        if (err) {
            res.json({ Status: false,Msg: err});
        } else {
            res.json({ Status: true, Data: itemInfo});
        }
    });
})

app.listen(3022, function () {
    console.log(3022)
});