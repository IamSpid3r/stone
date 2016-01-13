var request = require('request');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var event = new EventEmitter();

var developUrl = 'http://121.41.45.190:3333/proxyGet?add=1';
var getIpMaxNum = 5;
var getIpInitNum = 0;

var proxyRequest= function(options,testCallback,callback)
{
    getIpInitNum ++;
    //抓取
    event.on('get'+getIpInitNum, function(){
        console.log('start get'+getIpInitNum);
        request(options,function(error,response,body){
            //抓取结果进行 testCallback 处理 根据 testCallback 来决定
            testCallback(error,response,body,function(status,modifyOptions){
                if(status == true)
                {
                    getIpInitNum = 0;
                    callback(error,response,body)
                }else{
                    //post error ip
                    if(typeof modifyOptions == 'object')
                    {
                        options = _.assign(options,modifyOptions);
                    }

                    //请求次数限制
                    if(getIpInitNum < getIpMaxNum){
                        proxyRequest(options,testCallback,callback);
                    }else{
                        throw new Error('代理ip失效，抓取超过次数');
                    }
                }
            },options)
        })
    })


    //getip 线上环境
    if(process.env.NODE_ENV != 'develop'){
        request({url:developUrl,timeout:2000}, function (error, response, body) {
            console.log(body);
            if (!error && response.statusCode == 200) {
                body = JSON.parse(body);
                if(body.status == 'ok')
                    options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
            }else{
                throw new Error('代理服务器错误');
            }

            console.log('emit get'+getIpInitNum);
            event.emit('get'+getIpInitNum);
        })
    }else{
        console.log('emit get'+getIpInitNum);
        event.emit('get'+getIpInitNum);
    }
}

exports.proxyRequest = proxyRequest;