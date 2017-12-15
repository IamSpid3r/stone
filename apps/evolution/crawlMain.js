var SequelizeDb = require('../lib/db').db;
var url  = require('url');
var fun  = require('../lib/fun');

const Q = require("q");

exports.saveTask = function(param, callback) {
    if(param.task_id == undefined || param.url == undefined){
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'param Error'
            }
        });
        return '';
    }
    // var urlInfo = param.url ?  url.parse(param.url, true, true) : {path:'',host:''};
    // var status = 0;
    // if(urlInfo.host == 'item.jd.com'){//京东的需要特殊处理
    //     status = 0;
    // } 
    controller.saveData(param).then(function (data) {
        callback(null)
    },function (err) {
        callback(err.message)
    })
    
}

var controller = {
    saveData:function(param){
        console.log(param)
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findOne({where : {task_id:param.task_id }})
            .then(crawlmain => {
                if (crawlmain){
                    throw new Error('已经存在此任务');
                } else {
                    SequelizeDb.CrawlMain.create({
                        task_id: param.task_id,
                        url: param.url,
                        store:fun.getStore(param.url),
                        status:0,
                      }).then(row=>{
                        if (!row) {
                            return defer.reject(new Error('保存数据库错误'));
                        }
                        return defer.resolve({
                            status : true
                        });
                    });
                }
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    }
}