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
        {object: taobaoV2 , regexp: 'item.taobao.com'},
        {object: taobaoV2 , regexp: ['tmall.com', 'detail.tmall.hk']},
        {object: amazonUsa , regexp: ['amazon.com']},
        {object: amazonCn , regexp: ['amazon.cn']},
        {object: amazonJp , regexp: ['amazon.co.jp']},
        {object: _6pm , regexp: ['6pm.com']},
        {object: yougou , regexp: ['yougou.com']},
        {object: nikeStore , regexp: ['nike.com']},
        {object: jd , regexp: ['item.jd']},
        {object: shihuoHaitao , regexp: ['www.shihuo.cn\/haitao']},
        {object: shihuoTuangou , regexp: ['www.shihuo.cn\/tuangou']},
        {object: shihuoHaitao , regexp: ['www.shihuo.cn\/xianhuo']},
        {object: nbaStore , regexp: ['nba.com']},
        {object: yohobuy , regexp: ['yohobuy.com']},
        {object: yintai , regexp: ['yintai.com']},
        {object: kaluli , regexp: ['kaluli.com']},
        {object: footlocker , regexp: ['footlocker.com']},
        {object: underarmour , regexp: ['underarmour.cn']},
        {object: xtep , regexp: ['xtep.com.cn']},
        {object: kaola , regexp: ['kaola.com']},
        {object: gome , regexp: ['gome.com.cn']},
        {object: suning , regexp: ['suning.com']},
        {object: du , regexp: ['du.hupu.com']},
        {object: xiji , regexp: ['xiji.com']},
        {object: meitun , regexp: ['item.meitun.com', 'item.babytreegroup.hk']},
        {object: beibei , regexp: ['beibei.com']},
        {object: vip , regexp: ['detail.vip.com']},
        {object: huawei , regexp: ['vmall.com']},
        {object: mia , regexp: ['mia.com']},
        {object: chemistdirect , regexp: ['cn.chemistdirect.com.au']},
        {object: pharmacy4less , regexp: ['cn.pharmacy4less.com.au']},
        {object: pharmacyonline , regexp: ['cn.pharmacyonline.com.au']},
        {object: pharmacydirect , regexp: ['cn.pharmacydirect.co.nz']},
        {object: discountApotheke , regexp: ['cn.discount-apotheke.de']},
        {object: amcal , regexp: ['cn.amcal.com.au']},
        {object: apo , regexp: ['cn.apo.com']},
        {object: abcpost , regexp: ['www.abcpost.com.au']},
        {object: delemei , regexp: ['www.delemei.de']},
        {object: ba , regexp: ['www.ba.de']},
        {object: kiwi , regexp: ['www.kiwistarcare.com']},
        {object: uka , regexp: ['cn.unserekleineapotheke.de']},
        {object: dod , regexp: ['cn.dod.nl']},
        {object: farfetch , regexp: ['www.farfetch.com','www.farfetch.cn']},
        {object: xiaohongshu , regexp: ['pages.xiaohongshu.com']},
        {object: bolo , regexp: ['m.bolo.me','m.bolome.jp']},
        {object: sephora , regexp: ['www.sephora.cn']},
        {object: jumei , regexp: ['item.jumei.com','item.jumeiglobal.com']},
        {object: sasa , regexp: ['www.sasa.com']},
        {object: strawberrynet , regexp: ['cn.strawberrynet.co']},
        {object: bonjourhk , regexp: ['www.bonjourhk.com']},
        {object: wandou , regexp: ['m.wandougongzhu.cn']},
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