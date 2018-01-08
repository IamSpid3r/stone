var SequelizeDb = require('../lib/db').db;
const Op = SequelizeDb.sequelize.Op;
var url  = require('url');
var fun  = require('../lib/fun');

const Q = require("q");


var deal = function(){
	console.log('start monitor')
	var curr_time = Date.parse(new Date())/1000 - 15*60;
	curr_time = getLocalTime(curr_time);
	controller.getDataList(curr_time, 10).then(function (data) {
		
            if (data.status){
                data.data.forEach(function (row) {
                    if (row.id){
                    	console.log(row.id)
                        controller.updateData(row.id,parseInt(row.update_err_num)+1).then(function (data) {})
                    } 
                    
                })
            }
        },function (err) {
            
        })
}

var controller = {
    updateData:function(id,err_num){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .update({status:0,update_err_num:err_num},{where : {id:id}})
            .then(crawlmain => {
                if (crawlmain){
                    throw new Error('更新出错');
                } else {
                    return defer.resolve({
                            status : true,
                            id: id
                        });
                }
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    },
    getDataList:function(curr_time, pagesize){
        var defer = Q.defer();
        SequelizeDb.CrawlMain
            .findAll({
                attributes: ['id', 'update_err_num'],
                where:{status:{[Op.in]:[1,3]},updatedAt:{[Op.lt]:curr_time},update_err_num:{[Op.lt]:4}},limit:pagesize})
            .then(crawlmain => {
                return defer.resolve({
                    status : true,
                    data: crawlmain
                });
            }
        ).catch(err => {
            return defer.reject(err);
        });
        return defer.promise;
    }
}

//时间戳转日期
function getLocalTime(nS) {     
    return new Date(parseInt(nS) * 1000).toLocaleString().replace(/年|月/g, "-").replace(/日/g, " ");      
 }  

//start
setInterval(function(){
	deal();
},10000)
