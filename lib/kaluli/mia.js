var request = require('request');
var url = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var proxyRequest = require('../proxyRequest').proxyRequest;
var Q = require('q');

var eventproxy = require('eventproxy')

exports.getInfo = function (urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if (urlInfo.host == 'www.mia.com' || urlInfo.host == 'www.miyabaobei.hk') {

        var exp = /item-(\d*)\.html/ig;
        var res = exp.exec(urlInfo.path);
        var pid = res[1];
        getHtml(urlStr, function (body, err, response) {
            if (err) {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return;
            }
            if (body && response.statusCode == 200) {
                if (!body) {
                    var notFoundReg = /404-找不到页面/ig;
                    if (notFoundReg.exec(body)) {//not found
                        var itemInfo = {
                            Unique: 'cn.mia.' + pid,
                            Md5: '',
                            Status: 'notFind',
                            Url: urlStr,
                            ItemAttributes: {},
                            Variations: [],
                            Items: []
                        };
                        callback(null, itemInfo);
                        return;
                    } else {// regexp error
                        callback({
                            "Errors": {
                                'Code': 'Error',
                                "Message": 'goods not found'
                            }
                        });
                        return;
                    }
                }
                ;
                // 原逻辑获取标题等信息
                var exps = /NTKF_PARAM = ([\s\S]*?);/ig;
                var json = exps.exec(body);
                try {
                    var jsonData = 'var ' + json[0].replace('getcookie(\'sid\')', '0').replace('getcookie(\'usernames\')', '0').replace('getcookie(\'miauid\')', '0');
                    eval(jsonData);
                } catch (exception) {
                    callback({
                        "Errors": {
                            'Code': 'Error',
                            "Message": exception
                        }
                    });
                    return;
                }
                var data = NTKF_PARAM;
                // var price = data.ntalkerparam.item.siteprice;价格获取不对
                var title = data.ntalkerparam.item.name;
                var src = data.ntalkerparam.item.imageurl;
                // 将页面dom化
                // 先设计好返回的底层模板
                var itemInfo = {
                    Unique: 'cn.mia.' + pid,
                    Md5: '',
                    Status: 'inStock',
                    Url: urlStr,
                    ItemAttributes: {
                        Title: title,
                        ShopName: '蜜芽',
                        ShopId: 'www.mia.com',
                        ImageUrl: src,
                        Tax: '1'
                    },
                    Variations: [],
                    Items: []
                };

                var $ = cheerio.load(body);
                var jks = $('.jks').text();
                if (!jks) {  // console.log('无税费')
                } else {
                    itemInfo.ItemAttributes.Tax = 1.119
                }
                // 税费判断结束
                //讲商品关联ID存储起来
                var Ids = [];
                var skuTitle = [];
                $('.color').each(function () {
                    if ($(this).hasClass('new_gg')) {
                        // console.log('此color为无效数据')
                    } else {
                        var skuListOneNam = $(this).find('.color_name').text();
                        var skuListOne = {}
                        skuListOne.Id = '1'
                        skuListOne.Name = skuListOneNam
                        skuListOne.Values = []
                        $(this).find('li').each(function () {
                            // 获取到第一层的颜色
                            var Idarea = $(this).find('a').attr('href')
                            var skutitle = $(this).find('a').attr('title')
                            var expId = /item-(\d*)\.html/ig;
                            var Idres = expId.exec(Idarea);
                            if (Idres !== null) {
                                var id = Idres[1]
                            } else {
                                var id = pid
                            }
                            var skuListOneItem = {}
                            skuListOneItem.ValueId = id
                            skuListOneItem.Name = skutitle
                            skuListOne.Values.push(skuListOneItem)
                            // getTwoSku(pid,itemInfo)
                            Ids.push(id);
                            skuTitle.push(skutitle)
                        })
                        itemInfo.Variations.push(skuListOne)
                    }
                });

                getTwoSku(pid, itemInfo).then(function () {
                    var skuOne = itemInfo.Variations[0];    //第一层Sku
                    var skuTwo = itemInfo.Variations[1];    //第二层Sku
                    var skuOneLength = skuOne.Values.length
                    if(skuTwo == undefined){
                        // console.log('没有二层sku数据')
                        var skuTwoLength = '1'
                    }else{
                        var skuTwoLength = skuTwo.Values.length
                    }
                    getAllPrice(Ids, itemInfo, skuTitle, skuOneLength, skuTwoLength).then(function () {
                        // 数据加密
                        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
                        callback(null, itemInfo);
                        return;
                    })
                })
                return;
            } else {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": 'body null or status code not equal 200'
                    }
                });
                return;
            }
        })
    } else {
        callback({
            "Errors": {
                'Code': 'Fatal',
                "Message": 'url error'
            }
        });
        return;
    }
};

function getAllPrice(Ids, itemInfo, skuTitle, skuOneLength, skuTwoLength) {
    var ep = new eventproxy();
    ep.after('getUrls', skuOneLength*skuTwoLength, function () {
        return defer.resolve({itemInfo});
    })

    var defer = Q.defer();
    Ids.forEach(function (Id, index) {
        getHtml('https://p.mia.com/item/base/' + Id, function (body, err, response) {
            if (!err && body && response.statusCode == 200) {
                try {
                    var bodys = JSON.parse(body);
                    var z = bodys.i_s
                    var skuTwoVid = '0'
                    for (var i in z) {
                        skuTwoVid ++
                        if (z.hasOwnProperty(i)) { //filter,只输出man的私有属性
                            var item = {};
                            item.Unique = 'cn.mia.' + Id
                            if (i == 'SINGLE') {
                                item.Attr = [{
                                    "Nid": '1',
                                    "N": '规格',
                                    "Vid": Id,
                                    "V": skuTitle[index],
                                }]
                            } else {
                                item.Attr = [{
                                    "Nid": '1',
                                    "N": '可选',
                                    "Vid": Id,
                                    "V": skuTitle[index],
                                }, {
                                    "Nid": '2',
                                    "N": '规格',
                                    "Vid": skuTwoVid,
                                    "V": i,
                                }]
                            }
                            try {
                                // 参加团购的获取团购价
                                var price = bodys.g_l[0].gp
                                item.Offers = [{
                                    "Merchant": {
                                        "Name": "mia"
                                    },
                                    "List": [
                                        {
                                            "Price": price,
                                            "Type": "RMB"
                                        }
                                    ]
                                }]
                                itemInfo.Items.push(item)
                                ep.emit('getUrls', {});
                            } catch (e) {
                                // 不参加团购的，获取原价
                                item.Offers = [{
                                    "Merchant": {
                                        "Name": "mia"
                                    },
                                    "List": [
                                        {
                                            "Price": bodys.sp,
                                            "Type": "RMB"
                                        }
                                    ]
                                }]
                                itemInfo.Items.push(item)
                                ep.emit('getUrls', {});
                            }
                        }
                    }
                } catch (e) {
                }
            } else {
                callback({
                    "Errors": {
                        'Code': 'Error',
                        "Message": 'body null or status code not equal 200'
                    }
                });
                return;
            }
            // return defer.resolve({itemInfo});
        })
    })
    return defer.promise;
}


function getTwoSku(shopId, itemInfo) {
    var defer = Q.defer();
    getHtml('https://p.mia.com/item/base/' + shopId, function (body, err, response) {
        if (!err && body && response.statusCode == 200) {
            try {
                var bodys = JSON.parse(body);
                var skuListTwo = {};//添加到Varitations部分
                skuListTwo.Id = '2'
                skuListTwo.Name = '规格'
                skuListTwo.Values = []
                var z = bodys.i_s

                var skuTwoVid = 0
                for (var i in z) {
                    skuTwoVid ++
                    if (z.hasOwnProperty(i)) { //filter,只输出man的私有属性
                        // console.log(i,":",z[i]);
                        var skuListTwoItem = {}
                        skuListTwoItem.ValueId = skuTwoVid
                        skuListTwoItem.Name = i
                        // console.log(skuListTwoItem)//判断是否为单规格
                        skuListTwo.Values.push(skuListTwoItem)
                    }
                    ;
                }
                if (skuListTwoItem.Name != 'SINGLE') {
                    itemInfo.Variations.push(skuListTwo)
                }
            } catch (e) {
            }

        } else {
            callback({
                "Errors": {
                    'Code': 'Error',
                    "Message": 'body null or status code not equal 200'
                }
            });
            return;
        }
        return defer.resolve({itemInfo});
    })
    return defer.promise;
}


/*
 *获取html
 **/
function getHtml(urlStr, callback) {
    proxyRequest({
        url: urlStr,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Language": "zh-CN,zh;q=0.8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Pragma": "no-cache",
            // jsonp格式
            "dataType": "jsonp",
            "jsonp": "callback",
        }
    }, function (error, response, body, callbackStatus) {
        if (!error) {
            if (body.indexOf('Please retry your requests at a slower rate') > 0) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        } else {
            callbackStatus(false)
        }
    }, function (error, response, body) {
        callback(body, error, response);
    })
}

