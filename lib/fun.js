var fs  = require('fs');

exports.rnd = function (start, end){
    return Math.floor(Math.random() * (end - start) + start);
}

exports.getClientIP = function(req){
    var ipAddress;
    var headers = req.headers;
    var forwardedIpsStr = headers['x-real-ip'] || headers['x-forwarded-for'];
    forwardedIpsStr ? ipAddress = forwardedIpsStr : ipAddress = null;
    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
}

exports.isJson = function(str){
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

exports.writeLog = function(name, content){
    if(!fs.existsSync(process.cwd()+"/logs/")){
        fs.mkdirSync(process.cwd()+"/logs/")
    }
    fs.writeFile(process.cwd()+"/logs/"+name, content,  function(err) {
        if (err) {
            return console.error(err);
        }

        return true
    });
}