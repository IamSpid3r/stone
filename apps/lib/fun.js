const fs = require('fs');
const  _ = require('lodash')

//获取商城对象
exports.getStore = function (urlStr) {
    var store = [
        {name:'淘宝',  regexp: 'item.taobao.com'},
        {name:'天猫',  regexp: ['tmall.com', 'detail.tmall.hk']},
        {name:'美亚',  regexp: ['amazon.com']},
        {name:'中亚',  regexp: ['amazon.cn']},
        {name:'日亚',  regexp: ['amazon.co.jp']},
        {name:'6pm',  regexp: ['6pm.com']},
        {name:'优购',  regexp: ['yougou.com']},
        {name:'NIKE官网',  regexp: ['nike.com']},
        {name:'京东',  regexp: ['item.jd']},
        {name:'识货海淘',  regexp: ['www.shihuo.cn\/haitao']},
        {name:'识货团购',  regexp: ['www.shihuo.cn\/tuangou']},
        {name:'识货自营',  regexp: ['www.shihuo.cn\/xianhuo']},
        {name:'nbaStore',  regexp: ['nba.com']},
        {name:'有货',  regexp: ['yohobuy.com']},
        {name:'银泰',  regexp: ['yintai.com']},
        {name:'卡路里商城',  regexp: ['kaluli.com']},
        {name:'footlocker官网',  regexp: ['footlocker.com']},
        {name:'UA官网',  regexp: ['underarmour.cn']},
        {name:'特步官网',  regexp: ['xtep.com.cn']},
        {name:'考拉海购',  regexp: ['kaola.com']},
        {name:'国美在线',  regexp: ['gome.com.cn']},
        {name:'苏宁易购',  regexp: ['suning.com']},
        {name:'毒',  regexp: ['du.hupu.com']},
        {name:'西集',  regexp: ['xiji.com']},
        {name:'美囤妈妈',  regexp: ['item.meitun.com', 'item.babytreegroup.hk']},
        {name:'贝贝',  regexp: ['beibei.com']},
        {name:'唯品会',  regexp: ['detail.vip.com']},
        {name:'华为商城',  regexp: ['vmall.com']},
        {name:'蜜芽',  regexp: ['mia.com']},
        {name:'澳洲chemistdirect',  regexp: ['cn.chemistdirect.com.au']},
        {name:'澳洲pharmacy4less',  regexp: ['cn.pharmacy4less.com.au']},
        {name:'澳洲pharmacyonline',  regexp: ['cn.pharmacyonline.com.au']},
        {name:'新西兰pharmacydirect',  regexp: ['cn.pharmacydirect.co.nz']},
        {name:'德国discount-apotheke',  regexp: ['cn.discount-apotheke.de']},
        {name:'德国amcal',  regexp: ['cn.amcal.com.au']},
        {name:'德国apo',  regexp: ['cn.apo.com']},
        {name:'澳洲abcpost',  regexp: ['www.abcpost.com.au']},
        {name:'德国delemei',  regexp: ['www.delemei.de']},
        {name:'德国BA保镖',  regexp: ['www.ba.de']},
        {name:'新西兰Kiwistarcare',  regexp: ['www.kiwistarcare.com']},
        {name:'德国UKA',  regexp: ['cn.unserekleineapotheke.de']},
        {name:'荷兰DOD',  regexp: ['cn.dod.nl']},
        {name:'farfetch',  regexp: ['www.farfetch.com']},
        {name:'小红书',  regexp: ['pages.xiaohongshu.com']},
        {name:'波罗蜜',  regexp: ['m.bolo.me','m.bolome.jp']},
        {name:'丝芙兰',  regexp: ['www.sephora.cn']},
        {name:'聚美优品',  regexp: ['item.jumei.com','item.jumeiglobal.com']},
        {name:'香港莎莎网',  regexp: ['www.sasa.com']},
        {name:'香港草莓网',  regexp: ['cn.strawberrynet.co']},
        {name:'香港卓悦网',  regexp: ['www.bonjourhk.com']},
        {name:'豌豆公主',  regexp: ['m.wandougongzhu.cn']},
    ];

    //findindex
    var index = null;
    for (var i = 0; i < store.length; i++) {
        let regexps = Array.isArray(store[i]['regexp']) ? store[i]['regexp'] : [store[i]['regexp']];
        regexps.forEach(function (patt) {
            reg = new RegExp(patt, "ig");
            res = reg.exec(urlStr)
            if (res) {
                index = i;
                return true;
            }
        })
        if (index !== null) {
            break
        }
    }

    //return name
    if (index === null) {
        return '其他';
    } else {
        return  store[index].name;
    }
}

exports.rnd = function (start, end) {
    return Math.floor(Math.random() * (end - start) + start);
}

exports.getClientIP = function (req) {
    var ipAddress;
    var headers = req.headers;
    var forwardedIpsStr = headers['x-real-ip'] || headers['x-forwarded-for'];
    forwardedIpsStr ? ipAddress = forwardedIpsStr : ipAddress = null;
    if (!ipAddress) {
        ipAddress = req.connection.remoteAddress;
    }
    return ipAddress;
}

exports.isJson = function (str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

exports.writeLog = function (name, content) {
    if (!fs.existsSync(process.cwd() + "/logs/")) {
        fs.mkdirSync(process.cwd() + "/logs/")
    }
    fs.writeFile(process.cwd() + "/logs/" + name, content, function (err) {
        if (err) {
            return console.error(err);
        }

        return true
    });
}

exports.readLog = function (name) {
    if (fs.existsSync(process.cwd() + "/logs/" + name)) {
        return fs.readFileSync(process.cwd() + "/logs/" + name, 'utf8');
    } else {
        return '';
    }
}


exports.stoneLog = function (key, level, param) {
    var key  = key || 'stone';
    var level = level || 'trace';
    var res = {
        'evt' : 'stone',
        'key'   :  key,
        'level' :  level,
    };
    _(param).forEach(function (val, key) {
        if (key == 'param') {
            res[key] = JSON.stringify(val);
        } else {
            res[key] = val;
        }
    })

    var filePath = "/data0/log-data/stone-"+exports.dateformat(new Date(), 'yyyy.MM.dd')+".log"
    fs.appendFile(filePath, JSON.stringify(res) + "\n", function (err) {
        if (err) {
            return console.error(err);
        }
        return true
    });
}


exports.generateTaskId = function (url) {
    var date = exports.dateformat(new Date(), 'yyyy.MM.dd');
    var millisecond = (new Date()).getTime();
    var rand = Math.random();

    return  date+md5(rand+url+millisecond);
}


exports.dateformat = function (data, fmt) { //author: meizz
    var o = {
        "M+": data.getMonth() + 1, //月份
        "d+": data.getDate(), //日
        "h+": data.getHours(), //小时
        "m+": data.getMinutes(), //分
        "s+": data.getSeconds(), //秒
        "q+": Math.floor((data.getMonth() + 3) / 3), //季度
        "S": data.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (data.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

exports.isDate = function(str){
    return /(\d{4})\.(\d{2})\.(\d{2})/.exec(str) ? true : false;
}

