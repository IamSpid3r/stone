var express = require('express'), app = express();
var server = require('http').createServer(app);
var compress = require('compression');
var bodyParser = require('body-parser');
var url = require('url');
var request = require('request');

var getcrawltask = require('./apps/evolution/getCrawlTask');
var savecrawlinfo = require('./apps/evolution/saveCrawlInfo');
var writeTaskhandler = require('./apps/evolution/writeTask').handler;
var getCrawlTaskInfohandler = require('./apps/evolution/getCrawlTaskInfo').handler;
var getCrawlStatInfohandler = require('./apps/evolution/getCrawlStatInfo').handler;

app.use(compress());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ limit: '50mb',extended: true }));
app.use(express.static('mochawesome-reports'));

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

//按taskid获取信息
app.get('/getCrawlTaskInfo', function (req, res) {
    getCrawlTaskInfohandler(req, res);
})
//按类型获取统计信息
app.get('/getCrawlStatInfo', function (req, res) {
    getCrawlStatInfohandler(req, res);
})

//获取抓取任务
app.get('/getCrawlTask', function (req, res) {
    getcrawltask.getMainList(req, res);
})
//保存抓取任务
app.post('/saveCrawlInfo', function (req, res) {
    savecrawlinfo.saveData(req, res);
})

app.listen(3200,function(){
    console.log('listen 3200');
})

