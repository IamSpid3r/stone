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
const sasa = require(process.cwd()+'/lib/kaluli/sasa'); //莎莎
const strawberrynet = require(process.cwd()+'/lib/kaluli/strawberry');//香港草莓网
const bonjourhk = require(process.cwd()+'/lib/kaluli/bonjourhk'); //香港卓越网


//获取商城对象
exports.getStore = function (urlInfo) {
    switch(urlInfo.host){
        case 'www.amazon.cn':
            return amazonCn;
            break;
        case 'www.amazon.co.jp':
            return amazonJp;
            break;
        case 'www.amazon.com':
            return amazonUsa;
            break;
        case 'item.taobao.com':
        case 'detail.tmall.com':
        case 'detail.tmall.hk':
        case 'chaoshi.detail.tmall.com':
        case 'world.tmall.com':
            //return taobao;
            return taobaoV2;
            break;
        case 'store.nike.com':
        case 'www.nike.com':
            return nikeStore;
            break;
        case 'www.yougou.com':
        case 'seoul.yougou.com':
            return yougou;
            break;
        case 'www.shihuo.cn':
            var xianhuoExp = /\/xianhuo\/buy\/(\d+)(-(\d+)){0,1}\.html/ig;
            var haitaoExp = /\/haitao\/buy\/(\d+)(-(\d+)){0,1}\.html/ig;
            var tuangouExp = /\/tuangou\/(\d+)/ig;

            if(xianhuoExp.exec(urlInfo.path) || haitaoExp.exec(urlInfo.path)){
                return shihuoHaitao;
            }else if(tuangouExp.exec(urlInfo.path)){
                return shihuoTuangou;
            }else{
                return '';
            }
            break;
        case 'www.haitaodashi.cn':
            var haitaoExp = /\/haitao\/buy\/(\d+)(-(\d+)){0,1}\.html/ig;

            if(haitaoExp.exec(urlInfo.path)){
                return shihuoHaitao;
            }else{
                return '';
            }
            break;
        case 'www.6pm.com':
            return _6pm;
            break;
        case 'store.nba.com':
            return nbaStore;
            break;
        case 'item.yohobuy.com':
        case 'www.yohobuy.com':
            return yohobuy;
            break;
        case 'item.yintai.com':
            return yintai;
            break;
        case 'www.kaluli.com':
            return kaluli;
            break;
        case 'www.footlocker.com':
            return footlocker;
            break;
        case 'item.jd.com':
        case 'item.jd.hk':
            return jd;
            break;
        case 'www.underarmour.cn':
            return underarmour;
            break;
        case 'www.xtep.com.cn':
            return xtep;
        case 'www.kaola.com':
        case 'www.kaola.com.hk':
        case 'goods.kaola.com':
            return kaola;
            break;

        // 贝贝网
        case 'global.beibei.com':
        case 'www.beibei.com':
        case 'you.beibei.com':
            return beibei;
            break;
        //美囤网
        case 'item.meitun.com':
        case 'item.babytreegroup.hk':
            return meitun;
            break;
        //西集网
        case 'www.xiji.com':
            return xiji;
            break;
        case 'www.fengqu.com':
            return fengqu;
            break;
        case 'product.suning.com':
            return suning;
            break;
        case 'item.gome.com.cn':
            return gome;
            break;
        case 'du.hupu.com':
        case 'dev.du.hupu.com':
            return du;
            break;
        case 'cn.iherb.com':
            return iherb;
        case 'cn.chemistdirect.com.au':
            return chemistdirect;
            break;
        case 'cn.pharmacy4less.com.au':
            return pharmacy4less;
            break;
        // case 'cn.pharmacyonline.com.au':
        case 'cn.pharmacydirect.co.nz':
            return pharmacydirect;
            break;
        case 'cn.discount-apotheke.de':
            return discountApotheke;
            break;
        case 'cn.amcal.com.au':
            return amcal;
            break;
        case 'cn.pharmacyonline.com.au':
            return pharmacyonline;
            break;
        case 'www.abcpost.com.au':
            return abcpost;
            break;
        case 'cn.apo.com':
            return apo;
            break;
        //蜜芽
        case 'www.miyabaobei.hk':
        case 'www.mia.com':
            return mia;
            break;
        case 'www.delemei.de':
            return delemei;
        case 'www.ba.de':
            return ba;
        case 'www.kiwistarcare.com':
            return kiwi;
        case 'cn.unserekleineapotheke.de':
            return uka;
        case 'cn.kiwidiscovery.co.nz':
            return discovery;
        case 'cn.dod.nl':
            return dod;
        case 'detail.vip.com':
            return vip;
        case 'www.vmall.com':
            return huawei;
        case 'www.farfetch.com':
            return farfetch;
        case 'www.sephora.cn':
            return sephora;
            break;
        case  'm.bolo.me':
            return bolo;
            break;
        case 'item.jumei.com':
        case 'item.jumeiglobal.com':
            return jumei;
            break;
        case 'pages.xiaohongshu.com':
            return xiaohongshu;
            break;
        case 'www.sasa.com':
            return sasa;
            break;
        case 'cn.strawberrynet.com':
            return strawberrynet;
            break;
        case 'www.bonjourhk.com':
            return bonjourhk;
            break;
        default:
            return '';
            break;
    }
}