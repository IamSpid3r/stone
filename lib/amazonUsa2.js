const url = require('url');
const _ = require('lodash');
const request = require('request');
const md5 = require('md5');
const cheerio = require('cheerio');
const proxyRequest = require('./proxyRequest2');

exports.getInfo = function(urlStr, callback) {
    try {
        var urlInfo = url.parse(urlStr, true);
        var patt = /\/(B0[0-9,A-Z]{8})/g;
        result = patt.exec(urlInfo.path);
        if (!result) {
           throw new Error('url error no math ASIN');
        }
        var asin = result[1];

        (async () => {
            try {
                //55海淘接口
                var api55haitao = 'http://zhigou.55haitao.com/api';
                var requestData = sign.makeUp(urlStr);
                console.log(requestData)
                var bodyJSON = await getHtml({
                    method: 'post',
                    url : api55haitao,
                    form: JSON.stringify(requestData),
                    timeout: 10000,
                    headers: {
                        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
                        "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        "accept-encoding": "gzip, deflate, br",
                        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
                        "cache-control": "no-cache",
                        "pragma": "no-cache",
                        "referer": "http://search.55haitao.com/mallsearch/quickPurchase.html?cps_source=55haitao_quick",
                    }
                });

                var body = JSON.parse(bodyJSON);
                if (body.code == -1) {
                    throw new Error('no support');
                }
                if (body.code != 0) {
                    throw new Error(body.msg);
                }

                //商品详情页
                var bodyPage = await getHtml({
                    gzip : true,
                    url :  body.url,
                    timeout: 5000,
                    headers: {
                        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
                        "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        "accept-encoding": "gzip, deflate, br",
                        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
                        "cache-control": "no-cache",
                        "pragma": "no-cache",
                        "referer": "http://search.55haitao.com/mallsearch/quickPurchase.html?cps_source=55haitao_quick",
                    }
                })

                getItemInfo(urlStr, asin, bodyPage, callback);
            } catch (e) {
                return callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": e.message
                    }
                });
            }
        })()
    } catch (e){
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": e.message
            }
        });
    }
}

function getItemInfo(urlStr, asin, bodyPage, callback) {
    try {
        var pattern = /(skuData = .*?)skuPage.init/
        var result = pattern.exec(bodyPage);
        if (!result) {
            return callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'bodyPage error'
                }
            });
        }

        eval(result[1]);

        var parentAsin =  asin;//skuData.data.goodsid ? skuData.data.goodsid :
        var itemInfo = {
            Unique: 'usa.amazon.' + parentAsin,
            Md5: '',
            Status: 'inStock',
            Url: 'http://www.amazon.com/gp/product/' + parentAsin + '/',
            ItemAttributes: {
                Title: '',
                ShopName : '美亚',
                ShopId: 'usa.amazon',
                ImageUrl: ''
            },
            Variations: [],
            Items: []
        }

        //下架
        if (skuData.status.status != 1 || skuData.data.inStock != 1) {
            itemInfo.Status = 'outOfStock';
            return callback(null, itemInfo);
        }
        //基础信息
        itemInfo.ItemAttributes.Title = skuData.data.name;
        itemInfo.ItemAttributes.ImageUrl = skuData.data.coverImgUrl;

        var color = {
            "Id": 1 ,
            "Name":"颜色",
            "Values":[]
        };
        var size = {
            "Id": 2 ,
            "Name":"尺码",
            "Values":[]
        };
        //多sku
        // if (skuData.data.skuinfoPlus.length > 0) {
        //     skuData.data.skuinfoPlus.forEach(function (styleVal) {
        //         var _sizeIndex = _colorIndex = null;
        //         color.Values.push({
        //             ValueId:  color.Values.length+1,
        //             Name: styleVal.style,
        //             ImageUrls : styleVal.styleicon
        //         })
        //         _colorIndex = color.Values.length - 1;
        //
        //         styleVal.skuinfo.forEach(function (sizeVal) {
        //             if (sizeVal.name == 'Size') {
        //                 sizeVal.skuselectlist.forEach(function (sizeDetail) {
        //                     if (sizeDetail.isOnsale) {
        //                         if (-1 == (_sizeIndex = _.findIndex(size.Values, {Name : sizeDetail.value}))) {
        //                             size.Values.push({
        //                                 ValueId:  size.Values.length + 1,
        //                                 Name: sizeDetail.value
        //                             })
        //                             _sizeIndex  = size.Values.length - 1;
        //                         }
        //                     }
        //                 })
        //             }
        //         })
        //
        //         //item
        //         price = skuData.data.custom.mallPrice;
        //         item = {
        //             Unique: 'usa.amazon'+color.Values[_colorIndex].ValueId,
        //             Attr: [
        //                 {
        //                     'Nid': 1,
        //                     'N': '颜色',
        //                     'Vid': color.Values[_colorIndex].ValueId,
        //                     'V':  color.Values[_colorIndex].Name
        //                 }
        //             ],
        //             Offers: [{
        //                 Merchant: {
        //                     Name: 'amazon',
        //                 },
        //                 List: [{
        //                     Price: price,
        //                     Type: 'RMB'
        //                 }]
        //             }]
        //         }
        //         if (_sizeIndex !== null) {
        //             item.Unique+'.'+size.Values[_sizeIndex].ValueId;
        //             item.Attr.push({
        //                 'Nid': 2,
        //                 'N': '尺码',
        //                 'Vid':  size.Values[_sizeIndex].ValueId,
        //                 'V':  size.Values[_sizeIndex].Name
        //             })
        //         }
        //         itemInfo.Items.push(item);
        //     })
        // } else {
            var item = {
                Unique: "usa.amazon." + parentAsin,
                Attr: [],
                Offers: []
            }

            var Offer = {
                "Merchant": {
                    "Name": 'amazon'
                },
                "List": [{
                    Price: skuData.data.custom.mallPrice,
                    Type: "RMB"
                }]
            }
            item.Offers.push(Offer);
            itemInfo.Items.push(item);
        //}

        if (color.Values.length > 0) {
            itemInfo.Variations.push(color);
        }
        if (size.Values.length > 0) {
            itemInfo.Variations.push(size);
        }
        itemInfo.Md5 = md5(itemInfo);
        return callback(null, itemInfo);
    } catch (e){
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": e.message
            }
        });
    }
}

function getHtml(options) {
    return new Promise((resolve, reject) => {
        proxyRequest(options, function (err, response, body) {
            if (err) {
                reject(err);
            } else {
                resolve(body)
            }
        })
    })
}


//get sign
var sign  = {
    makeUp : function (urlStr) {
        var loginNeeded = 0;
        var netData  = {url: urlStr};
        var netCmd = '55haitao_sns.ExtendAPI/getProductByUrl';

        if(loginNeeded){
            // var tokenID = share.gmsinfo.gmstoken;
            // if(!tokenID){
            //     return false;
            // }
            // netData._tk = tokenID;
        }else{
            tokenID = "55haitao.com.device";
        }
        var deviceID = this.getDeviceID();
        netData._aid = 1001;
        netData._chl = "";
        netData._did = deviceID;
        netData._cid = deviceID+Date.now();
        netData._mt = netCmd;
        netData._pl = 'h5';
        netData._test = true;
        netData._sm = "MD5";
        netData._vc = "1.4";

        var keyArr = [];
        for(var key in netData){
            keyArr.push(key);
        }
        keyArr.sort();
        var rawStr = '';
        keyArr.forEach(function(iKey){
            var value = netData[iKey];
            if(iKey == '_test'){
                value = +value;
            }
            rawStr += "&"+iKey+"="+value;
        });
        rawStr = rawStr.substring(1);
        netData._sig = hex_md5(rawStr+tokenID);

        return netData;
    },
    getDeviceID: function(){
        var ipID = this.getIP();
        return hex_md5(ipID)+Math.floor(Date.now()*0.001);
    },
    getIP: function(){
        //if (typeof returnCitySN == 'undefined') {
            return Math.random().toString(36).substr(2);
        //}
        //return returnCitySN['cip'];
    }
};
var hexcase=0;var b64pad="";var chrsz=8;function hex_md5(s){return binl2hex(core_md5(str2binl(s),s.length*chrsz))}function b64_md5(s){return binl2b64(core_md5(str2binl(s),s.length*chrsz))}function hex_hmac_md5(key,data){return binl2hex(core_hmac_md5(key,data))}function b64_hmac_md5(key,data){return binl2b64(core_hmac_md5(key,data))}function calcMD5(s){return binl2hex(core_md5(str2binl(s),s.length*chrsz))}function md5_vm_test(){return hex_md5("abc")=="900150983cd24fb0d6963f7d28e17f72"}function core_md5(x,len){x[len>>5]|=128<<((len)%32);x[(((len+64)>>>9)<<4)+14]=len;var a=1732584193;var b=-271733879;var c=-1732584194;var d=271733878;for(var i=0;i<x.length;i+=16){var olda=a;var oldb=b;var oldc=c;var oldd=d;a=md5_ff(a,b,c,d,x[i+0],7,-680876936);d=md5_ff(d,a,b,c,x[i+1],12,-389564586);c=md5_ff(c,d,a,b,x[i+2],17,606105819);b=md5_ff(b,c,d,a,x[i+3],22,-1044525330);a=md5_ff(a,b,c,d,x[i+4],7,-176418897);d=md5_ff(d,a,b,c,x[i+5],12,1200080426);c=md5_ff(c,d,a,b,x[i+6],17,-1473231341);b=md5_ff(b,c,d,a,x[i+7],22,-45705983);a=md5_ff(a,b,c,d,x[i+8],7,1770035416);d=md5_ff(d,a,b,c,x[i+9],12,-1958414417);c=md5_ff(c,d,a,b,x[i+10],17,-42063);b=md5_ff(b,c,d,a,x[i+11],22,-1990404162);a=md5_ff(a,b,c,d,x[i+12],7,1804603682);d=md5_ff(d,a,b,c,x[i+13],12,-40341101);c=md5_ff(c,d,a,b,x[i+14],17,-1502002290);b=md5_ff(b,c,d,a,x[i+15],22,1236535329);a=md5_gg(a,b,c,d,x[i+1],5,-165796510);d=md5_gg(d,a,b,c,x[i+6],9,-1069501632);c=md5_gg(c,d,a,b,x[i+11],14,643717713);b=md5_gg(b,c,d,a,x[i+0],20,-373897302);a=md5_gg(a,b,c,d,x[i+5],5,-701558691);d=md5_gg(d,a,b,c,x[i+10],9,38016083);c=md5_gg(c,d,a,b,x[i+15],14,-660478335);b=md5_gg(b,c,d,a,x[i+4],20,-405537848);a=md5_gg(a,b,c,d,x[i+9],5,568446438);d=md5_gg(d,a,b,c,x[i+14],9,-1019803690);c=md5_gg(c,d,a,b,x[i+3],14,-187363961);b=md5_gg(b,c,d,a,x[i+8],20,1163531501);a=md5_gg(a,b,c,d,x[i+13],5,-1444681467);d=md5_gg(d,a,b,c,x[i+2],9,-51403784);c=md5_gg(c,d,a,b,x[i+7],14,1735328473);b=md5_gg(b,c,d,a,x[i+12],20,-1926607734);a=md5_hh(a,b,c,d,x[i+5],4,-378558);d=md5_hh(d,a,b,c,x[i+8],11,-2022574463);c=md5_hh(c,d,a,b,x[i+11],16,1839030562);b=md5_hh(b,c,d,a,x[i+14],23,-35309556);a=md5_hh(a,b,c,d,x[i+1],4,-1530992060);d=md5_hh(d,a,b,c,x[i+4],11,1272893353);c=md5_hh(c,d,a,b,x[i+7],16,-155497632);b=md5_hh(b,c,d,a,x[i+10],23,-1094730640);a=md5_hh(a,b,c,d,x[i+13],4,681279174);d=md5_hh(d,a,b,c,x[i+0],11,-358537222);c=md5_hh(c,d,a,b,x[i+3],16,-722521979);b=md5_hh(b,c,d,a,x[i+6],23,76029189);a=md5_hh(a,b,c,d,x[i+9],4,-640364487);d=md5_hh(d,a,b,c,x[i+12],11,-421815835);c=md5_hh(c,d,a,b,x[i+15],16,530742520);b=md5_hh(b,c,d,a,x[i+2],23,-995338651);a=md5_ii(a,b,c,d,x[i+0],6,-198630844);d=md5_ii(d,a,b,c,x[i+7],10,1126891415);c=md5_ii(c,d,a,b,x[i+14],15,-1416354905);b=md5_ii(b,c,d,a,x[i+5],21,-57434055);a=md5_ii(a,b,c,d,x[i+12],6,1700485571);d=md5_ii(d,a,b,c,x[i+3],10,-1894986606);c=md5_ii(c,d,a,b,x[i+10],15,-1051523);b=md5_ii(b,c,d,a,x[i+1],21,-2054922799);a=md5_ii(a,b,c,d,x[i+8],6,1873313359);d=md5_ii(d,a,b,c,x[i+15],10,-30611744);c=md5_ii(c,d,a,b,x[i+6],15,-1560198380);b=md5_ii(b,c,d,a,x[i+13],21,1309151649);a=md5_ii(a,b,c,d,x[i+4],6,-145523070);d=md5_ii(d,a,b,c,x[i+11],10,-1120210379);c=md5_ii(c,d,a,b,x[i+2],15,718787259);b=md5_ii(b,c,d,a,x[i+9],21,-343485551);a=safe_add(a,olda);b=safe_add(b,oldb);c=safe_add(c,oldc);d=safe_add(d,oldd)}return Array(a,b,c,d)}function md5_cmn(q,a,b,x,s,t){return safe_add(bit_rol(safe_add(safe_add(a,q),safe_add(x,t)),s),b)}function md5_ff(a,b,c,d,x,s,t){return md5_cmn((b&c)|((~b)&d),a,b,x,s,t)}function md5_gg(a,b,c,d,x,s,t){return md5_cmn((b&d)|(c&(~d)),a,b,x,s,t)}function md5_hh(a,b,c,d,x,s,t){return md5_cmn(b^c^d,a,b,x,s,t)}function md5_ii(a,b,c,d,x,s,t){return md5_cmn(c^(b|(~d)),a,b,x,s,t)}function core_hmac_md5(key,data){var bkey=str2binl(key);if(bkey.length>16){bkey=core_md5(bkey,key.length*chrsz)}var ipad=Array(16),opad=Array(16);for(var i=0;i<16;i++){ipad[i]=bkey[i]^909522486;opad[i]=bkey[i]^1549556828}var hash=core_md5(ipad.concat(str2binl(data)),512+data.length*chrsz);return core_md5(opad.concat(hash),512+128)}function safe_add(x,y){var lsw=(x&65535)+(y&65535);var msw=(x>>16)+(y>>16)+(lsw>>16);return(msw<<16)|(lsw&65535)}function bit_rol(num,cnt){return(num<<cnt)|(num>>>(32-cnt))}function str2binl(str){var bin=Array();var mask=(1<<chrsz)-1;for(var i=0;i<str.length*chrsz;i+=chrsz){bin[i>>5]|=(str.charCodeAt(i/chrsz)&mask)<<(i%32)}return bin}function binl2hex(binarray){var hex_tab=hexcase?"0123456789ABCDEF":"0123456789abcdef";var str="";for(var i=0;i<binarray.length*4;i++){str+=hex_tab.charAt((binarray[i>>2]>>((i%4)*8+4))&15)+hex_tab.charAt((binarray[i>>2]>>((i%4)*8))&15)}return str}function binl2b64(binarray){var tab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";var str="";for(var i=0;i<binarray.length*4;i+=3){var triplet=(((binarray[i>>2]>>8*(i%4))&255)<<16)|(((binarray[i+1>>2]>>8*((i+1)%4))&255)<<8)|((binarray[i+2>>2]>>8*((i+2)%4))&255);for(var j=0;j<4;j++){if(i*8+j*6>binarray.length*32){str+=b64pad}else{str+=tab.charAt((triplet>>6*(3-j))&63)}}}return str};
