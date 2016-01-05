var request = require('request');
var _ = require('lodash');
var lastIp = '';
exports.proxyRequest= function(options,testCallback,callback)
{
    //getip
    //options.proxy = 'http://121.233.255.25:7777';
    if(lastIp != options.proxy)
    {
        console.log('proxy '+options.proxy)
    }
    lastIp = options.proxy;

    request(options,function(error,response,body){
        //抓取结果进行 testCallback 处理 根据 testCallback 来决定
        testCallback(error,response,body,function(status,modifyOptions){
            if(status == true)
            {
                callback(error,response,body)
            }else{
                //post error ip
                if(typeof modifyOptions == 'object')
                {
                    options = _.assign(options,modifyOptions);
                }
                console.log('ip 被封禁需要换ip')
                //proxyRequest(options,testFunc,callback);
            }
        },options)
    })
}