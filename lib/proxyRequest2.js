var request = require('request');
var url = require('url');
var fun = require(process.cwd()+'/apps/lib/fun.js')
require('events').EventEmitter.prototype._maxListeners = 100;

var abuyunRequest  = function (options, callback) {
    var urlParsed = url.parse(options.url);
    var proxyHost = "http-dyn.abuyun.com";
    var proxyPort = "9020";
    var proxyUser = "H1B70L4D3801OSOD";
    var proxyPass = "96FA7DBB0020A1E6";

    var base64 = new Buffer(proxyUser + ":" + proxyPass).toString("base64");

    options.url = 'http://' + proxyHost + ":" + proxyPort + urlParsed.path;
    !options.headers && (options.headers = {});
    options.headers['Host'] = urlParsed.hostname;
    options.headers['Proxy-Authorization'] = "Basic " + base64;


    request(options, function (err, response, body) {
        if (!err && response.statusCode != 200){
            if (response.statusCode != 200) {
                fun.stoneLog('proxyError', 'error', {
                    int1 : response.statusCode
                })
            }
            err = 'http status not 200';
        }

        return callback(err, response, body);
    });
}

module.exports = abuyunRequest;