var url = require('url');
var request = require('request');
//需要支持 淘宝|天猫 亚马逊  识货  京东 国美
var taobao = require('./lib/comment/taobaoComment');
var tbNew = require('./lib/comment/tbNewComment');  //淘宝新抓取 
var tbPc = require('./lib/comment/tbPcComment');
var amazonCn = require('./lib/comment/amazonCnComment');
var shihuoHaitao = require('./lib/comment/shihuoHaitaoComment');
var gome = require('./lib/comment/gomeComment');
var jd = require('./lib/comment/jdComment');
var kaola = require('./lib/comment/kaluli/kaolaComment');//考拉
var mia = require('./lib/comment/kaluli/miaComment');//蜜芽
const gwyy = require('./tools/gwyy');


//错误 json 
var err_info = {
    Status: false,
    Msg: {
        Errors: [{
            Code: '请求地址不在抓取访问',
            Message: '请求地址不在抓取访问'
        }]
    }
};
//json
var producerUrl = "http://www.shihuo.cn/api/stoneComment/act/producer?stone=all";
var consumerUrl = "http://www.shihuo.cn/api/stoneComment/act/consumer";


var stone = {
    productData:null, //当前抓取链接信息
    init:function(){
        var that = this;

        //拿到待抓取的渠道
        that.producer(function(producter){
            if(producter){
                //调用抓取接口 
                that.stoneApi(producter, function(formData){
                    that.productData = null;
                    //返回应答
                    that.consumer(formData, function(){
                        setTimeout(function(){ //work
                            that.init();
                        },2000)
                    });
                });
            }else{ //如果没有连接 那么等会
                console.log("waiting...");
                setTimeout(function(){
                    that.init();
                },4000)
            }
        });
    },


    /**
     * 从识货拿到需要抓取的连接
     */
    producer:function(callback){
        /*
        var a = { status: true,
            data:  { id: '468546',url: 'https://detail.tmall.hk/hk/item.htm?id=40088519684' } };
            callback(a); */
   
        var that = this;
        if(that.productData){
            callback(that.productData)
        }else{
            request(producerUrl, function(error,response,body) {
                if (!error && response.statusCode == 200) {
                    body = JSON.parse(body);
                    if(body.status){
                        console.log(body);
                        that.productData = body;
                        callback(body)
                    }else{
                        callback(false)
                    }
                }else{
                    callback(false)
                }
            })
        } 
    },
    /**
     * 应答给识货
     */
    consumer:function(formData,callback){
        console.log(JSON.stringify(formData,null,3));
        request.post({
            url: consumerUrl,
            form: {'info': JSON.stringify(formData)},
        },function(error,response,body){
            console.log("识货返回"+body);
            console.log("识货返回错误"+error);
            callback(body,error);
        });
    },

    /**
     * 真正的抓取方法
     */
    stoneApi:function(body, callback){
        var that = this;
        var goodsUrl = body.data.url;
        var goodsUrlHost = '';
        
        if(goodsUrl){
            var urlInfo = url.parse(goodsUrl, true, true);
            goodsUrlHost = urlInfo.host;
        }
        console.log(goodsUrl);
        //抓取数据
        var storeObj = [],
        itemInfo = [];
        storeObj = getStoreObj(goodsUrlHost);
        if(typeof storeObj == 'object'){
            Promise.race([getComment(storeObj,goodsUrl,body.data.id), timeout()])
            .then(function(formData){  //如果20秒内返回了
                callback(formData);
                console.log("正常返回。。。。");
            })
            .catch(function(error){  //如果20秒内还没返回
                console.log(error);
                that.productData = null;
                that.consumer({Status: 1, Id: body.data.id, Msg: ''}, function(){
                    setTimeout(function(){ //work
                        that.init();
                    },4000)
                });
            });
        }else{
            var formData = {Status: 1, Id: body.data.id, Msg: "请求地址不在抓取访问"};
            console.log(formData);
            callback(formData);
        }
    }//stone end
};


function getComment(storeObj,goodsUrl,id) {
    var p = new Promise(function(resolve, reject){
        if(typeof storeObj == 'object'){
            storeObj.getInfo(goodsUrl ,function(error, itemInfo){  
                //如果出错了
                if(error){
                    console.log(error); 
                    reject("error");
                } else {
                        //res.json({ Status: false,Msg: error});
                        //var formData = {Status: 1, Id: body.data.id, Msg: error};
                        //res.json({ Status: true, Data: itemInfo});
                    var formData = { Status: 2, Id: id, Data: itemInfo};  
                    resolve(formData);
                }   
            });
        } else {
            reject('请求地址不在抓取访问');
        }
    });
    return p;
}

function timeout(){
    var p = new Promise(function(resolve, reject){
        setTimeout(function(){
            reject('URL请求20秒无响应');
        }, 25000);
    });
    return p;
}

//获取商城对象
function getStoreObj(host){
    switch(host){
        case 'item.taobao.com':
        case 'detail.tmall.com':
        case 'detail.tmall.hk':
            return tbPc;
        case 'item.gome.com.cn':
            return gome;
        case 'item.jd.com':
        case 'item.jd.hk':
            return jd;
        default:
            return '';
    }
}
//start
stone.init(1);