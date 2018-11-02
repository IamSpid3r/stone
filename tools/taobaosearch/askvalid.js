const request = require('request');
const _ = require('lodash');
const url = require('url');
const redis = require('redis');
const config = require(process.cwd() + '/config/develop/app.json');
const taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');
const redisConfig = config.db.redis;
const redisClient = redis.createClient({
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.database,
    password: redisConfig.password,
    connect_timeout: 5000,
    socket_keepalive: true
});
const REDIS_URL_KEY = 'taobao:ask:url';//redis list

exports.urlSearch = async function (callback) {
    var hasList = 0;
    var hasShihuoWord = 0;
    redisClient.lpop(REDIS_URL_KEY,async function(err,taobaoUrl){//商品页url
        if(err){
            return callback(err,{});
        }
        if (taobaoUrl) {
            console.log( taobaoUrl, 'new url...');
            // redisClient.lpush(REDIS_URL_KEY,taobaoUrl);//测试环境先循环处理单条
            var urlInfo = url.parse(taobaoUrl, true);
            //h5api js cookie
            let list = await getAsk(urlInfo.query.id);//问答列表
            hasList = list.item?list.item.questionCount:0;
            let query = await getAsk(urlInfo.query.id,'识货');//有无识货问答
            hasShihuoWord = query.list?query.list.length:0;

            var params = {
                hasList,
                hasShihuoWord,
                taobaoUrl
            };
            console.log(params);
            if(hasList == 0 && hasShihuoWord == 0){//无需调用接口更新数据
                return callback('no need update ',params);   
            }
            
            //调用接口，失败重新添加到队尾
            request.post(config.shihuo.askUrl, {form:params} , function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    redisClient.rpush(REDIS_URL_KEY,taobaoUrl);//本次失败忽略操作
                    return callback('request fail',{});
                } else {//成功，因为接口总返回  写入trd_taobao_ask_bind
                    console.log(body);
                    if(_.includes(body,urlInfo.query.id)){
                        return callback(null,params);
                    }else{
                        redisClient.rpush(REDIS_URL_KEY,taobaoUrl);//本次失败忽略操作
                        return callback(json.msg||'参数错误',{});
                    }
                }
            });
        } else {
            console.log('list no new url...');//暂时没url中断
            return callback('no new url',{});
        }
    });
}

//getproxyip
const developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
function getProxyip() {
    return new Promise(function (resolve, reject) {
        request(developUrl, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                body = JSON.parse(body);
                if(body.status == 'ok'){
                    let proxyIp = body.Ip.Ip+':'+body.Ip.Port;
                    return resolve(proxyIp);
                } else {
                    return resolve(null);
                }
            }else{
                return resolve(null);
            }
        })
    })
}

//按指定关键词搜索问答
function getAsk (itemId, keywords = '') {
    var api = 'mtop.taobao.social.feed.aggregate';
    var params = {
        "appKey":12574478,
        "api" : api,
        "t": Date.now(),
        'v' : '1.0',
        'ecode' : 0,
        "timeout" : 300000,
        "timer" : 300000,
        "data":{}
    };

    if(keywords){
        params.data = {"pageId":28701,"env":1,"bizVersion":0,"params": JSON.stringify(
            {"refId": itemId, "namespace":1, "word":keywords,"pageNum":1,"pageSize":3}
        )};
    }else{
        params.data = {"cursor":1,"pageNum":"1","pageId":24501,"env":1,"bizVersion":0,
        "params":JSON.stringify({"refId":itemId,"namespace":1,"pageNum":1,"pageSize":10})
        };
    }
    
    console.log(params);
    return new Promise((resolve, reject)=> {
        taobaoToken(params ,'taobaoCookieShihuo.txt', function (body, err) {
            console.log(body, err)
            if(err){
                reject(err.message)
            }
            resolve(body.data);
        })
    })
}
// getAsk('544196250500','正品');