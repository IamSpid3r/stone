var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');
var zlib = require('zlib');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'store.nike.com'){
        var exp_normal = /cn\/zh_cn\/pd.*pid-(\d*)(\/pgid-(\d*)){0,1}/ig;            //正常详情页
        var exp_custom = /cn\/zh_cn\/product\/(.*)\//ig;      //定制详情页

        res_normal = exp_normal.exec(urlInfo.path);
        res_custom = exp_custom.exec(urlInfo.path);
        if(res_normal){
            getNormalItemInfo(urlStr, callback, res_normal);
        }else if(res_custom){
            getCustomItemInfo(urlStr, callback, res_custom);
        }else{
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'Goods Not Found'
                }
            });
            return ;
        }

    }else if(urlInfo.host == 'www.nike.com'){
        callback({
            "Errors":{
                'Code': 'Warning',
                "Message": 'Don\'t need to crawl'
            }
        });
        return ;
    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Host error is not nikestore hostname'
            }
        });
        return ;
    }
}

/*
*正常内容处理
**/
function getNormalItemInfo(urlStr,callback,res_normal) {
    getHtml(urlStr, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        var $ = cheerio.load(body);
        var res = $('#product-data').html();
        var notFound = $('.product-not-found-header').html(); //没有找到
        var uniqueId = (typeof res_normal[3] != 'undefined') ? res_normal[3]+'.'+ res_normal[1] : res_normal[1];
        if(res){
            res = JSON.parse(res);

            var itemInfo = {
                Unique: 'cn.nikestore.' + res.productGroupId,
                Md5: '',
                Status: 'inStock',
                Url: res.url,
                ItemAttributes: {
                    Title: res.displayName,
                    ShopName : 'NIKE官网',
                    ShopId: 'cn.nikestore',
                    ImageUrl: res.imagesHeroMedium[0]
                },
                Variations: [],
                Items: []
            };

            var n = j = i = h = f = 0;
            var type = {'color':1, 'size': 2};                  //类型对应id
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
            var nikeUrls  = [];  //nike所有商品链接
            var nikeItems = [];  //nike所有商品


            if(!res['inStockColorways']){//下架
                itemInfo.Status = 'outOfStock';
                itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                callback(null, itemInfo);
                return ;
            }
            //获取所有的url
            for(var i in res['inStockColorways']){
                if(
                    nikeUrls.indexOf(res['inStockColorways'][i].url) == -1
                    && res.productId != res['inStockColorways'][i].productId
                ){
                    //nikeUrls.push(res['inStockColorways'][i].url);
                    oldUrl = res['inStockColorways'][i].url;
                    productId = res['inStockColorways'][i].productId;
                    productGroupId = res['inStockColorways'][i].productGroupId;
                    catalogId = res.catalogId;
                    path = oldUrl.substr('http://store.nike.com'.length);

                    oldUrl = encodeURIComponent(oldUrl);
                    path = encodeURIComponent(path);

                    nikeUrls.push('http://store.nike.com/html-services/templateData/pdpData?action=getPage&path='+path+'&productId='+productId+'&productGroupId='+productGroupId+'&catalogId='+catalogId+'&newUrl='+oldUrl+'&country=CN&lang_locale=zh_CN');
                }
            }

            //取回数据统一处理
            var ep = new eventproxy();
            ep.after('nikeUrls', nikeUrls.length, function (nikeItems) {
                nikeItems.unshift(res);
                nikeItems.sort(function (a,b) {
                    aName =  a.colorDescription ? a.colorDescription : (a.styleNumber +'-'+ a.colorNumber);
                    bName =  b.colorDescription ? b.colorDescription : (b.styleNumber +'-'+ b.colorNumber);

                    return aName > bName;
                });

                nikeItems.forEach(function(nikeItem){
                    //获取所有的颜色
                    j++;
                    valueId = type.color+_.padStart(j, 6, 0);
                    colorName =  nikeItem.colorDescription ? nikeItem.colorDescription : (nikeItem.styleNumber +'-'+ nikeItem.colorNumber);
                    color.Values.push({
                        "ValueId": valueId,
                        "Name": colorName,
                        "ImageUrls":nikeItem.imagesHeroMedium
                    });

                    nikeItem.skuContainer.productSkus.forEach(function(productSkus){
                        if(productSkus.inStock){
                            if(
                                (sizeIndex = _.findIndex(size.Values, {"Name": productSkus.displaySize})) == -1
                            ){
                                //获取所有的尺寸
                                n++;
                                valueId = type.size+_.padStart(n, 6, 0);

                                size.Values.push({
                                    "ValueId": valueId,
                                    "Name": productSkus.displaySize
                                });

                                sizeIndex = size.Values.length -1;
                            }


                            trackingData = nikeItem.trackingData.product;           //商品详情

                            colorIdIndex = color.Values.length-1;
                            colorId      = color.Values[colorIdIndex].ValueId;
                            colorName    = color.Values[colorIdIndex].Name;
                            sizeId       = size.Values[sizeIndex].ValueId;
                            sizeName     = size.Values[sizeIndex].Name;

                            //保存商品信息
                            itemInfo.Items.push({
                                "Unique":"cn.nikestore."+nikeItem.productId+":"+sizeName,
                                "Attr":[
                                    {
                                        "Nid": color.Id,
                                        "N":   color.Name,
                                        "Vid": colorId,
                                        "V":   colorName
                                    },
                                    {
                                        "Nid": size.Id,
                                        "N":   size.Name,
                                        "Vid": sizeId,
                                        "V":   sizeName
                                    }
                                ],
                                "Offers": [{
                                    "Merchant": {
                                        "Name":"nikeStore"
                                    },
                                    "List":[
                                        {
                                            "Price": trackingData.price,
                                            "Type": "RMB"
                                        }
                                    ]
                                }]
                            })
                        }
                    })
                })


                itemInfo.Variations.push(color);
                itemInfo.Variations.push(size);
                itemInfo.Md5 = md5(JSON.stringify(itemInfo))

                callback(null, itemInfo);
                return ;
            });


            //并发取数据
            nikeUrls.forEach(function (nikeUrl) {
                getHtml(nikeUrl, function(body, err){
                    if(err){
                        callback({
                            "Errors":{
                                'Code': 'Error',
                                "Message": err
                            }
                        });
                        return '';
                    }

                    //$ = cheerio.load(body);
                    //res = $('#product-data').html();
                    body = JSON.parse(body);
                    if(body.success){
                        ep.emit('nikeUrls', body.response.pdpData);
                    }else{
                        callback({
                            "Errors": {
                                'Code': 'Error',
                                "Message": 'Crawl Error'
                            }
                        });
                        return ;
                    }
                });
            })
        }else if(notFound){
            var itemInfo = {
                Unique: 'cn.nikestore.' + uniqueId,
                Md5: '',
                Status: 'outOfStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: '',
                    ShopName : '',
                    ShopId: '',
                    ImageUrl: ''
                },
                Variations: [],
                Items: []
            };

            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null ,itemInfo);
            return ;
        }else{
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'Goods Not Found'
                }
            });
            return ;
        }
    })
}


/*
 *定制内容处理
 **/
function getCustomItemInfo(urlStr, callback, res_custom){
    getHtml(urlStr, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        var $ = cheerio.load(body);
        var content = JSON.parse($('#tmpData-pdpData').html());
        var title = $('meta[name="keywords"]').attr('content');
        var price = parseFloat($('meta[property="product:price:amount"]').attr('content'));

        if(title && price){
            var itemInfo = {
                Unique: 'cn.nikestore.pid.' + content.productId,
                Md5: '',
                Status: 'inStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: title,
                    ShopName : 'NIKE官网',
                    ShopId: 'cn.nikestore',
                    ImageUrl: 'http://ugc.nikeid.com/is/image/nike/ugc/'+content.prebuildId+'.tif?$NIKE_PWP_FTWR_GRAY$&wid=500&hei=500'
                },
                Variations: [],
                Items: []
            };

            itemInfo.Items.push({
                "Unique":"cn.nikestore.pid."+content.productId,
                "Attr":[
                ],
                "Offers": [{
                    "Merchant": {
                        "Name":"nikeStore"
                    },
                    "List":[
                        {
                            "Price": price,
                            "Type": "RMB"
                        }
                    ]
                }]
            })

            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            callback(null, itemInfo);
            return ;
        }else{
            var itemInfo = {
                Unique: 'cn.nikestore.pid.' + res_custom[1],
                Md5: '',
                Status: 'outOfStock',
                Url: urlStr,
                ItemAttributes: {
                    Title: '',
                    ShopName : '',
                    ShopId: '',
                    ImageUrl: ''
                },
                Variations: [],
                Items: []
            };
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null, itemInfo);
            return ;
        }
    })
}

/*
*获取html
**/
function getHtml(urlStr, callback){

    proxyRequest({
        url: urlStr,
        gzip: true,
        headers: {
            'Cookie':'AnalysisUserId=96.7.54.84.34431484644804884; NIKE_COMMERCE_COUNTRY=CN; NIKE_COMMERCE_LANG_LOCALE=zh_CN; RES_TRACKINGID=30641592080844648; guidU=a983b9bc-511a-496f-b264-f6a1c26d81cc; neo.swimlane=47; dreams_sample=35; CONSUMERCHOICE_SESSION=t; CONSUMERCHOICE=cn/zh_cn; BVBRANDID=81a7ea19-e1f8-4872-90d0-35c747c1a33c; isGeolocCommerce=false; guidA=6f10021735440000b0bcb75822010000b3150000; geoloc=cc=HK,rc=,tp=vhigh,tz=GMT+8,la=22.28,lo=114.15,bw=2000; AMCVS_F0935E09512D2C270A490D4D%40AdobeOrg=1; guidS=4932888c-59be-4bab-f7f4-3662c7653b53; AMCV_F0935E09512D2C270A490D4D%40AdobeOrg=2121618341%7CMCIDTS%7C17228%7CMCMID%7C83669723899292217200751205782326454048%7CMCAAMLH-1489041202%7C9%7CMCAAMB-1489123725%7CNRX38WO0n5BH8Th-nqAG_A%7CMCOPTOUT-1488526125s%7CNONE%7CMCAID%7CNONE; CART_SUMMARY=%7B%22profileId%22+%3A%2215815288829%22%2C%22userType%22+%3A%22DEFAULT_USER%22%2C%22securityStatus%22+%3A%220%22%2C%22cartCount%22+%3A1%7D; utag_main=_st:1488522353054$ses_id:1488519497523%3Bexp-session; mm_wc_pmt=1; guidSTimestamp=1488518923655|1488520554953; DAPROPS="sdevicePixelRatio:2|sdeviceAspectRatio:16/10|bcookieSupport:1"; _gscu_207448657=846448111307te67; _gscs_207448657=t8851892559872a17|pv:11; _gscbrs_207448657=1; mp_nike_china_mixpanel=%7B%22distinct_id%22%3A%20%22159abba022857e-07cf164d3ebd94-1d356f53-fa000-159abba02295d4%22%7D; _qzja=1.988420334.1484644811240.1488436404193.1488518925330.1488520556472.1488520556490..0.0.30.7; _qzjb=1.1488518925329.21.0.0.0; _qzjc=1; _qzjto=21.1.0; _smt_uid=587de1cb.55ffead9; RT="sl=11&ss=1488518920611&tt=44016&obo=0&sh=1488520556242%3D11%3A0%3A44016%2C1488520115500%3D10%3A0%3A39606%2C1488520003882%3D9%3A0%3A35846%2C1488519978351%3D8%3A0%3A29117%2C1488519960928%3D7%3A0%3A25306&dm=nike.com&si=ec0f8b2a-ab27-4a2f-9226-ea33a16024c0&bcn=%2F%2F36fb61a9.mpstat.us%2F&ld=1488520556243&r=http%3A%2F%2Fstore.nike.com%2Fcn%2Fzh_cn%2Fpd%2Fair-jordan-31-%25E7%2594%25B7%25E5%25AD%2590%25E7%25AF%25AE%25E7%2590%2583%25E9%259E%258B%2Fpid-11189232%2Fpgid-11289730&ul=1488520557584"; ResonanceSegment=1; RES_SESSIONID=77274510352981588; s_pers=%20v15%3D1490938892822%7C1490938892822%3B%20s_dfa%3Dnikecomprod%7C1488522353959%3B%20c5%3Dnikecom%253Epdp%253EAIR%2520JORDAN%2520RAPTOR%7C1488523212655%3B%20c6%3Dpdp%253Astandard%7C1488523212660%3B%20c58%3Dno%2520value%7C1488523212686%3B%20ppm%3D%257B%2522name%2522%253A%2522direct%2520entry%2522%252C%2522detail%2522%253A%2522direct%2520entry%2522%252C%2522st%2522%253Anull%257D%7C1520057412700%3B; s_sess=%20c51%3Dhorizontal%3B%20s_cc%3Dtrue%3B%20tp%3D2104%3B%20s_ppv%3Dnikecom%25253Epdp%25253EAIR%252520JORDAN%252520RAPTOR%252C23%252C23%252C483%3B%20prevList2%3D%3B%20s_sq%3D%3B; ak_bmsc=30BA48D87B9F7166CA76411D2881EBF01702105D6619000009FFB8582F26CA65~ploR5kcLW91LYBrEeMTmXwZydWSumj0bS3OtTlYs1+qs7g+faT27QGdcOBbmUfCbdd858KjYJ6855bvtT4+mGetP4nOpAxAURuPsE1Jor3+rlFiFTaH9NIXaZ0OpS/IZITikL1q0+rJ5CelzbDsFqlUC2Pi7HlTTmSyVH8HoUNLeA/dUmi5uXIH/uRN5ogmF8D3cCfqiindcTjsn8IZhWBnA==; nike_locale=cn/zh_cn',
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch, gzip",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            'Referer':'http://www.nike.com/cn/zh_cn/c/men',
            "Pragma":"no-cache"
         }
        //encoding: null
    }, function(error, response, body, callbackStatus) {
        //如果是限制ip了就返回false
        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0 || body.indexOf("Sorry, this item isn't available") > 0) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body){
        callback(body, error);
    })
}