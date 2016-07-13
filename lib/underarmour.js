var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var Q = require('q');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'www.underarmour.cn'){
            var sku = urlInfo.path.split('/')[1].split('-');
            var pid = sku[0].replace('p', '');       //商品id
            var gid = sku[1].replace('.htm', '');    //商品子ID
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

    var mApi = 'http://www.underarmour.cn/p'+pid+'-'+gid+'.htm';
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
            gid:gid,
            url:urlStr
        } , callback);
    })

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid,
    	gid = params.gid,
        body = params.body,
        url = params.url;

    if(!body){
        var itemInfo = {
            Unique: 'cn.underarmour.' + pid,
            Md5: '',
            Status: 'notFind',
            Url: '',
            ItemAttributes: {
                Title: '',
                ShopName: 'Under Armour',
                ShopId: 'cn.underarmour',
                ImageUrl:''
            },
            Variations: [],
            Items: []
        };
        callback(null, itemInfo);
        return ;
    }
    if (body.indexOf('抱歉，该商品已下架') != -1 || (body.indexOf('抱歉，该物品已售罄') != -1)) {
        var itemInfo = {
            Unique: 'cn.underarmour.' + pid,
            Md5: '',
            Status: 'outOfStock',
            Url: '',
            ItemAttributes: {
                Title: '',
                ShopName: 'Under Armour',
                ShopId: 'cn.underarmour',
                ImageUrl:''
            },
            Variations: [],
            Items: []
        };
        callback(null, itemInfo);
        return ;
    }

    var $ = cheerio.load(params.body);
    var title = $(".trade-name").text();

    var imageUrl = '';
    $("#imageMenu li").find('a').each(function(index,obj){
        imageUrl = $(obj).find('img').attr('src');
        return false;
    });
    var imageUrl = imageUrl.split('_')[0] + '.png';

    var itemInfo = {
        Unique: 'cn.underarmour.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: title,
            ShopName: 'Under Armour',
            ShopId: 'cn.underarmour',
            ImageUrl:imageUrl
        },
        Variations: [],
        Items: []
    };

    var type = {'color':1, 'size': 2};
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

	var n = 0;
    var sizeMapping = new Object();
	$(".size-nav").find("li").each(function(index,obj){
		var sizeName=trim($(obj).text());
        n++;
        var sizeValueId = type.size+_.padStart(n, 6, 0);
        size.Values.push({
            "ValueId": sizeValueId,
            "Name": sizeName
        });
        sizeMapping[sizeName] = sizeValueId;
	});

	var i = 0;
    var colorLen = $(".color-size-category li").length;
	$(".color-size-category").find("li").each(function(index,obj){
		var itemid = $(obj).attr("itemid");
		var colorName=$(obj).find('a').attr("title");
		var colorcode=$(obj).find('a').attr("colorcode");
		//console.log(itemid+'=='+colorName+"=="+colorcode);

		var mApi = 'http://www.underarmour.cn/p'+pid+'-'+colorcode+'.htm';
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

            var $t = cheerio.load(body);
            var imgsAttrTmp = [];
            $t("#imageMenu ul li a img").each(function(index,obj){
                var tmpT = $t(obj).attr('src');
                imgsAttrTmp.push(_.replace(tmpT, '90X105', '615X650'));
            });
            color.Values.push({
                "ValueId": itemid,
                "Name": colorName,
                "ImageUrls":imgsAttrTmp
            });

            $t(".size-nav").find("li").each(function(index,obj){
                var skuid = $(obj).attr('skuid'),
                    colorItemid = $(obj).attr('itemid'),
                    sizeName = trim($(obj).text()),
                    qyt = $(obj).attr('qty');
                if ((0 < qyt) && (colorItemid == itemid)) {
                    itemInfo.Items.push({
                        "Unique":"cn.underarmour."+colorItemid+":"+skuid,
                        "Attr":[
                            {
                                "Nid": color.Id,
                                "N":   color.Name,
                                "Vid": colorItemid,
                                "V":   colorName
                            },
                            {
                                "Nid": size.Id,
                                "N":   size.Name,
                                "Vid": sizeMapping[sizeName],
                                "V":   sizeName
                            }
                        ],
                        "Offers": [{
                            "Merchant": {
                                "Name":"Under Armour"
                            },
                            "List":[
                                {
                                    "Price": _.trimStart(trim($('.price-style .price').first().text()),'￥'),
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    });
                }
            });

            i++;
            //console.log('i:' + i)
            if (i == colorLen) {
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
        });

	});

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
    }, function(error, response, body, callbackStatus) {
        //如果是限制ip了就返回false
        if(!error){
            if (body.indexOf("您访问的页面不存在") != -1) {
                callback('', error);
            } else if (body.indexOf('<title>COW Proxy</title>') > 0) {
                callbackStatus(false);
            } else {
                callbackStatus(true)
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        callback(body, error);
    })
    // var options = {
    //     url: urlStr,
    //     headers: {
    //         'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
    //         "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //         "Accept-Encoding":"deflate, sdch",
    //         "Accept-Language":"zh-CN,zh;q=0.8",
    //         "Cache-Control":"no-cache",
    //         "Connection":"keep-alive",
    //         "Pragma":"no-cache"
    //     }
    // };
    // request(options,function(error,response,body) {
    //     if (body.indexOf("您访问的页面不存在") != -1) {
    //         callback(body, '不存在');
    //     } else {
    // 	    callback(body, error);
    //     }
    // });
 }

function trim(str){ //删除左右两端的空格
    return str.replace(/(^\s*)|(\s*$)/g, "");
}