var process = require('child_process');
var sendEmail = require('./lib/email').sendEmail;

/*2 failing*/
process.exec('/usr/local/bin/mocha',
    function (error, stdout, stderr) {
        if (error !== null) {
            console.log('exec error: ' + error);
        }
        console.log(new Date()+"\n");

        //匹配
        var regExp = /(\d*) failing/g;
        var result = regExp.exec(stdout);
        if(result){
            console.log(result[1]);

             //发送邮件

             sendEmail({
                     from: 'hanxiaolin',
                     to: '724753832@qq.com',
                     subject:"mocha测试文件",
                     content:result[1]+':<br><a href="http://47.88.17.37:3000/mochawesome.html">查看</a>'
                 },function(err,msg){
                     if(err){
                         console.log(err);
                     }else{
                         console.log('successs:'+msg.message);
                     }
              })
        }
    });