var request = require('request');
var _ = require('lodash');
var Q = require('q');

var developUrl = 'http://121.41.45.190:3333/proxyGet?add=1';
var getIpMaxNum = 12;
var getIpInitNum = 0;

var proxyRequest= function(options,testCallback,callback)
{
    Q('get').then(function(success){
        var defer = Q.defer();
        request({url:developUrl,timeout:2000}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                 body = JSON.parse(body);
                 if(body.status == 'ok'){
                      options.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
                 }

                 defer.resolve('success');
             }else{
                 defer.reject('代理服务器错误');
            }
        })

        return defer.promise;
    }).then(function(success){
        request(options,function(error,response,body) {
            testCallback(error, response, body, function (status, modifyOptions) {
                if (status == true) {
                    callback(error, response, body)
                } else {
                    //post error ip
                    if (typeof modifyOptions == 'object') {
                        options = _.assign(options, modifyOptions);
                    }

                    //重复获取代理ip
                    getIpInitNum++;
                    if (getIpInitNum < getIpMaxNum) {
                        setTimeout(function(){
                            proxyRequest(options, testCallback, callback);
                        },500);
                    } else {
                        callback('代理ip失效，抓取超过次数', null, null);
                    }
                }
            }, options)

        })
    },function(rejected){
        callback(rejected, null, null);
    })
}

exports.proxyRequest = proxyRequest;