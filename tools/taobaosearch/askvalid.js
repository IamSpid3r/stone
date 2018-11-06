const request = require('request');
const _ = require('lodash');
const url = require('url');
const taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');

exports.urlSearch = async function (taobaoUrl,callback) {
    var hasList = 0;
    var hasShihuoWord = 0;
    
        if (taobaoUrl) {
            console.log( taobaoUrl);
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
            return callback(null,params);
        } else {
            console.log('no new url...');//暂时没url中断
            return callback('no new url',{});
        }
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
        taobaoToken(params ,'taobaoAskCookie.txt', function (body, err) {
            if(err){
                reject(err.message)
            }
            resolve(body.data);
        })
    })
}
// getAsk('544196250500','正品');