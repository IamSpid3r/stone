var request = require('request');
var url = require('url');

var abuyunRequest  = function (options, callback) {
    var urlParsed = url.parse(options.url);
    var proxyHost = "http-dyn.abuyun.com";
    var proxyPort = "9020";
    var proxyUser = "H1B70L4D3801OSOD";
    var proxyPass = "96FA7DBB0020A1E6";

    var proxyUrl = "http://" + proxyUser + ":" + proxyPass + "@" + proxyHost + ":" + proxyPort;
    options.proxy = proxyUrl;

    !options.headers && (options.headers = {});
    options.headers['Proxy-Switch-Ip'] = "yes";

    request(options, function (err, response, body) {
        if (response.statusCode != 200){
            err = 'http status not 200';
        }

        callback(err, response, body);
    });
}

module.exports = abuyunRequest;