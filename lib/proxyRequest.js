var request = require('request');
var _ = require('lodash');
var lastIp = '';
var proxyRequest= function(options,testCallback,callback)
{
    //getip
    // options.proxy = 'http://121.233.255.25:7777';
    if(lastIp != options.proxy)
    {
        // console.log('proxy '+options.proxy)
    }
    lastIp = options.proxy;

    var run = function()
    {
        request('http://60.12.156.242:3333/proxyGet?add=1',function(err,response,body){
            if(err){
                callback(err)
                return;
            }
            var data = JSON.parse(body);
            // data = {status:"ok",Ip:{Ip:''}}
            // data.Ip.Ip = "222.189.183.119";

            if(data.status == 'notIp')
            {
                setTimeout(function(){
                    run()
                },1000);
                console.log('setTimeout')

                return;
            }
            if(data.Ip.Ip)
            {
                options.proxy = 'http://'+data.Ip.Ip+':4321';
                console.log('proxy '+options.proxy)
                options.timeout = 10000;
                request(options,function(error,response,body){
                    if(error)
                    {
                        console.log('proxyRequest error'+error);
                        proxyRequest(options,testCallback,callback);
                        return;
                    }
                    if(body.indexOf('COW Proxy') != -1)
                    {
                        console.log('COW Proxy error');
                        proxyRequest(options,testCallback,callback);
                        return;
                    }

                    //抓取结果进行 testCallback 处理 根据 testCallback 来决定
                    testCallback(error,response,body,function(status,modifyOptions){
                        if(status == true)
                        {
                            callback(error,response,body)
                        }else{
                            //post error ip
                            console.log('ip 被封禁需要换ip')
                            request.post({
                                url:'http://60.12.156.242:3333/proxyDel',
                                form:{'ip':data.Ip.Ip}
                            },function(err,response,body){
                                if(err)
                                {
                                    console.log('change ip error',err)
                                }
                                if(typeof modifyOptions == 'object')
                                {
                                    options = _.assign(options,modifyOptions);
                                }
                                proxyRequest(options,testCallback,callback);
                            })
                        }
                    },options)
                })
            }
        })
    }
    run();
}
exports.proxyRequest = proxyRequest;
