var url = require('url');
var request = require('request');
//需要支持 淘宝|天猫 亚马逊  识货  京东 国美
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


async function timeout(time = 25000){
    return  new Promise(function(resolve, reject){
        setTimeout(function(){
            resolve('');
        }, time);
    });
}

async function timeout_race(){
    var p = new Promise(function(resolve, reject){
        setTimeout(function(){
            reject('URL请求20秒无响应');
        }, 25000);
    });
    return p;
}

var a= 1;
class crawlOtherComment {

    constructor() {
        console.log("initializing.....");
    }
    /**
     * 返回给识货
     * @param {*} formData 
     */
    
    async  consumer(formData) {
        console.log(JSON.stringify(formData,null,3));
        return new Promise(function(resolve, reject){
            request.post({
                url: consumerUrl,
                form: {'info': JSON.stringify(formData)},
            },function(error,response,body){
                console.log("识货返回"+body);
                console.log("识货返回错误"+error);
                resolve("success");
            });
        });
    }

    /**
     * 开始抓取
     */
    async  init() {
       while(true) {
           try {
            //从识货拿到需要抓取的url
            let commentData = await  this.getComment();
            let stoneObj = await this.getStone(commentData);
            //如果不存在url  那么直接返回给识货
            if(typeof stoneObj != 'object') {
                var formData = {Status: 1, Id: commentData.data.id, Msg: "请求地址不在抓取访问"};
                console.log(formData);
                //直接返回识货
                await this.consumer(formData);
                continue;
            }
            //开始抓取 只抓5页
            for(let i=1;i<=5;i++) {
                await this.crawl(stoneObj,commentData,i);
            }
           } catch(e) {
               console.log("ERROR:"+e);
           }
           await timeout(2500);
           //return Promise.resolve();
       }  // while  end
    }


    async  crawlComment(stoneObj,goodsUrl,index) {
        return new Promise(function(resolve, reject){
            stoneObj.getInfo(goodsUrl,index ,function(error, itemInfo){  
                //如果出错了
                if(error){
                    console.log(error); 
                    reject("error");
                } else {
                    resolve(itemInfo);
                }   
            });
        });
    }
    /**
     * 抓取函数
     */
    async  crawl(stoneObj,commentData,index) {
        var that = this;
        return new Promise(async function(resolve, reject){
            Promise.race([that.crawlComment(stoneObj,commentData.data.url,index), timeout_race()])
            .then(async function(itemInfo){  //返回成功
                var formData = { Status: 2, Id: commentData.data.id, Data: itemInfo};  
                await that.consumer(formData);
                resolve();
            })
            .catch(async function(error){  //如果20秒内还没返回
                console.log(error);
                var formData = {Status: 1, Id: commentData.data.id, Msg: ''};
                //直接返回识货
                await that.consumer(formData);
                resolve();
            });
        });
    }


    /**
     * 获取商城
     */
    async  getStone(commentData) {
        return new Promise(function(resolve, reject){
            let goodsUrl = commentData.data.url;
            if(goodsUrl == undefined || goodsUrl == "") reject("url 不可以为空！");
            let urlInfo = url.parse(goodsUrl, true, true);
            let goodsUrlHost = urlInfo.host;
            switch(goodsUrlHost){
                case 'item.taobao.com':
                case 'detail.tmall.com':
                case 'detail.tmall.hk':
                     resolve(tbPc);
                case 'item.gome.com.cn':
                    resolve(gome);
                case 'item.jd.com':
                case 'item.jd.hk':
                    resolve(jd);
                default:
                    resolve();
            }
        });
    }


   



    //获取 识货的内容
    async  getComment() {
        if(this.productData)  return;
        var that = this;
        return new Promise(function(resolve, reject){
            request(producerUrl,function(error,response,body) {
                if (!error && response.statusCode == 200) {
                    body = JSON.parse(body);
                    if(body.status){
                        console.log(body);
                        resolve(body);
                    }else{
                        reject("读取识货失败1");
                    }
                }else{
                    reject("读取识货失败2");
                }
            })
        });
      
    }




}





(async function(){

    let obj = new crawlOtherComment();
    await obj.init();
   

})();




