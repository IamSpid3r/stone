var taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');

exports.getInfo = function(id, callback) {
    return getItemInfo(id, callback);
}

function getItemInfo(id, callback) {
    var api = 'mtop.taobao.detail.getdetail';
    var version = '6.0';
    var params = {
        "api" : api,
        'v' : version,
        'jsv': '2.4.8',
        'H5Request' : true,
        'AntiCreep' : true,
        'AntiFlood' : true,
        'isSec' : 0,
        "ecode" : 0,
        "ttid" : "2016@taobao_h5_2.0.0",
        "data" : {"itemNumId" : id},
    };

    var cookiePath = 'cookieV2.txt';
    taobaoToken(params , cookiePath, function (body, err) {
        if (err) {
            callback(err)
            return;
        }

        return callback(null, body)
    })
}
