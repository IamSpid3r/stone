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
exports.getStore = function (urlStr) {
    var store = [
        {name:'淘宝', object: taobaoV2 },
        {name:'天猫', object: taobaoV2 },
        {name:'美亚', object: amazonUsa },
        {name:'中亚', object: amazonCn },
        {name:'日亚', object: amazonJp },
        {name:'6pm', object: _6pm },
        {name:'优购', object: yougou },
        {name:'NIKE官网', object: nikeStore },
        {name:'京东', object: jd },
        {name:'识货海淘', object: shihuoHaitao },
        {name:'识货团购', object: shihuoTuangou },
        {name:'识货自营', object: shihuoHaitao },
        {name:'nbaStore', object: nbaStore },
        {name:'有货', object: yohobuy },
        {name:'银泰', object: yintai },
        {name:'卡路里商城', object: kaluli },
        {name:'footlocker官网', object: footlocker },
        {name:'UA官网', object: underarmour },
        {name:'特步官网', object: xtep },
        {name:'考拉海购', object: kaola },
        {name:'国美在线', object: gome },
        {name:'苏宁易购', object: suning },
        {name:'毒', object: du },
        {name:'西集', object: xiji },
        {name:'美囤妈妈', object: meitun },
        {name:'贝贝', object: beibei },
        {name:'唯品会', object: vip },
        {name:'华为商城', object: huawei },
        {name:'蜜芽', object: mia },
        {name:'澳洲chemistdirect', object: chemistdirect },
        {name:'澳洲pharmacy4less', object: pharmacy4less },
        {name:'澳洲pharmacyonline', object: pharmacyonline },
        {name:'新西兰pharmacydirect', object: pharmacydirect },
        {name:'德国discount-apotheke', object: discountApotheke },
        {name:'德国amcal', object: amcal },
        {name:'德国apo', object: apo },
        {name:'澳洲abcpost', object: abcpost },
        {name:'德国delemei', object: delemei },
        {name:'德国BA保镖', object: ba },
        {name:'新西兰Kiwistarcare', object: kiwi },
        {name:'德国UKA', object: uka },
        {name:'荷兰DOD', object: dod },
        {name:'farfetch', object: farfetch },
        {name:'小红书', object: xiaohongshu },
        {name:'波罗蜜', object: bolo },
        {name:'丝芙兰', object: sephora },
        {name:'聚美优品', object: jumei },
        {name:'香港莎莎网', object: sasa },
        {name:'香港草莓网', object: strawberrynet },
        {name:'香港卓悦网', object: bonjourhk },
        {name:'豌豆公主', object: wandou },
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

    //return obj
    if (index === null) {
        return '';
    } else {
        return  store[index].object;
    }
}