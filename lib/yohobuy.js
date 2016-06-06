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

    var mApi = 'https://item.m.yohobuy.com/product/pro_'+pid+'_'+gid+'/LIFEAFTERLIFEDuanXiuTXuLALA602TE64.html'
    getHtml(mApi, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }


        getItemInfo({
            body:body,
            pid:pid,
            url:urlStr
        } , callback);
    })

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid,
        body = params.body,
        url = params.url;

    if(!body){
        var itemInfo = {
            Unique: 'cn.yohobuy.' + pid,
            Md5: '',
            Status: 'notFind',
            Url: '',
            ItemAttributes: {
                Title: '',
                ShopName: '有货',
                ShopId: 'cn.yohobuy',
                ImageUrl:''
            },
            Variations: [],
            Items: []
        };
        callback(null, itemInfo);
        return ;
    }

    var $ = cheerio.load(params.body);
    var title = $('.text-info .name').text();
    var imageUrl = 'http:'+$('.swiper-wrapper>li>a>img').attr('src');

    var itemInfo = {
        Unique: 'cn.yohobuy.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: title,
            ShopName: '有货',
            ShopId: 'cn.yohobuy',
            ImageUrl:imageUrl
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
    var n = j = 0;

    $('.size-list ul').each(function(index,ul){
        if(index > 0){
            var imgsAttr = [];
            var tmp = $('.basic-info img').eq(index-1).attr('src');
            tmp = typeof tmp != 'undefined' ? tmp : '';
            imgsAttr.push('http:'+ tmp.replace(/60x60/g,'400x400'));
            imgName = $('.color-list ul').eq(0).find('li').eq(index-1).text();
            n++;
            imgValueId = type.color+_.padStart(n, 6, 0);
            color.Values.push({
                "ValueId": imgValueId,
                "Name": imgName,
                "ImageUrls":imgsAttr
            });

            $(ul).find('li').each(function(i,li){
                if(Number($(li).attr('data-num')) > 0){
                    if((sizeIndex = _.findIndex(size.Values, {"ValueId": $(li).attr('data-id')})) == -1){
                        //获取所有的尺寸
                        size.Values.push({
                            "ValueId": $(li).attr('data-id'),
                            "Name": _.trim($(li).text())
                        });

                        sizeIndex = size.Values.length -1;
                    }


                    colorId      = color.Values[index-1].ValueId;
                    colorName    = color.Values[index-1].Name;
                    sizeId       = size.Values[sizeIndex].ValueId;
                    sizeName     = size.Values[sizeIndex].Name;

                    //保存商品信息
                    itemInfo.Items.push({
                        "Unique":"cn.yohobuy."+imgValueId+":"+$(li).attr('data-id'),
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
                                "Name":"yohobuy"
                            },
                            "List":[
                                {
                                    "Price": _.trimStart($('.currentPrice').text(),'¥'),
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
