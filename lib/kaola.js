var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');
var eventproxy = require('eventproxy');
var Q            = require('q');
// var proxyRequest = require('./proxyRequest2');
var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'www.kaola.com' || urlInfo.host == 'www.kaola.com.hk' || urlInfo.host == 'goods.kaola.com' ){
        var patt = /product\/([0-9]+)\.html/ig;
        result = patt.exec(urlInfo.path);
        if (!result) {
            return  callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'url error no math goods id'
                }
            });
        }

        (async ()=>{
            try {
                var goods_id =  result[1];
                // var api_url = 'http://m.kaola.com/product/'+goods_id+'.html';
                // var api_url = 'https://goods.kaola.com/product/getPcGoodsDetailDynamic.json?goodsId=' + goods_id
                var api_url = 'https://m-goods.kaola.com/product/getWapGoodsDetailDynamic.json?goodsId=' + goods_id + '&provinceCode=120000'
                //  统一默认调取上海地区，根据上海地区有货没货判定商品是否下家状态
                var body = await getHtml(api_url);

                getItemInfo({body : body, goods_id : goods_id, url:urlStr} , callback);

            } catch (e){
                return callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": e.message
                    }
                });
            }
        })()
    }else{
        return callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'url error'
            }
        });
    }
}

/*
 *内容处理
 **/
async function getItemInfo(params, callback) {
    try {
        var goods_id = params.goods_id,
            body     = params.body,
            url      = params.url;

        body = JSON.parse(body);
        var itemInfo = {
            Unique: 'cn.kaola.' + goods_id,
            Md5: '',
            Status: 'inStock',
            Url: url,
            ItemAttributes: {
                // Title: res.goods.title,
                ShopName : '考拉海购',
                ShopId: 'cn.kaola',
                // ImageUrl: res.goods.imageUrl,
                // VenderType : res2.selfGoods ? '自营' : '普通'
                // 添加调取包税接口数据
                // categoryId: res.goods.categoryIdList,
            },
            Variations: [],
            Items: [],
            Coupon:''
        };
        // 商品消失
        if(!body.data){
            itemInfo.Status = 'notFind';
            return callback(null, itemInfo);
        }
        // 商品缺货
        var goodsStoreStatus = body.data.goodsStoreStatus;
        //return callback(null, body);
        if(!goodsStoreStatus){
            itemInfo.Status = 'outOfStock';
            return callback(null, itemInfo);
        }
        // 获取详细sku信息
        var skuDetailList = body.data.skuDetailList
        //获取sku分类
        var skus = skuDetailList[0].skuInfo.skuPropertyList
        skus.forEach(function (skuitem) {
            var skuitems = {
                Id: skuitem.propertyNameId,
                Name: skuitem.propertyName,
                Values: []
            }
            itemInfo.Variations.push(skuitems);
        })
        skuDetailList.forEach(function (skuDetail, index) {
            var item = {}
            var attrs = []
            var attrItem  = skuDetail.skuInfo.skuPropertyList
            var variations = itemInfo.Variations
            // variations.forEach(function (variation, index) {
            //     var propertyNameId = attrItem[index].propertyNameId
            //     var val = {
            //         ValueId : attrItem[index].propertyValueId,
            //         Name : attrItem[index].propertyValue,
            //         ImageUrls: attrItem[index].imageUrl
            //     }
            //     if(variation.Id  == propertyNameId){
            //         variation.Values.push(val)
            //     }
            //     // variation.Values.push(val)
            // })

            for(var i = 0; i<variations.length; i++){
                var propertyNameId = attrItem[i].propertyNameId
                var val = {
                    ValueId : attrItem[i].propertyValueId,
                    Name : attrItem[i].propertyValue,
                    ImageUrls: attrItem[i].imageUrl
                }
                if(variations[i].Id  == propertyNameId){
                    variations[i].Values.push(val)
                }
                // 特殊情况做处理
                if(attrItem[i+1] && variations[i].Id  == attrItem[i+1].propertyNameId){
                    variations[i].Values.push({
                        ValueId : attrItem[i+1].propertyValueId,
                        Name : attrItem[i+1].propertyValue,
                        ImageUrls: attrItem[i+1].imageUrl
                    })
                }
                if(attrItem[i-1] && variations[i].Id  == attrItem[i-1].propertyNameId){
                    variations[i].Values.push({
                        ValueId : attrItem[i-1].propertyValueId,
                        Name : attrItem[i-1].propertyValue,
                        ImageUrls: attrItem[i-1].imageUrl
                    })
                }
            }

            attrItem.forEach(function (attr) {
                var item = {}
                item.Nid = attr.propertyNameId
                item.N = attr.propertyName
                item.Vid = attr.propertyValueId
                item.V = attr.propertyValue
                attrs.push(item)
            })
            item.Unique = skuDetail.skuInfo.skuId;
            item.Attr   = attrs;
            var vipGoodsDiscountInfo = body.data.vipGoodsDiscountInfo
            if(vipGoodsDiscountInfo != undefined){
                var vip = vipGoodsDiscountInfo.vipGoodsDiscountContent
            }else{
                var vip = ''
            }
            item.Offers = [{
                "Merchant": {
                    "Name":"kaola"
                },
                "List":[
                    {
                        "Price": skuDetail.skuPrice.currentPrice,
                        "Type": "RMB"
                    }
                ],
                // 促销信息
                "Subtitle": vip
            }];
            //判断sku是否有货
            var  currentStore = skuDetail.skuStore.currentStore
            if(currentStore != 0 && currentStore != '0'){
                itemInfo.Items.push(item);
            }
        })
        // Variations去重
        var Variations = itemInfo.Variations
        Variations.forEach(function (Variation, index) {
            var Values = Variations[index].Values
            var newValues = []
            for(var i=0;i<Values.length;i++){
                var flag = true;
                for(var j=0;j<newValues.length;j++){
                    if(Values[i].ValueId == newValues[j].ValueId){
                        flag = false;
                    };
                };
                if(flag){
                    newValues.push(Values[i]);
                };
            };
            itemInfo.Variations[index].Values = newValues
        })

        //上架
        if (itemInfo.Status == 'inStock') {
            //优惠券部分
            var couponList = body.data.goodsCouponList
            itemInfo.Coupon = {"List": []};
            if (couponList) {
                couponList.forEach(function (coupon) {
                    var time = coupon.couponUseTime.trim()
                    if(time.indexOf("自领取日开始") > -1){
                        var day = time.replace(/自领取日开始/g, "").replace(/天有效/g, "");
                        var now = new Date();
                        var year = now.getFullYear(); //得到年份
                        var month = now.getMonth();//得到月份
                        var date = now.getDate();//得到日期
                        var newdata = (parseInt(date) + parseInt(day)-parseInt(1))
                        if(newdata > 30){
                            month = parseInt(month) + parseInt(1)
                        }
                        if(month > 12){
                            year = parseInt(year) + parseInt(1)
                        }
                        if (month < 10) month = "0" + month;
                        if (date < 10) date = "0" + date;
                        if (newdata < 10) newdata = "0" + newdata;
                        startDate = year+'-'+month+'-'+date+" 00:00:00";
                        endDate = year+'-'+month+'-'+newdata+" 23:59:59";
                    }else{
                        var zz = JSON.stringify(time);
                        var aa = zz.replace(/-/, '""')
                        var regexp = /"([\s\S]*?)""([\s\S]*?)"/ig;
                        var result = regexp.exec(aa);
                        var startDate = result[1].replace(/\./g, '-') + " 00:00:00"
                        var endDate = result[2].replace(/\./g, '-') + " 23:59:59"
                    }
                    // var zz = JSON.stringify(time);
                    // var aa = zz.replace(/-/, '""')
                    // var regexp = /"([\s\S]*?)""([\s\S]*?)"/ig;
                    // var startDate = result[1].replace(/\./g, '-') + " 00:00:00"
                    // var endDate = result[2].replace(/\./g, '-') + " 23:59:59"
                    itemInfo.Coupon.List.push({
                        "Id":coupon.redeemCode,
                        "Amount":[coupon.amount, coupon.threshold],
                        "Date":[startDate,endDate],
                        "Category": "normal",
                        "Type": "item"
                    });
                })
            }

            //获取店铺名称和是否自营标签
            var bodyHtml = await getHtml("https://goods.kaola.com/product/"+goods_id+".html")

            var exp = /window.(__kaolaHeadData = [\s\S]*?)\<\/script>/ig;
            var res = exp.exec(bodyHtml);

            eval(res[1]);
            res = __kaolaHeadData;
            if (res.goodsShopInfo){
                itemInfo.ItemAttributes.ShopId += '.'+res.goodsShopInfo.shopId;
                itemInfo.ItemAttributes.ShopName = res.goodsShopInfo.shopName;
            }
            itemInfo.ItemAttributes.Title = res.goodsInfoBase.title
            itemInfo.ItemAttributes.ImageUrl = res.goodsInfoBase.imageUrl
            itemInfo.ItemAttributes.VenderType = res.goodsInfoBase.selfGoods ? '自营' : '普通'

            //税费
            var getPcGoodsDetailDynamicBody = await getHtml('https://goods.kaola.com/product/getPcGoodsDetailDynamic.json?provinceCode=310000&goodsId=' + goods_id);
            getPcGoodsDetailDynamicBodys = JSON.parse(getPcGoodsDetailDynamicBody);
            if (!getPcGoodsDetailDynamicBodys.data.skuTaxInfoPc) {
                //测试多个得出没有税费的为下架商品
                itemInfo.Status = 'outOfStock';
            } else {
                var tax =  getPcGoodsDetailDynamicBodys.data.skuTaxInfoPc.taxAmount;
                if(tax !=undefined && tax != ''){
                    itemInfo.ItemAttributes.Tax = 1.112
                }else{
                    itemInfo.ItemAttributes.Tax = 1
                }
            }
        }

        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        return callback(null, itemInfo);
    } catch (e) {
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": e.message
            }
        });
    }
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
                timeout: 5000,
                //pool: false,
                headers: {
                    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
                    "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    "Accept-Encoding":"deflate, sdch",
                    "Accept-Language":"zh-CN,zh;q=0.8",
                    "Cache-Control":"no-cache",
                    "Connection":"keep-alive",
                    "Pragma":"no-cache"
                }
            };
            proxyRequest(options, function (err, response, body) {
                ep.emit('getHtml', {
                    err : err,
                    body : body,
                });
            })
        })
    })
}
