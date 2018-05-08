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
            callback({
                "Errors":{
                    'Code': 'Fatal',
                    "Message": 'url error no math goods id'
                }
            });
            return ;
        }
        var goods_id =  result[1];
        // var api_url = 'http://m.kaola.com/product/'+goods_id+'.html';
        // var api_url = 'https://goods.kaola.com/product/getPcGoodsDetailDynamic.json?goodsId=' + goods_id
        var api_url = 'https://m-goods.kaola.com/product/getWapGoodsDetailDynamic.json?goodsId=' + goods_id
        getHtml(api_url, function(body, err, response){
            if(err){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return ;
            }
            if(body){
                getItemInfo({body : body, goods_id : goods_id, url:urlStr} , callback);
            }else{
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": 'body null or status code not equal 200'
                    }
                });
                return ;
            }
        })
    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'url error'
            }
        });
        return ;
    }
}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var goods_id = params.goods_id,
        body     = params.body,
        url      = params.url;
    try{
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
            variations.forEach(function (variation, index) {
                var val = {
                    ValueId : attrItem[index].propertyValueId,
                    Name : attrItem[index].propertyValue,
                    ImageUrls: attrItem[index].imageUrl
                }
                variation.Values.push(val)
            })
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

        //优惠券部分
        var couponList = body.data.goodsCouponList
        itemInfo.Coupon = {"List": []};
        couponList.forEach(function (coupon) {
            var time = coupon.couponUseTime.trim()
            var zz = JSON.stringify(time);
            var aa = zz.replace(/-/, '""')
            var regexp = /"([\s\S]*?)""([\s\S]*?)"/ig;
            result = regexp.exec(aa);
            var startDate = result[1].replace(/\./g, '-') + " 00:00:00"
            var endDate = result[2].replace(/\./g, '-') + " 23:59:59"
            itemInfo.Coupon.List.push({
                "Id":coupon.redeemCode,
                "Amount":[coupon.amount, coupon.threshold],
                "Date":[startDate,endDate],
                "Category": "normal"
            });
        })

        // 数据返回添加限制
        var ep = new eventproxy();
        var ep_length = 2;
        ep.after('info', ep_length, function (info) {
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
            callback(null, itemInfo);
            return ;
        })
        //获取店铺名称和是否自营标签
        getHtml("https://www.kaola.com/product/"+goods_id+".html", function(body, err){
            if(err){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return '';
            }
            try{
                // var exp = /f-toe*title="(.*)".*href="http:\/\/mall.kaola.com\/(\d+)"/ig;
                var exp = /window.(__kaolaHeadData = [\s\S]*?)\<\/script>/ig;
                var res = exp.exec(body);
                try {
                    eval(res[1]);
                } catch (exception) {
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": exception
                        }
                    });
                    return ;
                }
                res = __kaolaHeadData;
                if (res.goodsShopInfo){
                    itemInfo.ItemAttributes.ShopId += '.'+res.goodsShopInfo.shopId;
                    itemInfo.ItemAttributes.ShopName = res.goodsShopInfo.shopName;
                }
                itemInfo.ItemAttributes.Title = res.goodsInfoBase.title
                itemInfo.ItemAttributes.ImageUrl = res.goodsInfoBase.imageUrl
                itemInfo.ItemAttributes.VenderType = res.goodsInfoBase.selfGoods ? '自营' : '普通'
            }catch(e){
                callback('获取店铺id和名称有误 '+ e.message);
                return '';
            }
            ep.emit('info', []);
        });
        //税费
        getHtml('https://goods.kaola.com/product/getPcGoodsDetailDynamic.json?goodsId=' + goods_id, function(body, err){
            if(err){
                callback({
                    "Errors":{
                        'Code': 'Error',
                        "Message": err
                    }
                });
                return '';
            }
            bodys = JSON.parse(body);
            var tax = bodys.data.skuTaxInfoPc.taxAmount;
            if(tax !=undefined && tax != ''){
                itemInfo.ItemAttributes.Tax = 1.112
            }else{
                itemInfo.ItemAttributes.Tax = 1
            }
            ep.emit('info', []);
        });


    } catch (exception) {
        callback({
            "Errors": {
                'Code': 'Error',
                "Message": exception.message
            }
        });
        return '';
    }
}

function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache"
        }
    }, function(error, response, body) {
        callback(body, error);
    })
 }