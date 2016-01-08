var nodemailer  = require("nodemailer");
var user = 'fei123qwe@163.com'
    , pass = 'hanxiaolin';

exports.sendEmail = function (options, callback){
    var smtpTransport = nodemailer.createTransport("SMTP", {
        host: "smtp.163.com",
        secureConnection: true, // use SSL
        port: 465, // port for secure SMTP
        auth: {
            user: user,
            pass: pass
        }
    });

    try{
        smtpTransport.sendMail({
            from      :  options.from +'<' + user + '>'
            , to      :'<' + options.to + '>'
            , subject : options.subject
            , html    : options.content
        }, function(err, res) {
            if(err){
                callback(err)
                // throw err;
            }else{
                callback(null, res)
            }
        })
    }catch(e){
       callback(e)
    }
}
