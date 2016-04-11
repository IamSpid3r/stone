var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'item.yohobuy.com'){
            var sku = urlInfo.path.split('/')[2].split('_');
            var pid = sku[1];       //商品id
            var gid = sku[2];       //商品子ID
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

    var apiUrl = 'http://itemapi.yohobuy.com/item/item/goods?product_id='+pid+'&goods_id='+gid;
    getHtml(apiUrl, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        if(body){
            getItemInfo({
                res:body,
                pid:pid,
                gid:gid,
                url:urlStr
            } , callback);
        }else{
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'Goods Not Found'
                }
            });
        }
    })

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid,
        gid = params.gid,
        res = params.res,
        url = params.url;

    res = JSON.parse(res);
    if(res.code != 200){
        //todo 没有
        var itemInfo = {
            Unique: 'cn.yohobuy.' + pid + '.' + gid,
            Md5: '',
            Status: 'notFind',
            Url: url,
            ItemAttributes: {
                Title: '',
                ShopName: '',
                ShopId: ''
            },
            Variations: [],
            Items: []
        };

        callback(null, itemInfo);
        return ;
    }

    var data = res.data;
    var title = data.goods_list[gid].title;
    var itemInfo = {
        Unique: 'cn.yohobuy.' + pid + '.' + gid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: title,
            ShopName: '有货',
            ShopId: 'cn.yohobuy'
        },
        Variations: [],
        Items: []
    };

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
    var urls = [];
    var items = [];


    //数据处理
    _(data.goods_list).forEach(function(goods_list,color_id){
        if(//售罄
            goods_list.status == 1
            && goods_list.storage >= 0
        ){//正常
            _(goods_list.skus).forEach(function(sku,size_id){
                if(sku.status == 1 && sku.storage > 0){
                    size.Values.push({
                        "ValueId": size_id,
                        "Name": sku.size_name
                    });

                    if((colorIndex = _.findIndex(color.Values, {"ValueId": color_id})) == -1){
                        color.Values.push({
                            "ValueId": color_id,
                            "Name": goods_list.color_name,
                            "ImageUrls":data.image_list[color_id].image[0].big
                        });
                    }

                    //保存商品信息
                    itemInfo.Items.push({
                        "Unique":"cn.yohobuy."+color_id+"."+size_id,
                        "Attr":[
                            {
                                "Nid": color.Id,
                                "N":   color.Name,
                                "Vid": color_id,
                                "V":   goods_list.color_name
                            },
                            {
                                "Nid": size.Id,
                                "N":   size.Name,
                                "Vid": size_id,
                                "V":   sku.size_name
                            }
                        ],
                        "Offers": [{
                            "Merchant": {
                                "Name":"yohobuy"
                            },
                            "List":[
                                {
                                    "Price": data.price.sales_price,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    })

                }
            })
        }
    })

    //售罄
    if(itemInfo.Items.length == 0){
        itemInfo.Status =  'outOfStock';
    }

    itemInfo.Variations.push(color);
    itemInfo.Variations.push(size);
    itemInfo.Md5 = md5(JSON.stringify(itemInfo))

    callback(null, itemInfo);
    return ;
}


/*
 *获取html
 **/
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
        // proxy: 'http://172.16.13.177:8888'
        //encoding: null
    }, function(error, response, body, callbackStatus) {
        //如果是限制ip了就返回false
        if(!error){
            if (body.indexOf("Sorry, this item isn't available") != -1) {
                callbackStatus(false)
            } else {
                callbackStatus(true)
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
