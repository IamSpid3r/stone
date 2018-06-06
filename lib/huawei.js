const request = require('request');
const url  = require('url');
const querystring = require('querystring');
const cheerio = require('cheerio');
const md5 = require('md5');
const _ = require('lodash');
const eventproxy = require('eventproxy');
const fun = require(process.cwd()+"/apps/lib/fun.js");

const proxyRequest = require('./proxyRequest2');

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {

        //https://www.vmall.com/product/417236260.html
        if(urlInfo.host == 'www.vmall.com'){
            var exp = /product\/(\d*)\.html/ig;
            var res = exp.exec(urlInfo.path);
            var productId = res[1];

            return getItemInfo(urlStr, productId, callback);
        } else {
            return  callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'Url Error'
                }
            });
        }
    } catch (exception) {
        return  callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
    }
}

/*
 *内容处理
 **/
function getItemInfo(urlStr, productId, callback) {
    var itemInfo = {
        Unique: 'cn.huawei.' + productId,
        Md5: '',
        Status: 'inStock',
        Url: urlStr,
        ItemAttributes: {
            Title: '',
            ShopName : '华为官网',
            ShopId: 'cn.huawei',
            ImageUrl: '',
            VenderType:'普通',
            ShopType:'普通',
            StageInfo:'',
            Region: true,
        },
        Variations: [],
        Items: [],
        Coupon: {
            List : []
        }
    };

    (async () => {
        try {
            let mApi = 'https://m.vmall.com/product/'+productId+'.html';
            var body = await getHtml(mApi);
            var $ = cheerio.load(body);
            //不存在的商品
            let emptyTitle = $('.system-empty-title').text();
            if (emptyTitle && emptyTitle.indexOf('找不到商品') != -1) {
                itemInfo.Status = 'notFind';
                return callback(null, itemInfo);
            }

            var skuInfo = [];
            var skuForm = [];
            var skuIds = [];
            var codes = [];
            //兼容参数
            var ecWap = {
                prodDetial : {
                    addSkuAttr : function (skuId, pid, pname, cid, cname) {
                        if (-1 == (index = _.findIndex(skuForm, {skuId : skuId}))) {
                            skuForm.push({
                               skuId : skuId,
                               detail : []
                            })

                            index = skuForm.length -1;
                        }

                        skuForm[index].detail.push(
                            {
                                pid : pid,
                                pname : pname,
                                cid : cid,
                                cname : cname,
                            }
                        );
                    },
                    setSku : function (skuId, info) {
                        skuInfo[skuId] = info;

                        skuIds.push(skuId);
                        codes.push(info.code)
                    },
                    getSku : function () {
                    },
                    getSkuInfo: function () {
                        console.log('x', arguments)
                        return  {id : 1, photoPath: '22', photoName : '2' , skuPromWord: ''}

                    },
                },
                wechatshare : {
                    initwx : function () {
                        
                    }
                }
            };
            let patternSku = /(ecWap\.prodDetial\.bindDateDtetail[\s\S]*)ecWap\.prodDetial\.setDefaultSkuByUrlSkuid/
            var wapDomain = "https://m.vmall.com";
            var mediaPath = "https://res.vmallres.com/pimages/";
            if (skuResult = patternSku.exec(body)) {
                eval(skuResult[1]);
            }

            //sku状态
            skuIds = skuIds.map(function (val) {
                return '&skuIds='+val;
            });
            skuIdsStr = _.trim(skuIds.join(''), '&')
            var getInventoryApi = 'https://m.vmall.com/product/inventory.json?'+skuIdsStr;
            var inventoryStatusBody = await getHtml(getInventoryApi);
            inventoryStatusBody = JSON.parse(inventoryStatusBody);
            if (inventoryStatusBody.success) {
                inventoryStatus = inventoryStatusBody.data;
            } else {
                throw new Error('inventory api error');
            }
            //优惠券
            var codeUrlencode = encodeURIComponent(JSON.stringify({"isFilterRepeat":0,"isReturnDiscount":1,"sbom": codes}));
            var couponApi = 'https://act.vmall.com/couponCodeActivity/queryCouponBySboms.json?queryCouponBySbomReqJson='+codeUrlencode+'&callback=&_='+Date.now();
            var couponBody = await getHtml(couponApi);
            couponBody = _.trim(_.trim(couponBody, '('),')')
            couponBody = JSON.parse(couponBody);
            if (couponBody.success) {
                if ('couponCodeData' in couponBody) {
                    var couponList = couponBody.couponCodeData;
                } else {
                    var couponList = [];
                }
            } else {
                throw new Error('coupon api error');
            }
            if (couponList.length > 0) {
                var couponDetail = null;
                couponList.forEach(function (couponVal) {
                    //满减加金额未出现过
                    if (couponVal.couponType == 1 && (!couponDetail || couponDetail.amount != couponVal.amount)) {
                        couponDetail = couponVal;
                    }
                })
                if (couponDetail) {
                    var stime = fun.dateformat(new Date(couponDetail.beginDate), 'yyyy-MM-dd hh:mm:ss');
                    var etime = fun.dateformat(new Date(couponDetail.endDate), 'yyyy-MM-dd hh:mm:ss');
                    itemInfo.Coupon.List.push({
                        "Id": couponDetail.activityCode,
                        "Amount": [couponDetail.amount, couponDetail.amtMin],
                        "Date": [stime, etime],
                        "Category": "normal",
                        "Type": "item"
                    });
                }
            }

            //属性
            var nowTime = Date.now();

            skuForm.forEach(function (valCondition) {
                if (inventoryStatus[valCondition.skuId] == 'true') {
                    var currentSkuInfo = skuInfo[valCondition.skuId];

                    //优惠信息
                    var timerPromWord = '';
                    if((!currentSkuInfo.timerPromStarttime || (new Date(currentSkuInfo.timerPromStarttime)).getTime() < nowTime) && (!currentSkuInfo.timerPromEndtime || (new Date(currentSkuInfo.timerPromEndtime)).getTime() > nowTime)) {
                        timerPromWord = currentSkuInfo.timerPromWord;
                    }

                    //item
                    var item = {
                        Unique: 'cn.huawei.' + valCondition.skuId,
                        Attr: [],
                        Offers: [{
                            Merchant: {
                                Name: '华为官网',
                            },
                            List: [{
                                Price: currentSkuInfo.price,
                                Type: 'RMB'
                            }],
                            Subtitle :timerPromWord
                        }]
                    }

                    var tmpImgs = [];
                    valCondition.detail.forEach(function (valDetail) {
                        //属性
                        if (-1 == (_index = _.findIndex(itemInfo.Variations, {Id: valDetail.pid}))) {
                            itemInfo.Variations.push({
                                Id: valDetail.pid ,
                                Name: valDetail.pname,
                                Values:[]
                            })

                            _index = itemInfo.Variations.length - 1;
                        }

                        //属性子集
                        if (-1 == ( __index = _.findIndex( itemInfo.Variations[_index].Values, {Name: valDetail.cname}))) {
                            if ('颜色' ==  valDetail.pname) {
                                tmpImgs.push('https://res.vmallres.com/pimages/'+currentSkuInfo.photoPath+'/428_428_'+currentSkuInfo.photoName);
                                currentSkuInfo.imgName.forEach(function (img) {
                                    tmpImg = 'https://res.vmallres.com/pimages/'+img.path+'/428_428_'+img.name;
                                    tmpImgs.push(tmpImg);
                                })
                                itemInfo.Variations[_index].Values.push({
                                    ValueId: valDetail.cid,
                                    Name: valDetail.cname,
                                    ImageUrls :tmpImgs
                                })
                            } else {
                                itemInfo.Variations[_index].Values.push({
                                    ValueId: valDetail.cid,
                                    Name: valDetail.cname,
                                })
                            }

                            __index = itemInfo.Variations[_index].Values.length - 1;
                        }

                        item.Attr.push({
                            'Nid': itemInfo.Variations[_index].Id,
                            'N': itemInfo.Variations[_index].Name,
                            'Vid': itemInfo.Variations[_index].Values[__index].ValueId,
                            'V':  itemInfo.Variations[_index].Values[__index].Name
                        })
                    })

                    itemInfo.Items.push(item);

                    if (!itemInfo.ItemAttributes.Title) {
                        //标题
                        itemInfo.ItemAttributes.Title = currentSkuInfo.name;
                    }
                    if (!itemInfo.ItemAttributes.ImageUrl) {
                        itemInfo.ItemAttributes.ImageUrl = tmpImgs[0];
                    }
                }
            })


            if (itemInfo.Items.length == 0) {
                itemInfo.Status = 'outOfStock';
                return callback(null, itemInfo);
            }
            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            return callback(null, itemInfo);
        } catch(e) {
            return  callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": e.message
                }
            });
        }
    })()
}

function getHtml(urlStr) {
     let options = {
        url: urlStr,
        timeout: 5000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            "Accept-Encoding": "deflate,sdch",
            "Accept-Language": " zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Referer": "https://www.vmall.com/product/10086000689735.html",
            "Cookie" : 'Hm_lvt_a08b68724dd89d23017170634e85acd8=1527762808; UM_distinctid=163b5c26ecc1162-05e9e37c992ce7-336d7704-fa000-163b5c26ecd206; _dmpa_ref=%5B%22%22%2C%22%22%2C1527762809%2C%22https%3A%2F%2Fwww.google.com.hk%2F%22%5D; _dmpa_ses=3536e8a31cbce8d38a759e5768b9edef984cbac4; _pk_hi_ssid=26b1ba5569ec41b59c0e7601499f1ff3; euid=9971d0ddc54644ec9eb5b49bb93b245b; deviceid=bbc0db1118b64bb6b7aeb85b795a273e; TID=5766391ee6fa4d5788cfe7f68421dfdb; cps_orderid=; _pk_ref.m.vmall.com.9771=%5B%22%22%2C%22%22%2C1527762984%2C%22https%3A%2F%2Fwww.vmall.com%2Fproduct%2F10086000689735.html%22%5D; _pk_cvar.m.vmall.com.9771=%7B%7D; _pk_ses.m.vmall.com.9771=*; Hm_lvt_fe2b46caf2fee4e4b483b4c75f784be9=1527762985,1527762991; Hm_lpvt_fe2b46caf2fee4e4b483b4c75f784be9=1527762991; _pk_id.m.vmall.com.9771=7ddb2497b37d3a9d.1527762984.1.1527762991.1527762984.; Hm_lpvt_a08b68724dd89d23017170634e85acd8=1527763555; _dmpa_ses_time=1527765355247; _dmpa_id=101910f9bddf2b95ef4475787402341527762772553.1527763552.0.1527763555..'
        }
    };
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
