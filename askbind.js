var express = require('express'), app = express();

var askvalid = require('./tools/taobaosearch/askvalid');
app.get('/',function (req, res) {
    askvalid.urlSearch(function (err, itemInfo) {
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