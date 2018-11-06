var request = require('request');
var url = require('url');
var fun = require(process.cwd()+'/apps/lib/fun.js')
require('events').EventEmitter.prototype._maxListeners = 100;

const accounts = [
    ['H1B70L4D3801OSOD', '96FA7DBB0020A1E6'],
    ['H03NKQ423SP1719D', 'E10AA73FF80C4427'] //todo 临时
];

var abuyunRequest  = function (options, callback) {
    var urlParsed = url.parse(options.url);
    var proxyHost = "http-dyn.abuyun.com";
    var proxyPort = "9020";

    //代理隧道
    if (Math.ceil(Date.now() / 1000) < 1542076020) {
        var rnd = fun.rnd(0, 2);
    } else {
        var rnd = 0;
    }
    var proxyUser = accounts[rnd][0];
    var proxyPass = accounts[rnd][1];


    var base64 = new Buffer(proxyUser + ":" + proxyPass).toString("base64");

    options.url = 'http://' + proxyHost + ":" + proxyPort + urlParsed.path;
    !options.headers && (options.headers = {});
    options.headers['Host'] = urlParsed.hostname;
    options.headers['Proxy-Authorization'] = "Basic " + base64;

    request(options, function (err, response, body) {
        if (err) {
            return callback(err, response, body);
        }
        if (response.statusCode > 400 && response.statusCode < 600){
            fun.stoneLog('proxyError', 'error', {
                int1 : response.statusCode
            })
            err = {};
            err.message = 'http status is '+response.statusCode;
        }
        return callback(err, response, body);
    });
}

module.exports = abuyunRequest;