var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy');
var Q = require('q');
var fun = require('./fun');

//[{"method":"ProductRpc.getWakeupBar","params":{"page":"product-0-426169340.html","query":""},"hash":"0991c4b2","id":1519715791866,"jsonrpc":"2.0"},{"method":"getAppDownload","params":{"page":"product-0-426169340.html","query":""},"hash":"efbbd076","id":1519715791867,"jsonrpc":"2.0"},{"method":"getCoupon","params":{"page":"product-0-426169340.html","query":""},"hash":"c9d6a95f","id":1519715791868,"jsonrpc":"2.0"},{"method":"getGift","params":{"page":"product-0-426169340.html","query":""},"hash":"bf75665d","id":1519715791869,"jsonrpc":"2.0"},{"method":"getFooterToolbar","params":{"page":"product-0-426169340.html","query":""},"hash":"ebc60d6e","id":1519715791870,"jsonrpc":"2.0"},{"method":"getFooter","params":{"page":"product-0-426169340.html","query":""},"hash":"38583a7e","id":1519715791871,"jsonrpc":"2.0"},{"method":"getWeixinUserBehavior","params":{"page":"product-0-426169340.html","query":""},"hash":"bd228e37","id":1519715791872,"jsonrpc":"2.0"},{"method":"getRecommendAddress","params":{"page":"product-0-426169340.html","query":""},"hash":"f6c28986","id":1519715791873,"jsonrpc":"2.0"},{"method":"getProductSlide","params":{"page":"product-0-426169340.html","query":""},"hash":"e6702b06","id":1519715791874,"jsonrpc":"2.0"},{"method":"getProductMeta","params":{"page":"product-0-426169340.html","query":""},"hash":"8f6a2300","id":1519715791875,"jsonrpc":"2.0"},{"method":"getProductMultiColor","params":{"page":"product-0-426169340.html","query":""},"hash":"3ad70a5b","id":1519715791876,"jsonrpc":"2.0"},{"method":"getProductSize","params":{"page":"product-0-426169340.html","query":""},"hash":"f5e5057b","id":1519715791877,"jsonrpc":"2.0"},{"method":"getProductServiceText","params":{"page":"product-0-426169340.html","query":""},"hash":"9f6a671f","id":1519715791878,"jsonrpc":"2.0"},{"method":"getProductTips","params":{"page":"product-0-426169340.html","query":""},"hash":"581f9a09","id":1519715791879,"jsonrpc":"2.0"},{"method":"getRefer","params":{"page":"product-0-426169340.html","query":""},"hash":"79625b15","id":1519715791880,"jsonrpc":"2.0"},{"method":"getProductCountdown","params":{"page":"product-0-426169340.html","query":""},"hash":"8c108932","id":1519715791881,"jsonrpc":"2.0"},{"method":"getIndependentAmount","params":{"page":"product-0-426169340.html","query":""},"hash":"8b9d3b2b","id":1519715791882,"jsonrpc":"2.0"},{"method":"getShowComment","params":{"page":"product-0-426169340.html","query":""},"hash":"13c36447","id":1519715791883,"jsonrpc":"2.0"},{"method":"ProductRpc.getProductLicense","params":{"page":"product-0-426169340.html","query":""},"hash":"13af4c6b","id":1519715791884,"jsonrpc":"2.0"},{"method":"ProductRpc.getProductAttr","params":{"page":"product-0-426169340.html","query":""},"hash":"51670937","id":1519715791885,"jsonrpc":"2.0"},{"method":"ProductRpc.getProductExtra","params":{"page":"product-0-426169340.html","query":""},"hash":"f7492c0a","id":1519715791886,"jsonrpc":"2.0"},{"method":"ProductRpc.getProductPresell","params":{"page":"product-0-426169340.html","query":""},"hash":"3f44a55e","id":1519715791887,"jsonrpc":"2.0"},{"method":"ProductRpc.getProductPriceLine","params":{"page":"product-0-426169340.html","query":""},"hash":"f1d8df4b","id":1519715791888,"jsonrpc":"2.0"},{"method":"ProductRpc.getProductDetailImg","params":{"page":"product-0-426169340.html","query":""},"hash":"b39eb727","id":1519715791889,"jsonrpc":"2.0"},{"method":"ProductRpc.getAddCartData","params":{"page":"product-0-426169340.html","query":""},"hash":"32abeeb6","id":1519715791890,"jsonrpc":"2.0"},{"method":"getVTM","params":{"page":"product-0-426169340.html","query":""},"hash":"e9f066a4","id":1519715791891,"jsonrpc":"2.0"},{"method":"getBrowserHistory","params":{"page":"product-0-426169340.html","query":""},"hash":"3c5d8660","id":1519715791892,"jsonrpc":"2.0"},{"method":"getWxShare","params":{"page":"product-0-426169340.html","query":""},"hash":"b64ca4ad","id":1519715791893,"jsonrpc":"2.0"},{"method":"getShare","params":{"page":"product-0-426169340.html","query":""},"hash":"615623b0","id":1519715791894,"jsonrpc":"2.0"},{"method":"getProductPreheatCollect","params":{"page":"product-0-426169340.html","query":""},"hash":"28fc0229","id":1519715791895,"jsonrpc":"2.0"},{"method":"getAppWakeup","params":{"page":"product-0-426169340.html","query":""},"hash":"3dac0a1c","id":1519715791896,"jsonrpc":"2.0"},{"method":"ProductRpc.getDeliveryInfo","params":{"page":"product-0-426169340.html","query":""},"hash":"024f3548","id":1519715791897,"jsonrpc":"2.0"},{"method":"getCrossWarehouse","params":{"page":"product-0-426169340.html","query":""},"hash":"13e0dd1b","id":1519715791898,"jsonrpc":"2.0"},{"method":"getProductAds","params":{"page":"product-0-426169340.html","query":""},"hash":"bd228e37","id":1519715791899,"jsonrpc":"2.0"}]
//{"method":"getProductSize","params":{"page":"product-0-426169340.html","query":""},"hash":"f5e5057b","id":1519715791877,"jsonrpc":"2.0"}

//var proxyRequest = require('./proxyRequest').proxyRequest;
var proxyRequest = require('./proxyRequest2');

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'detail.vip.com'){
            var exp = /detail\-(\d*\-\d+\.html)/ig;
            var res = exp.exec(urlInfo.path);
            var uri = res[1];
        }
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
        return '';
    }

    //获取属性
    getHtml('https://m.vip.com/product-' + uri,'POST','',false,function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }
        if (body.length == 0){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'get product detail error'
                }
            });
            return '';
        }

        //匹配js
         var exp = /var\s*_WAP_PAGE_CACHE\s*=\s*(\{.*\});/ig;
        body = exp.exec(body);
        body = JSON.parse(body[1]);

        getItemInfo({body:body, uri:uri, url:urlStr}, urlInfo,  callback);
    })


    // var tmp_time = new Date().getTime();
    // var json_content = {"method":"getProductSize","params":{"page":"product-"+uri,"query":""},"hash":"f5e5057b","id":tmp_time,"jsonrpc":"2.0"};
    // //get html
    // getHtml('https://m.vip.com/server.html?rpc=&method=pageCache&f=www&_=' + new Date().getTime(), json_content, function(body, err){
    //     if(err){
    //         callback({
    //             "Errors":{
    //                 'Code': 'Error',
    //                 "Message": err
    //             }
    //         });
    //         return '';
    //     }
    //     if (body.length == 0){
    //         callback({
    //             "Errors":{
    //                 'Code': 'Error',
    //                 "Message": 'get product detail error'
    //             }
    //         });
    //         return '';
    //     }

    //     getItemInfo({body:body[0], uri:uri, url:urlStr}, urlInfo,  callback);
    // })
}

/*
 *内容处理
 **/
function getItemInfo(params, urlInfo, callback) {
    var uri = params.uri, body = params.body, url = params.url;
    var itemInfo = {
        Unique: 'cn.vip.' + body.vtm.product.productId,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: body.vtm.product.title,
            ShopName : '唯品会',
            ShopId: '',
            ImageUrl: 'http:'+body.vtm.product.small_image,
            VenderType:'普通',
            ShopType:'普通',
            StageInfo:'',
            Region: true,
        },
        Variations: [],
        Items: [],
        Coupon:''
    };

    var goodsColorMap = [];//商品对应的颜色信息
    var requestSkuUrl = [];//组装在一起另外的url
    var salesUrl = [];//促销url
    var salesInfo = [];

    var colorAttr = {
            Id:1,
            Name:'颜色',
            Values:[]
        };

    //判断sku类型
    if(body.multiColor.items.length > 0){
        
        body.multiColor.items.forEach(function(val, colorIndex){
            //记录需要获取促销信息的url
            salesUrl.push(val.product_url);

            if (colorIndex == 0){
                itemInfo.Unique = 'cn.vip.' + val.product_id;
            }

            if (body.vtm.product.productId != val.product_id){
                requestSkuUrl.push('https://m.vip.com/'+val.product_url);
            }
            if (val.name != '见实物') {
                if (_.findIndex(goodsColorMap, {ProductId:val.product_id}) == -1){
                    goodsColorMap.push({ProductId:val.product_id,Vid:val.vid,Name:val.name});
                }
                var imgs = [];
                val.previewImages.forEach(function(valimg){
                    imgs.push('http://a.vimage1.com/'+valimg.imageUrl);
                })
                if (!val.sale_out){
                    colorAttr.Values.push(
                        {
                            ValueId:val.vid,
                            Name:val.name,
                            ImageUrls:imgs
                        }
                    );
                }

            }
        });
    }

    var variations_sort = 1;
    if (colorAttr.Values.length > 0){
        variations_sort = 2;
    }

    var sizeAttr = {
            Id:variations_sort,
            Name:'尺码',
            Values:[]
        };

    if (body.productSize.productSku.items.length > 0){
        
        body.productSize.productSku.items.forEach(function(val){

            if (val.leavings > 0){
                sizeAttr.Values.push(
                    {
                        ValueId:val.sku_id,
                        Name:val.sku_name,
                    }
                );

                //组装商品
                if((temIndex = _.findIndex(goodsColorMap, {ProductId:val.product_id})) != -1){
                    itemInfo.Items.push(
                        {
                            Unique:'cn.vip.'+val.product_id+'.'+val.sku_id,
                            Attr:[{
                                Nid:1,
                                N:'颜色',
                                Vid:goodsColorMap[temIndex].Vid,
                                V:goodsColorMap[temIndex].Name
                            },{
                                Nid:2,
                                N:'尺码',
                                Vid:val.sku_id,
                                V:val.sku_name
                            }],
                            Offers:[{
                                Merchant:{Name:'唯品会'},
                                List:[{
                                    Price:val.vipshop_price,
                                    Type:'RMB'
                                }]
                            }],
                            Subtitle:[]
                        }
                    );
                } else {
                    itemInfo.Items.push(
                        {
                            Unique:'cn.vip.'+val.product_id+'.'+val.sku_id,
                            Attr:[{
                                Nid:1,
                                N:'尺码',
                                Vid:val.sku_id,
                                V:val.sku_name
                            }],
                            Offers:[{
                                Merchant:{Name:'唯品会'},
                                List:[{
                                    Price:val.vipshop_price,
                                    Type:'RMB'
                                }]
                            }],
                            Subtitle:[]
                        }
                    );
                }
            }
            
            

        });
    }
    if (colorAttr.Values.length > 0) itemInfo.Variations.push(colorAttr);
    if (sizeAttr.Values.length > 0) itemInfo.Variations.push(sizeAttr);

    //获取优惠券
    if (body.coupon.brandCoupon.couponDetail.length > 0){
        itemInfo.Coupon = {"List": []};
        var startDate = CurentTime();
        var endDate  = new Date();
        endDate.setTime(endDate.getTime()+48*60*60*1000);
        endDate = CurentTime(endDate);
        body.coupon.brandCoupon.couponDetail.forEach(function(coupon){
            itemInfo.Coupon.List.push({
                "Id":body.coupon.brandCoupon.brand_id,
                "Amount":[coupon.fav,coupon.buy],
                "Date":[startDate,endDate],
                "Category": "normal"
            });
        })
    }

    var length = requestSkuUrl.length+salesUrl.length;
    var ep = new eventproxy();
    ep.after('skuInfo', length, function (skuInfos) {
        skuInfos.forEach(function(skuInfo){
            if (skuInfo[0] == 'sku'){
                if (skuInfo[1].productSize.productSku.items.length > 0){
                    skuInfo[1].productSize.productSku.items.forEach(function(val){
                        if (val.leavings > 0){
                            //组装商品
                            if((temIndex = _.findIndex(goodsColorMap, {ProductId:val.product_id})) != -1){
                                itemInfo.Items.push(
                                    {
                                        Unique:'cn.vip.'+val.product_id+'.'+val.sku_id,
                                        Attr:[{
                                            Nid:1,
                                            N:'颜色',
                                            Vid:goodsColorMap[temIndex].Vid,
                                            V:goodsColorMap[temIndex].Name
                                        },{
                                            Nid:2,
                                            N:'尺码',
                                            Vid:val.sku_id,
                                            V:val.sku_name
                                        }],
                                        Offers:[{
                                            Merchant:{Name:'唯品会'},
                                            List:[{
                                                Price:val.vipshop_price,
                                                Type:'RMB'
                                            }]
                                        }],
                                        Subtitle:[]
                                    }
                                );
                            } else {
                                itemInfo.Items.push(
                                    {
                                        Unique:'cn.vip.'+val.product_id+'.'+val.sku_id,
                                        Attr:[{
                                            Nid:1,
                                            N:'尺码',
                                            Vid:val.sku_id,
                                            V:val.sku_name
                                        }],
                                        Offers:[{
                                            Merchant:{Name:'唯品会'},
                                            List:[{
                                                Price:val.vipshop_price,
                                                Type:'RMB'
                                            }]
                                        }],
                                        Subtitle:[]
                                    }
                                );
                            }
                            
                        }
                    });
                    
                }
            } else {
                if (skuInfo[1].length>0){
                    skuInfo[1].forEach(function(sale){
                        if (sale.result.activemsg){
                            salesInfo.push({ProductId:sale.result.product_id,info:sale.result});
                        }
                    })
                }
            }
            
        })
        if (salesInfo.length > 0){
            itemInfo.Items.forEach(function(item,item_index){
                var uniqueArr = item.Unique.split(".");
                var productId = uniqueArr[2];
                
                if((itemIndex = _.findIndex(salesInfo, {ProductId:productId})) != -1){
                    salesInfo[itemIndex].info.activemsg_data.forEach(function(sales_info){
                        if (sales_info.type == '满减'){
                            itemInfo.Items[item_index].Subtitle.push({Name:sales_info.tips});
                        }
                    })
                }

            })
        }
        return callback(null, itemInfo);
    });

    if (salesUrl.length>0){
        salesUrl.forEach(function(val){
            
            var tmp_time = new Date().getTime();
            var json_content = {"method":"getGoodsActiveMsg","params":{"page":val.replace(/\//g, ""),"query":""},"id":tmp_time,"jsonrpc":"2.0"};
            //获取属性
            getHtml('https://m.vip.com/server.html?rpc&method=getGoodsActiveMsg&f=&_='+tmp_time,'GET',json_content,true,function(bodysales, err){
                if(err){
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": err
                        }
                    });
                    return '';
                }
                if (bodysales.length == 0){
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": 'get sales detail error'
                        }
                    });
                    return '';
                }
                ep.emit('skuInfo', ['sales',bodysales]);
            });
        })
    }

    if (length>0){
        requestSkuUrl.forEach(function(val){
            //获取属性
            getHtml(val,'POST','',false,function(bodysku, err){
                if(err){
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": err
                        }
                    });
                    return '';
                }
                if (bodysku.length == 0){
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": 'get product detail error'
                        }
                    });
                    return '';
                }

                //匹配js
                 var exp = /var\s*_WAP_PAGE_CACHE\s*=\s*(\{.*\});/ig;
                bodysku = exp.exec(bodysku);
                bodysku = JSON.parse(bodysku[1]);

                ep.emit('skuInfo', ['sku',bodysku]);
            });
        })
    } else {
        return callback(null, itemInfo);
    }
}

/*
 *获取html
 **/
function getHtml(urlStr, method, body, isjson, callback){
    proxyRequest({
        url: urlStr,
        timeout: 15000,
        json: isjson,
        headers: {
            'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Encoding":"deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Cookie":" wap_A1_sign=1; WAP[p_wh]=VIP_SH; warehouse=VIP_SH; m_vip_province=103101; WAP[p_area]=%25E4%25B8%258A%25E6%25B5%25B7; WAP[area_id]=103101101; WAP[first_view]=1; wap_consumer=A1; no_refer_view=1;"
        },
        method:method,
        body:body ? body : '',
        // proxy: 'http://172.16.13.177:8888'
        //encoding: null
    }, function(error, response, body) {

        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0
                || body.indexOf('Direct connection failed, no parent proxy') > 0
            ) {
                callback(null, 'fast rate or no parent proxy');
            } else {
                callback(body, null);
            }
        }else{
            callback(null, error);
        }
    })
}

function CurentTime(time)  
{   
    if (time) {
        var now = new Date(time);  
    } else {
        var now = new Date();  
    }
      
    var year = now.getFullYear();       //年  
    var month = now.getMonth() + 1;     //月  
    var day = now.getDate();            //日  
      
    var hh = now.getHours();            //时  
    var mm = now.getMinutes();          //分  
    var ss = now.getSeconds();           //秒  
      
    var clock = year + "-";  
      
    if(month < 10)  
        clock += "0";  
      
    clock += month + "-";  
      
    if(day < 10)  
        clock += "0";  
          
    clock += day + " ";  
      
    if(hh < 10)  
        clock += "0";  
          
    clock += hh + ":";  
    if (mm < 10) clock += '0';   
    clock += mm + ":";   
       
    if (ss < 10) clock += '0';   
    clock += ss;   
        return(clock);   
}  

