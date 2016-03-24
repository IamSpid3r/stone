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

    var apiUrl = 'http://m.yintai.com//Services/Proxy.ashx?r=0.4382753276731819&data={"itemcode":"'+pgid+'"}&userId=&methodName=products.getproduct_3.0&method=products.getproduct&ver=3.0';
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
                pgid:pgid,
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
    var pgid = params.pgid.replace(/-/g, "."),
        res = params.res,
        url = params.url;
        //pid = pgid.split('-')[0]+'.'+pgid.split('-')[1];

    res = JSON.parse(res);
    if(res.statusCode != 200 || !res.isSuccessful){
        //todo 没有
        var itemInfo = {
            Unique: 'cn.yohobuy.' + pgid,
            Md5: '',
            Status: 'outOfStock',
            Url: url,
            ItemAttributes: {
                Title: title
            },
            Variations: [],
            Items: []
        };

        callback(null, itemInfo);
        return ;
    }

    var data = res.data;
    var title = data.current.longname;
    var itemInfo = {
        Unique: 'cn.yintai.' + pgid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: title
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
    var n = j = 0; //标记位
    var outOfStock = false;       //默认下架
    var items = data.product_list;//所有商品
    items.unshift(data.current);


    //数据处理
    items.forEach(function(goods_list){
        if(goods_list.instock){//正常
            outOfStock = true;
            if((colorIndex = _.findIndex(color.Values, {"Name": goods_list.sku_property[0].value})) == -1){
                color.Values.push({
                    "ValueId": goods_list.imageitemcode,
                    "Name": goods_list.sku_property[0].value,
                    "ImageUrls":goods_list.large_img_urls
                });

                colorIndex = color.Values.length - 1;
            }

            if((sizeIndex = _.findIndex(size.Values, {"Name": goods_list.sku_property[1].value})) == -1){
                //获取所有的尺寸
                n++;
                valueId = type.size+_.padStart(n, 6, 0);

                size.Values.push({
                    "ValueId": valueId,
                    "Name": goods_list.sku_property[1].value
                });

                sizeIndex = size.Values.length - 1;
            }

            currentColor =  color.Values[colorIndex];
            currentSize  =  size.Values[sizeIndex];

            //保存商品信息
            itemInfo.Items.push({
                "Unique":"cn.yintai."+currentColor.ValueId+"."+currentSize.ValueId,
                "Attr":[
                    {
                        "Nid": color.Id,
                        "N":   color.Name,
                        "Vid": currentColor.ValueId,
                        "V":   currentColor.Name
                    },
                    {
                        "Nid": size.Id,
                        "N":   size.Name,
                        "Vid": currentSize.ValueId,
                        "V":   currentSize.Name
                    }
                ],
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
            })

        }
    })

    //下架
    if(!outOfStock){
        var itemInfo = {
            Unique: 'cn.yintai.' + pgid,
            Md5: '',
            Status: 'outOfStock',
            Url: url,
            ItemAttributes: {
                Title: title
            },
            Variations: [],
            Items: []
        };
    }

    itemInfo.Variations.push(color);
    itemInfo.Variations.push(size);
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
        headers: {
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
            "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
