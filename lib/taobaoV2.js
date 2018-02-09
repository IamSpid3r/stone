var request = require('request');
var _ = require('lodash');
var fs = require('fs');
var url = require('url');
var iconv = require('iconv-lite');
var md5 = require('md5');

var filterId = [];
var filterCategoryId = ['50012031', '50012043', '50012036', '50012038', '50012064', '50019272'] //鞋类分类
var taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true);
    var urlInfo = url.parse(urlStr, true);
    if (['item.taobao.com', 'detail.tmall.com', 'detail.tmall.hk', 'chaoshi.detail.tmall.com', 'world.tmall.com'].indexOf(urlInfo.host) != -1
        && ['/item.htm', '/hk/item.htm'].indexOf(urlInfo.pathname) != -1
        && urlInfo.query.id
    ) {
        return getItemInfo(urlInfo, callback);
    } else {
        return callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'host error is not taobao hostname'
            }
        });
    }
}


function getItemInfo(urlInfo, callback) {
    var api = 'mtop.taobao.detail.getdetail';
    var version = '6.0';
    var params = {
        "api" : api,
        'v' : version,
        'jsv': '2.4.8',
        'H5Request' : true,
        'AntiCreep' : true,
        'AntiFlood' : true,
        'isSec' : 0,
        "ecode" : 0,
        "ttid" : "2016@taobao_h5_2.0.0",
        "data" : {"itemNumId" : urlInfo.query.id},
    };

    var cookiePath = 'cookieV2.txt';
    taobaoToken(params , cookiePath, function (body, err) {
        if (err) {
            callback(err)
            return;
        }
        responseFirstJson = body;
        // console.log(responseFirstJson.data.apiStack[0].value)
        // callback(null, body);
        // return;
        if ('trade' in responseFirstJson.data && 'redirectUrl' in responseFirstJson.data.trade) {
            var itemInfo = {
                Unique: 'cn.taobao.' + urlInfo.query.id,
                Md5: '',
                Status: 'notFind',
                Url: 'https://item.taobao.com/item.htm?id=' + urlInfo.query.id,
                ItemAttributes: {
                    Title: '',
                    ShopName: '',
                    ShopId: '',
                    ImageUrl: '',
                    ImageUrls: [],
                },
                Variations: [],
                Items: []
            };
            callback(null, itemInfo);
            return;
        }

        var itemInfo = {
            Unique: 'cn.taobao.' + urlInfo.query.id,
            Md5: '',
            Status: 'inStock',
            Url: (responseFirstJson.data.seller.sellerType == 'B' ? 'https://detail.tmall.com/item.htm?id=' + urlInfo.query.id : 'https://item.taobao.com/item.htm?id=' + urlInfo.query.id),
            ItemAttributes: {
                Title: responseFirstJson.data.item.title,
                ShopName: responseFirstJson.data.seller.shopName,
                ShopId: typeof responseFirstJson.data.seller.shopId != 'undefined' ? 'cn.taobao.' + responseFirstJson.data.seller.shopId : null,
                ImageUrl: 'http:'+responseFirstJson.data.item.images[0],
                ImageUrls: responseFirstJson.data.item.images.map(function (val) {
                    return 'http:'+val;
                }),
                CategoryId: typeof responseFirstJson.data.item.categoryId != 'undefined' ? responseFirstJson.data.item.categoryId : null,
                StageInfo: '',
            },
            Variations: [],
            Items: []
        };
        // 税费部分判断
        var text = JSON.parse(responseFirstJson.data.apiStack[0].value);
        try{
            var taxText = text.vertical.inter.taxDesc[0].商品进口税
            for(var i in taxText){
            if (taxText.hasOwnProperty(i)) { //filter,只输出man的私有属性
                if(i.indexOf('预计') != -1){
                    itemInfo.ItemAttributes.Tax = '1.119'
                }else{
                    itemInfo.ItemAttributes.Tax = '1'
                }
            };
        }
        }catch (e){
            itemInfo.ItemAttributes.Tax = '1'
        }
        var apiStackValue = JSON.parse(responseFirstJson.data.apiStack[0].value);
        // callback(null, apiStackValue);
        // return;
        if ('hintBanner' in apiStackValue.trade && 'text' in apiStackValue.trade.hintBanner) {
            if (
                apiStackValue.trade.hintBanner.text.indexOf('下架') != -1
                || apiStackValue.trade.hintBanner.text.indexOf('卖光') != -1
            ) {
                itemInfo.Status = 'outOfStock';
            }
        }

        //有sku
        if(typeof responseFirstJson.data.skuBase.props != 'undefined'){
            for (var i = 0; i <= responseFirstJson.data.skuBase.props.length - 1; i++) {
                var variation = {
                    'Id': responseFirstJson.data.skuBase.props[i].pid,
                    'Name': getVariationsName(responseFirstJson.data.skuBase.props[i].name),
                    'Values': []
                };
                for (var j = 0; j <= responseFirstJson.data.skuBase.props[i].values.length - 1; j++) {
                    if ("image" in responseFirstJson.data.skuBase.props[i].values[j]) {
                        variation.Values.push({
                            'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                            'Name': responseFirstJson.data.skuBase.props[i].values[j].name,
                            'ImageUrls': [ 'http:'+responseFirstJson.data.skuBase.props[i].values[j].image]
                        })
                    } else {
                        if(responseFirstJson.data.skuBase.props[i].name == '颜色分类'){
                            variation.Values.push({
                                'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                                'Name': responseFirstJson.data.skuBase.props[i].values[j].name,
                                'ImageUrls': responseFirstJson.data.item.images.map(function (val) {
                                    return 'http:'+val;
                                })
                            })
                        }else{
                            variation.Values.push({
                                'ValueId': responseFirstJson.data.skuBase.props[i].values[j].vid,
                                'Name': responseFirstJson.data.skuBase.props[i].values[j].name
                            })
                        }
                    }
                };
                itemInfo.Variations.push(variation);
            };

            for (i in responseFirstJson.data.skuBase.skus) {
                //var isFilter = false;
                var item = {
                    Unique: 'cn.taobao.' + responseFirstJson.data.skuBase.skus[i].skuId,
                    Attr: [],
                    Offers: []
                }
                var itemKey = responseFirstJson.data.skuBase.skus[i].propPath;
                var itemAttrs = itemKey.split(';');
                for (var j = 0; j < itemAttrs.length; j++) {
                    var attrInfo = itemAttrs[j].split(':');
                    // attrInfo [20549,28391]
                    var a = _.findIndex(responseFirstJson.data.skuBase.props, {
                        'pid': attrInfo[0]
                    })
                    var b = _.findIndex(responseFirstJson.data.skuBase.props[a].values, {
                        'vid': attrInfo[1]
                    });

                    item.Attr.push({
                        'Nid': responseFirstJson.data.skuBase.props[a].pid,
                        'N': getVariationsName(responseFirstJson.data.skuBase.props[a].name),
                        'Vid': responseFirstJson.data.skuBase.props[a].values[b].vid,
                        'V': responseFirstJson.data.skuBase.props[a].values[b].name
                    })
                }

                price = parseFloat(apiStackValue.skuCore.sku2info[0].price.priceText);

                var skuId = responseFirstJson.data.skuBase.skus[i].skuId;
                if(!apiStackValue.skuCore.hasOwnProperty('sku2info')
                    ||  !apiStackValue.skuCore.sku2info.hasOwnProperty(skuId)
                    ||  Number(apiStackValue.skuCore.sku2info[skuId].quantity) <= 0
                ){
                    continue;
                }
                if(skuId in apiStackValue.skuCore.sku2info){
                    price = parseFloat(apiStackValue.skuCore.sku2info[skuId].price.priceText);
                }


                var offer = {
                    Merchant: {
                        Name: '淘宝',
                    },
                    List: [{
                        Price: price,
                        Type: 'RMB'
                    }]
                };
                item.Offers.push(offer)
                itemInfo.Items.push(item);
            };
        }else{
            var item = {
                Unique: 'cn.taobao.' + urlInfo.query.id,
                Attr: [],
                Offers: []
            }



            var offer = {
                Merchant: {
                    Name: '淘宝',
                },
                List: [{
                    Price: parseFloat(apiStackValue.skuCore.sku2info[0].price.priceText),
                    Type: 'RMB'
                }]
            };
            item.Offers.push(offer)
            itemInfo.Items.push(item);
        }


        //分期
        if('skuVertical' in apiStackValue && 'installment' in apiStackValue.skuVertical){
            itemInfo.ItemAttributes.StageInfo = apiStackValue.skuVertical.installment.title
        }

        if(itemInfo.Items.length == 0){
            itemInfo.Status = 'outOfStock';
        }
        itemInfo.Md5 = md5(JSON.stringify(itemInfo))
        callback(null, itemInfo);
        return;

    })
}

var getVariationsName = function(name){
   return (name == '颜色分类' || name == 'color' || name == '主要颜色') ? '颜色' : ((name == '尺寸'  || name == '鞋码' || name == 'size') ? '尺码' : name);
}

//过滤鞋类尺寸没有数字的尺寸
var filterWord = function (categoryId, text) {
    if(filterCategoryId.indexOf(categoryId) != -1){
        var reg = /\d{2,}/gi;
        return !reg.exec(text);
    }else{
        return false;
    }
};

//兼容老图片 获取老图片地址
var  getOldImgpath = function (imgPath) {
    var regexp = /img\.alicdn\.com\/imgextra\/i(\d{1,})\/(.*)/ig;
    var res = regexp.exec(imgPath);

    if(res){
        var oldPath = 'http://gd'+res[1]+'.alicdn.com/bao/uploaded/i'+res[1]+'/'+res[2];
        return oldPath;
    }
    return imgPath;
}