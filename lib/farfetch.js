const request = require('request');
const url  = require('url');
const querystring = require('querystring');
const cheerio = require('cheerio');
const md5 = require('md5');
const _ = require('lodash');
const eventproxy = require('eventproxy');
const fun = require('./fun');

const proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        //https://www.farfetch.com/cn/shopping/men/nike-air-vapormax-flyknit--item-12624677.aspx
        ///cn/shopping/men/swear-nori-sneakers-item-12934772.aspx
        if(urlInfo.host == 'www.farfetch.com'){
            var exp = /cn\/.*?item-(\d*)\.aspx/ig;
            var res = exp.exec(urlInfo.path);
            var productId = res[1];

            return getItemInfo(urlStr, productId, callback);
        } else {
            return  callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'Host Error'
                }
            });
        }
    } catch (exception) {
        return  callback({
            "Errors":{
                'Code': 'Error',
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
        Unique: '',
        Md5: '',
        Status: 'inStock',
        Url: urlStr,
        ItemAttributes: {
            Title: '',
            ShopName : 'farfetch',
            ShopId: 'cn.farfetch',
            ImageUrl: '',
        },
        Variations: [],
        Items: [],
        Coupon:[]
    };

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

    (async () => {
        try {
            var allSkuResults = [];

            //当前页面的数据
            var body = await getHtml(urlStr);

            //没有找到页面
            if (body.toString().indexOf('没有找到页面') > -1) {
                itemInfo.Status = 'notFind';
                return callback(null, itemInfo);
            }

            var $ = cheerio.load(body);
            var patternSku = /__initialState_slice-pdp__\'\] = ([^<]+);<\/script/
            if (skuResult = patternSku.exec(body)) {
                skuResult = JSON.parse(skuResult[1]);

                //写入所有sku数组
                allSkuResults.push(skuResult);
            } else {
                throw new Error('body not found sku!');
            }

            //style
            let styleRequest = 'https://www.farfetch.com/cn/'+skuResult.requests.getSameStyleProducts;
            var styleBody = await getHtml(styleRequest);
            styleBody = JSON.parse(styleBody);

            //all style body
            if (styleBody.length > 0) {
                let urlStrs = [];
                styleBody.forEach(function (val) {
                    if (val.productId != productId) {
                        urlStrs.push('https://www.farfetch.com'+val.link.href);
                    }
                })

                //get body
                if (urlStrs.length > 0) {
                    var allBodys = await getHtml(urlStrs);
                    allBodys.forEach(function (body) {
                        if (skuResult = patternSku.exec(body)) {
                            skuResult = JSON.parse(skuResult[1]);

                            allSkuResults.push(skuResult);
                        } else {
                            throw new Error('body not found sku!');
                        }
                    })
                }
            }

            //return callback(null, allSkuResults);
            //items 排序保证即使填的子商品不一样md5一致
            allSkuResults.sort(function (a, b) {
                return a.productViewModel.details.productId -  b.productViewModel.details.productId;
            })
            var firstProductId = allSkuResults[0].productViewModel.details.productId;
            allSkuResults.forEach(function (result) {
                let productViewModel = result.productViewModel;
                var tmpImgs = [];
                productViewModel.images.main.forEach(function (val) {
                    tmpImgs.push(val[600]);
                })

                color.Values.push({
                    ValueId: result.productViewModel.details.productId,
                    Name: productViewModel.details.colors,
                    ImageUrls : tmpImgs
                })
                _colorIndex = color.Values.length - 1;
                _(productViewModel.sizes.available).forEach(function (val, sizeKey) {
                    if (val.quantity > 0) {
                        if (-1 == (_sizeIndex = _.findIndex(size.Values, {Name : val.description}))) {
                            size.Values.push({
                                ValueId:  size.Values.length + 1,
                                Name: val.description
                            })
                            _sizeIndex  = size.Values.length - 1;
                        }

                        //item
                        price =  sizeKey in productViewModel.priceInfo
                            ? productViewModel.priceInfo[sizeKey].finalPrice
                            : productViewModel.priceInfo.default.finalPrice;
                        itemInfo.Items.push({
                            Unique: 'cn.farfetch.' +color.Values[_colorIndex].ValueId+'.'+size.Values[_sizeIndex].ValueId,
                            Attr: [
                                {
                                    'Nid': 1,
                                    'N': '颜色',
                                    'Vid': color.Values[_colorIndex].ValueId,
                                    'V':  color.Values[_colorIndex].Name
                                },{
                                    'Nid': 2,
                                    'N': '尺码',
                                    'Vid':  size.Values[_sizeIndex].ValueId,
                                    'V':  size.Values[_sizeIndex].Name
                                }
                            ],
                            Offers: [{
                                Merchant: {
                                    Name: 'farfetch',
                                },
                                List: [{
                                    Price: price,
                                    Type: 'RMB'
                                }]
                            }]
                        })
                    }
                })
            })

            if (itemInfo.Items.length == 0) {
                itemInfo.Status = 'outOfStock';
                return callback(null, itemInfo);
            }
            //属性
            itemInfo.Unique = 'cn.farfetch.' + firstProductId;
            itemInfo.Variations.push(color);
            itemInfo.Variations.push(size);
            //基本信息
            itemInfo.ItemAttributes.Title =  skuResult.productViewModel.details.shortDescription;
            itemInfo.ItemAttributes.ImageUrl = color.Values[0].ImageUrls[0];

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

function getHtml(urlStrs) {
    return new Promise((resolve, reject) => {
        if (typeof urlStrs != 'object') {
            urlStrs = [urlStrs];
        }
        //wait all requests
        var ep = new eventproxy();
        ep.after('getHtml', urlStrs.length, function (body) {
            var contents = [];
            var isError = false;
            for (let i=0;i<body.length;i++) {
                if (body[i].err) {
                    isError = body[i].err;
                    break;
                } else {
                    contents.push(body[i].body)
                }
            }

            if (isError) {
                reject(isError);
            } else {
                resolve(contents);
            }
        })

        //request
        urlStrs.forEach(function (urlStr) {
            let options = {
                url: urlStr,
                gzip: true,
                timeout: 50000,
                headers: {
                    'authority': 'www.farfetch.com',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
                    "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    "accept-encoding": "gzip, deflate, br",
                    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
                    "cache-control": "no-cache",
                    "pragma": "no-cache",
                    'upgrade-insecure-requests' : 1,
                    "referer": "https://www.farfetch.com/cn/sets/men/new-in-this-week-eu-men.aspx",
                    "cookie" : 'FF.Session=10ho1utfsfid0iep0srlzzdu; ub=; BIcookieID=ad2208aa-59b4-43d2-801f-5067609e778e; checkoutType2=4; FF.ApplicationCookie=moY140v6gffRpSUs4Itn3QRj7x30Q8My35gTpve66oqb0N1gh0gjx9LYzDc6R5yAOZF26LoWod8TOm6RgvZFn0N4Jdkio1N87uCVpJE2meNaxAyLtCx5ykfh6RL-Kt4b39XSqhTXdxz_AHD9WejPv6YmMLi5nn_UgQdpOPTlqeLy95mPDeCTAd4qNLAzmo07bAUjSzXVoN5eAo2mQ_q3tt3ezW9FChgLTi3LLHsuooofLLiA; grtng-mssg={"isToDisplay":false,"type":2}; TapadCookie_v2=true; _qubitTracker=1528083974205.672520; _qubitTracker_s=1528083974205.672520; _qubitCountry=HK; __gads=ID=17f592f5ae54140b:T=1528083987:S=ALNI_MZGrsOA97vz6g762UHSYramZAX6IA; _ga=GA1.2.615930167.1528083987; _gid=GA1.2.1605017893.1528083988; cto_lwid=76334cc5-8d48-438b-9ecf-6a6134c037e3; rskxRunCookie=0; rCookie=zgg0ornlw24njt3r03h5t; RES_TRACKINGID=77361750709938082; ResonanceSegment=; RecentView_FF=; ckm-ctx-rank-formula=0; FFVIQSendUserID=; Hm_lvt_f2215c076b3975f65e029fad944be10a=1528083989,1528093340,1528093773,1528094042; ABListing=1071:1#108:1#122:1#21:1#28:1#333:0#35:2#47:1#61:1#64:1#65:2#81:2; ABLanding=139:0; ABCheckout=117:2; usr-gender=248; viq=farfetch; RES_SESSIONID=65059388112378182; _qst_s=6; _qst=%5B6%2C0%5D; _sp_ses.b865=*; SSP_AB_PDP_Design_20171215=Test; ak_bmsc=B488C0027CDB8F9AD8DA094008E379E8172B3016B3160000A24E165B36CD3475~plLxaUOPpsPlvAKaCruGwRpb4EBIJLVCYTEQ/bNocF382ph/M31wNAjF3Mi+Pv07nNuMZLLPGRDt4FikBzNKNAX+WNOtoPhVKU8l0rL+sbTgLmNVm7Zawry0MRGs+WlAljcAsGkZl5prFFUkBt/LGbolHeKpsXuTunSFAdNnbOchcOtq1v0Ej3jIqBSap4h1bbwlsZlshGaqGchjC3lRZgsAX259IdBe4hopWeIp4tv+4=; _br_uid_2=uid%3D2875528103966%3Av%3D11.8%3Ats%3D1528188514213%3Ahc%3D2; _sp_id.b865=a4714eb8-560a-4c11-97e1-66b360bc3492.1528188512.1.1528188586.1528188512.6436c767-23cb-4f35-8038-6c8b45b4a953; ckm-ctx-sf=/cn; ABGeneral=114:1#1167:1#120:1#133:0#135:1#37:2#952:1; ABProduct=10:1#134:0#137:0#138:1#142:0#5:1#93:1; _qsst_s=1528190272657; _qPageNum_farfetch=16; _qsst=1528190272933; qb_permanent=1528083974205.672520:112:17:6:3:0::0:1:0:BbFLYN:BbFlVD:::::137.59.101.152:hong%20kong:390:hong%20kong:HK:22.2759:114.167:unknown:unknown:hong%20kong:7310:5MTY4OTcxMzEzNA==.T!&DB!&G_G&I@Bw&Bx@Bw&DC!&V!&b@Bw&J_G&B0@Bw&c@Bw&Bv)1&d_G&e_G&H_G&U!&W!&E5@Bw&E6@Bw&Bi@Bw&Bj@Bw&L@Bw&M_G&X!&Y!&Ec(1&D5$f88yb&D6$A:Csub=Fc=Bu=BQZl=Ga:B:WPPPQ6s:WPPEAUI:0:0:0::0:0:.farfetch.com:0; qb_session=17:1:107:Csub=P:0:WPPEAUI:0:0:0:0:.farfetch.com; _gat_UA-3819811-6=1; Hm_lpvt_f2215c076b3975f65e029fad944be10a=1528190278; _uetsid=_uet20b27ca6; lastRskxRun=152819027975'
                }
            };
            request(options, function (err, response, body) {
                console.log(urlStr, err);
                ep.emit('getHtml', {
                    err : err,
                    body : body,
                });
            })
        })
    })
}
