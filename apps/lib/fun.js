const fs = require('fs');
const  _ = require('lodash')

const taobao = require(process.cwd()+'/lib/taobao');
const taobaoV2 = require(process.cwd()+'/lib/taobaoV2');
const amazonCn = require(process.cwd()+'/lib/amazonCn');
const nikeStore = require(process.cwd()+'/lib/nikeStore');
const yougou = require(process.cwd()+'/lib/yougou');
const _6pm = require(process.cwd()+'/lib/6pm');
const shihuoHaitao = require(process.cwd()+'/lib/shihuoHaitao');
const shihuoTuangou = require(process.cwd()+'/lib/shihuoTuangou');
const amazonJp = require(process.cwd()+'/lib/amazonJp');
const amazonUsa = require(process.cwd()+'/lib/amazonUsa');
const nbaStore = require(process.cwd()+'/lib/nbaStore');
const yohobuy = require(process.cwd()+'/lib/yohobuy');
const yintai = require(process.cwd()+'/lib/yintai');
const kaluli = require(process.cwd()+'/lib/kaluli');
const footlocker = require(process.cwd()+'/lib/footlocker');
const jd = require(process.cwd()+'/lib/jd');
const underarmour = require(process.cwd()+'/lib/underarmour');
const xtep = require(process.cwd()+'/lib/xtep');
// 适合卡路里的考拉拉取方式
// const kaola = require(process.cwd()+'/lib/kaola');
const kaola = require(process.cwd()+'/lib/kaola');
const beibei = require(process.cwd()+'/lib/kaluli/beibei');
const meitun = require(process.cwd()+'/lib/kaluli/meitun');
const xiji = require(process.cwd()+'/lib/kaluli/xiji');
const delemei = require(process.cwd()+'/lib/kaluli/delemei');
const ba = require(process.cwd()+'/lib/kaluli/ba');
const kiwi = require(process.cwd()+'/lib/kaluli/kiwistarcare');
const uka = require(process.cwd()+'/lib/uka');
const discovery = require(process.cwd()+'/lib/kaluli/discovery');
const dod = require(process.cwd()+'/lib/kaluli/dod');
const pharmacyonline = require(process.cwd()+'/lib/kaluli/pharmacyonline');
const fengqu = require(process.cwd()+'/lib/kaluli/fengqu');

const suning = require(process.cwd()+'/lib/suning');
const gome = require(process.cwd()+'/lib/gome');
const du = require(process.cwd()+'/lib/du');
const iherb = require(process.cwd()+'/lib/iherb');
const abcpost = require(process.cwd()+'/lib/kaluli/abcpost');
const apo = require(process.cwd()+'/lib/kaluli/cnapo');
// const mia = require(process.cwd()+'/lib/mia');蜜芽新测试
const mia = require(process.cwd()+'/lib/kaluli/mia');
const chemistdirect = require(process.cwd()+'/lib/kaluli/chemistdirect');              //Chemist Direct药房中文官网
const pharmacy4less = require(process.cwd()+'/lib/kaluli/pharmacy4less');              //PHARMACY 4 LESS 澳洲站
const pharmacydirect = require(process.cwd()+'/lib/kaluli/pharmacydirect');            //新西兰大型综合性折扣店  Pharmacy Direct 中文站
const discountApotheke = require(process.cwd()+'/lib/kaluli/discountApotheke');        //德式康线上药房  discount-apotheke
const amcal = require(process.cwd()+'/lib/kaluli/amcal');                              //澳洲知名高端；连锁药房  amcal

const huawei =  require(process.cwd()+'/lib/huawei');  //华为
const farfetch =  require(process.cwd()+'/lib/farfetch');  //farfetch
const sephora = require(process.cwd()+'/lib/kaluli/sephora');
const bolo = require(process.cwd()+'/lib/kaluli/bolo');
const jumei = require(process.cwd()+'/lib/kaluli/jumei');
const xiaohongshu = require(process.cwd()+'/lib/kaluli/xiaohongshu');
const vip = require(process.cwd()+'/lib/vip2');
const sasa = require(process.cwd()+'/lib/kaluli/sasa'); //香港莎莎网
const strawberrynet = require(process.cwd()+'/lib/kaluli/strawberry');//香港草莓网
const bonjourhk = require(process.cwd()+'/lib/kaluli/bonjourhk'); //香港卓越网
const wandou = require(process.cwd()+'/lib/kaluli/wandou'); //豌豆公主

//获取商城对象
exports.getStore = function (urlStr, type = 'object') {
    var store = [
        {name:'淘宝', object: taobaoV2 , regexp: 'item.taobao.com'},
        {name:'天猫', object: taobaoV2 , regexp: ['tmall.com', 'detail.tmall.hk']},
        {name:'美亚', object: amazonUsa , regexp: ['amazon.com']},
        {name:'中亚', object: amazonCn , regexp: ['amazon.cn']},
        {name:'日亚', object: amazonJp , regexp: ['amazon.co.jp']},
        {name:'6pm', object: _6pm , regexp: ['6pm.com']},
        {name:'优购', object: yougou , regexp: ['yougou.com']},
        {name:'NIKE官网', object: nikeStore , regexp: ['nike.com']},
        {name:'京东', object: jd , regexp: ['item.jd']},
        {name:'识货海淘', object: shihuoHaitao , regexp: ['www.shihuo.cn\/haitao']},
        {name:'识货团购', object: shihuoTuangou , regexp: ['www.shihuo.cn\/tuangou']},
        {name:'识货自营', object: shihuoHaitao , regexp: ['www.shihuo.cn\/xianhuo']},
        {name:'nbaStore', object: nbaStore , regexp: ['nba.com']},
        {name:'有货', object: yohobuy , regexp: ['yohobuy.com']},
        {name:'银泰', object: yintai , regexp: ['yintai.com']},
        {name:'卡路里商城', object: kaluli , regexp: ['kaluli.com']},
        {name:'footlocker官网', object: footlocker , regexp: ['footlocker.com']},
        {name:'UA官网', object: underarmour , regexp: ['underarmour.cn']},
        {name:'特步官网', object: xtep , regexp: ['xtep.com.cn']},
        {name:'考拉海购', object: kaola , regexp: ['kaola.com']},
        {name:'国美在线', object: gome , regexp: ['gome.com.cn']},
        {name:'苏宁易购', object: suning , regexp: ['suning.com']},
        {name:'毒', object: du , regexp: ['du.hupu.com']},
        {name:'西集', object: xiji , regexp: ['xiji.com']},
        {name:'美囤妈妈', object: meitun , regexp: ['item.meitun.com', 'item.babytreegroup.hk']},
        {name:'贝贝', object: beibei , regexp: ['beibei.com']},
        {name:'唯品会', object: vip , regexp: ['detail.vip.com']},
        {name:'华为商城', object: huawei , regexp: ['vmall.com']},
        {name:'蜜芽', object: mia , regexp: ['mia.com']},
        {name:'澳洲chemistdirect', object: chemistdirect , regexp: ['cn.chemistdirect.com.au']},
        {name:'澳洲pharmacy4less', object: pharmacy4less , regexp: ['cn.pharmacy4less.com.au']},
        {name:'澳洲pharmacyonline', object: pharmacyonline , regexp: ['cn.pharmacyonline.com.au']},
        {name:'新西兰pharmacydirect', object: pharmacydirect , regexp: ['cn.pharmacydirect.co.nz']},
        {name:'德国discount-apotheke', object: discountApotheke , regexp: ['cn.discount-apotheke.de']},
        {name:'德国amcal', object: amcal , regexp: ['cn.amcal.com.au']},
        {name:'德国apo', object: apo , regexp: ['cn.apo.com']},
        {name:'澳洲abcpost', object: abcpost , regexp: ['www.abcpost.com.au']},
        {name:'德国delemei', object: delemei , regexp: ['www.delemei.de']},
        {name:'德国BA保镖', object: ba , regexp: ['www.ba.de']},
        {name:'新西兰Kiwistarcare', object: kiwi , regexp: ['www.kiwistarcare.com']},
        {name:'德国UKA', object: uka , regexp: ['cn.unserekleineapotheke.de']},
        {name:'荷兰DOD', object: dod , regexp: ['cn.dod.nl']},
        {name:'farfetch', object: farfetch , regexp: ['www.farfetch.com']},
        {name:'小红书', object: xiaohongshu , regexp: ['pages.xiaohongshu.com']},
        {name:'波罗蜜', object: bolo , regexp: ['m.bolo.me']},
        {name:'丝芙兰', object: sephora , regexp: ['www.sephora.cn']},
        {name:'聚美优品', object: jumei , regexp: ['item.jumei.com','item.jumeiglobal.com']},
        {name:'香港莎莎网', object: sasa , regexp: ['www.sasa.com']},
        {name:'香港草莓网', object: strawberrynet , regexp: ['cn.strawberrynet.co']},
        {name:'香港卓悦网', object: bonjourhk , regexp: ['www.bonjourhk.com']},
        {name:'豌豆公主', object: wandou , regexp: ['m.wandougongzhu.cn']},
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


    if (type == 'name') {
        //return name
        if (index === null) {
            return '其他';
        } else {
            return  store[index].name;
        }
    } else {
        //return obj
        if (index === null) {
            return '';
        } else {
            return  store[index].object;
        }
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

