var exec = require('child_process').exec;
var request = require('request');
module.exports = {

    // 类似 FunBase::myDebug() 你懂的
    shutdown: function(msg,code = 0) {
        console.log('');
        console.log('----------------- debug log -----------------');
        console.log('');
        console.log(JSON.stringify(msg));
        console.log('');
        console.log('----------------- debug log -----------------');
        process.exit(code);
    },

    // 随机数
    randomNum:function(minNum,maxNum){
        switch(arguments.length){
            case 1:
                return parseInt(Math.random()*minNum+1,10);
                break;
            case 2:
                return parseInt(Math.random()*(maxNum-minNum+1)+minNum,10);
                break;
            default:
                return 0;
                break;
        }
    },
    //发送log 同步发送
    sendLog: function(level,message) {
        return new Promise(( resolve, reject ) => {
            let url = 'https://shihuo.cn-hangzhou.log.aliyuncs.com/logstores/shihuo_yewu/track?APIVersion=0.6.0&group_key=node_spread&level='+level+'&message='+encodeURI(JSON.stringify(message));
            request({'url':url},function(err,code,body){
                return resolve();
            });
        });
    },
    //判断是否有相同的程序在执行 同步
    getProcessId: async function(process_name) {
        return new Promise(( resolve, reject ) => {
            var cmd=process.platform=='win32'?'tasklist':'ps aux';
            exec(cmd,  function(err, stdout, stderr) {
                if(err) {   
                    return reject( err );
                }
                stdout.split('\n').forEach(function(line){
                    var p=line.trim().split(/\s+/),pname=p[0],pid=p[1],pshell = p.splice(10);
                    if(pshell != undefined && pshell.length >= 1) {
                        ppshell = pshell.join(' ');
                        if(ppshell.toLowerCase().indexOf(process_name.toLowerCase())>=0 && parseInt(pid) && pid != process.pid){
                            return resolve( pid );
                        }
                    }
                });
                return resolve( 0 );
            });
        }); // promise end
    }

}