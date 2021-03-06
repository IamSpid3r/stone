var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var fun = require('./fun');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'item.yintai.com'){
            var pgid = urlInfo.path.split('/')[1];

            if(pgid.indexOf('C') != -1){
                pgid = pgid.substring(0,pgid.indexOf('C'));
            }else{
                pgid = pgid.substring(0,pgid.indexOf('.html'));
            }
        }else{
            throw new Error();
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

    //get api
    var apiUrl = 'http://m.yintai.com//Services/Proxy.ashx?r=0.4382753276731819&data={"itemcode":"'+pgid+'"}&userId=&methodName=products.getproduct_3.0&method=products.getproduct&ver=3.0';
    getHtml(apiUrl, function(body, err){
        if(err){
            callback({
                "Errors":{'Code': 'Error', "Message": err}
            });
            return '';
        }

        if(body){
            getItemInfo({res:body, pgid:pgid, url:urlStr} , callback);
        }else{
            callback({
                "Errors":{'Code': 'Error', "Message": 'Goods Not Found'}
            });
            return ;
        }
    })

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pgid = params.pgid.replace(/-/g, "."),
        res = params.res,
        url = params.url;

    //itemInfo
    var itemInfo = {
        Unique: 'cn.yintai.' + pgid,
        Md5: '',
        Status: '',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName : '银泰',
            ShopId: 'cn.yintai'
        },
        Variations: [],
        Items: []
    };

    //check json
    if(!fun.isJson(res)){
        //被劫持 外包一层代理 不是json
        fun.writeLog('yintai', res);

        callback(null, {
            "Errors":{
                'Code': 'Error',
                "Message": 'Res is not json'
            }
        });
        return ;
    }

    var res = JSON.parse(res);

    //Api server error
    if(!res.isSuccessful){
        callback(null, {
            "Errors":{
                'Code': 'Error',
                "Message": 'Api server error'
            }
        });
        return ;
    }
    //outOfStock
    if(res.statusCode != 200){
        itemInfo.Status = 'outOfStock';
        callback(null, itemInfo);
        return ;
    }

    var data = res.data;
    var title = data.current.longname;
    var imageUrl = data.current.large_img_urls.length > 0 ? data.current.large_img_urls[0] : '';

    //inStock
    itemInfo.Status = 'inStock';
    itemInfo.ItemAttributes.Title = title;
    itemInfo.ItemAttributes.ImageUrl = imageUrl;

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
    var n = j = 0; //标记位
    var outOfStock = true;        //默认下架
    var items = data.product_list;//所有商品
    items.unshift(data.current);

    // callback(null, items);
    // return ;
    //数据处理
    var i = 1;
    items.forEach(function(goods_list){
        if(goods_list.instock){//正常
            outOfStock = false;
            colorIndex = sizeIndex = null;
            goods_list.sku_property.forEach(function (sku_property) {
                if (sku_property.url) {
                    if((colorIndex = _.findIndex(color.Values, {"Name": sku_property.value})) == -1){
                        color.Values.push({
                            "ValueId": goods_list.imageitemcode,
                            "Name": sku_property.value,
                            "ImageUrls":goods_list.large_img_urls
                        });

                        colorIndex = color.Values.length - 1;
                    }
                } else {
                    if((sizeIndex = _.findIndex(size.Values, {"Name": sku_property.value})) == -1){
                        //获取所有的尺寸
                        n++;
                        valueId = type.size+_.padStart(n, 6, 0);

                        size.Values.push({
                            "ValueId": valueId,
                            "Name": sku_property.value
                        });

                        sizeIndex = size.Values.length - 1;
                    }
                }
            })

            item = {
                "Unique":"cn.yintai."+i,
                "Attr":[],
                "Offers": [{
                    "Merchant": {
                        "Name":"yintai"
                    },
                    "List":[
                        {
                            "Price": goods_list.yt_price,
                            "Type": "RMB"
                        }
                    ]
                }]
            };
            if (colorIndex !== null) {
                currentColor = color.Values[colorIndex];
                item.Attr.push({
                    "Nid": color.Id,
                    "N":   color.Name,
                    "Vid": currentColor.ValueId,
                    "V":   currentColor.Name
                })
            }
            if (sizeIndex !== null) {
                currentSize  =  size.Values[sizeIndex];

                item.Attr.push({
                    "Nid": size.Id,
                    "N":   size.Name,
                    "Vid": currentSize.ValueId,
                    "V":   currentSize.Name
                })
            }

            //保存商品信息
            itemInfo.Items.push(item)
            i++;
        }
    })

    //outOfStock
    if(outOfStock){
        itemInfo.Status = 'outOfStock';
        callback(null, itemInfo);
        return ;
    }

    //inStock
    color.Values.length > 0 && itemInfo.Variations.push(color);
    size.Values.length > 0 && itemInfo.Variations.push(size);
    itemInfo.Md5 = md5(JSON.stringify(itemInfo));

    callback(null, itemInfo);
    return ;
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        timeout: 5000,
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            "Accept-Language":"zh-CN,zh;q=0.8",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache",
        }
        // proxy: 'http://172.16.13.177:8888'
        //encoding: null
    }, function(error, response, body, callbackStatus) {
        if(!error){
            if (body.indexOf('COW Proxy') > 0) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
