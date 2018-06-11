var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');

//var proxyRequest = require('./proxyRequest').proxyRequest;
var proxyRequest = require('./proxyRequest2');

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'www.yougou.com' || urlInfo.host == 'seoul.yougou.com'){
            var sku = urlInfo.path.split('/')[2].split('-');
            var sid = sku[1];       //商品id
            var pid = sku[2].split('.')[0];       //商品子ID
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

    var mUrl = 'http://m.yougou.com/touch/c-newbalance/sku-'+sid+'-'+pid+'?t='+Math.random()
    getHtml(mUrl, function(body, err){
        if(err || !body){
            callback({
                "Errors":{
                    'Code': 'error',
                    "Message": err
                }
            });
            return '';
        }

        getItemInfo({
            res:body, sid:sid, pid:pid, url:urlStr
        } , callback);
    })

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var $ = cheerio.load(params.res);
    var title = $('.huodong h1').first().text();
    //console.log(params.res);
    if (!title) {
        callback({
            "Errors": {'Code': 'Error', "Message": '抓取错误'}
        });
        return '';
    }

    var imageUrl = $('.pro_img .swiper-wrapper img').eq(0).attr('src') != 'http://m.yougou.com:80/images/detail_img/car1.png'
        ? $('.pro_img .swiper-wrapper img').eq(0).attr('src') : $('.pro_img .swiper-wrapper img').eq(1).attr('src');

    var itemInfo = {
        Unique: 'cn.yougou.' + params.sid,
        Md5: '',
        Status: 'inStock',
        Url: params.url,
        ItemAttributes: {
            Title: title,
            ShopName: '优购',
            ShopId: 'cn.yougou',
            ImageUrl: imageUrl
        },
        Variations: [],
        Items: []
    };

    var n = j = i = h = f = 0;
    var type = {'color': 1, 'size': 2};                  //类型对应id
    var color = {
        "Id": 1,
        "Name": "颜色",
        "Values": []
    };
    var size = {
        "Id": 2,
        "Name": "尺码",
        "Values": []
    };
    var yougouUrls = [];
    var yougouItems = [];

    //获取所有的链接
    $('.opt_color dd a').each(function () {
        productNumber = $(this).find('img').attr('pronumber');

        pageUrl = 'http://m.yougou.com/touch/c-newbalance/sku-' + params.sid + '-' + productNumber + '?t=' + Math.random();
        skuUrl = 'http://m.yougou.com:80/getCommodityDetail.sc?cNo=' + productNumber + '&t=' + Math.random();

        //self
        if (!$(this).hasClass('checked') && $(this).attr('href') != '#') {
            yougouUrls.push({type: 'page', url: pageUrl, id: productNumber});
        }
        yougouUrls.push({type: 'sku', url: skuUrl, id: productNumber});
    })

    //数据处理
    var ep = new eventproxy();
    ep.after('yougouUrls', yougouUrls.length, function (yougouItems) {
        var bodyList = [];
        var skuList = [];

        yougouItems.forEach(function (val) {
            if (val.type == 'page') {
                bodyList.push(val.body);
            }
            if (val.type == 'sku') {
                skuList.push(val);
            }
        })

        bodyList.push($);
        bodyList.sort(function (a, b) {//异步抓取顺序不同，保持排序规则，保持MD5一致
            return a('.opt_color dd .checked img').attr('alt') > b('.opt_color dd .checked img').attr('alt');
        })

        bodyList.forEach(function ($) {
            productNumber = $("#productid").val();
            skuLineIndex = _.findIndex(skuList, {'id': productNumber});

            if (skuLineIndex != -1) {
                skuLine = skuList[skuLineIndex].body;
                //获取所有的颜色
                j++;
                var ImageUrls = [];
                $('.pro_img .swiper-wrapper img').each(function () {
                    ImageUrls.push($(this).attr('src'))
                })

                currentColor = {
                    "ValueId": type.color + _.padStart(j, 6, 0),
                    "Name": $('.opt_color dd .checked img').attr('alt'),
                    "ImageUrls": ImageUrls
                }
                color.Values.push(currentColor);

                var itemContent = '';
                $('.opt_cm dd a').each(function () {
                    skuId = $(this).attr('nos');
                    if ('inventory' in skuLine && skuId in skuLine.inventory) {//todo 尺码sku以后完善
                        if ((sizeIndex = _.findIndex(size.Values, {"Name": $(this).find('span').html()})) == -1) {
                            //获取所有的尺寸
                            n++;
                            valueId = type.size + _.padStart(n, 6, 0);

                            size.Values.push({
                                "ValueId": valueId,
                                "Name": $(this).find('span').html()
                            });

                            sizeIndex = size.Values.length - 1;
                        }

                        colorId = currentColor.ValueId;
                        colorName = currentColor.Name;
                        sizeId = size.Values[sizeIndex].ValueId;
                        sizeName = size.Values[sizeIndex].Name;

                        //保存商品信息
                        priceRegRes = /¥(\d*)/ig.exec($('.pro_sku .price').text());
                        price = priceRegRes[1];

                        itemContent = {
                            "Unique": "cn.yougou." + $('input[name="productid"]').val() + ":" + sizeName,
                            "Attr": [
                                {
                                    "Nid": color.Id,
                                    "N": color.Name,
                                    "Vid": colorId,
                                    "V": colorName
                                },
                                {
                                    "Nid": size.Id,
                                    "N": size.Name,
                                    "Vid": sizeId,
                                    "V": sizeName
                                }
                            ],
                            "Offers": [{
                                "Merchant": {
                                    "Name": "yougou"
                                },
                                "List": [
                                    {
                                        "Price": price,
                                        "Type": "RMB"
                                    }
                                ]
                            }]
                        }
                        itemInfo.Items.push(itemContent);
                    }
                })

                if (!itemContent) { //此配色下没有商品
                    color.Values.pop();
                }
            }
        })

        if (itemInfo.Items.length <= 0) {//下架
            itemInfo.Status = 'outOfStock';
        } else {
            itemInfo.Variations.push(color);
            itemInfo.Variations.push(size);
        }

        itemInfo.Md5 = md5(JSON.stringify(itemInfo))
        callback(null, itemInfo);
        return;
    })

    //并发取数据
    yougouUrls.forEach(function (urlRow) {
        getHtml(urlRow.url, function (body, err) {
            if (err) {
                callback({
                    "Errors": {'Code': 'Error', "Message": err}
                });
                return '';
            }

            ep.emit('yougouUrls', {
                body: urlRow.type == 'page' ? cheerio.load(body) : JSON.parse(body),
                type: urlRow.type,
                id: urlRow.id,
            });
        });
    })
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        timeout: 5000,
        headers: {
            "referer" : "http://m.yougou.com/"
            ,'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/6011'
            ,"Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            ,"Accept-Language":"zh-CN,zh;q=0.8"
            ,"Cache-Control":"no-cache"
            ,"Connection":"keep-alive"
            ,"Pragma":"no-cache"
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}
