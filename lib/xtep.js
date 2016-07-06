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
        if(urlInfo.host == 'www.xtep.com.cn'){
        	var pid = urlInfo.query.goods_sn;
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

    var mApi = 'http://www.xtep.com.cn/goods/do_index?goods_sn='+pid;
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
            Unique: 'cn.xtep.' + pid,
            Md5: '',
            Status: 'notFind',
            Url: '',
            ItemAttributes: {
                Title: '',
                ShopName: '特步',
                ShopId: 'cn.xtep',
                ImageUrl:''
            },
            Variations: [],
            Items: []
        };
        callback(null, itemInfo);
        return ;
    }

/*    var regExp = /var select\_sku\_str \= new Array\(\);([\s|\S]*?)\<\/script\>/g
    var result = regExp.exec(params.res);
    console.log(result);return*/

    var $ = cheerio.load(params.body);
    var title = trim($(".proinfo .pro-detail-hd h1").text());
    var imageUrl = '';
    $("#proColor li").find('a').each(function(index,obj){
        imageUrl = $(obj).find('img').attr('src');
        return false;
    });
    var imageUrl = imageUrl.split('--')[0] + '.jpg';

    var itemInfo = {
        Unique: 'cn.xtep.' + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: title,
            ShopName: '特步',
            ShopId: 'cn.xtep',
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

    var colorMapping = new Object();
    $('#proColor li').find("a").each(function(index,obj){
    	var colorName = trim($(obj).attr('value')),
    		colorCode = trim($(obj).attr('code'));
    	var imgsAttr = [];
    	$('.pro-box #thumblist_'+colorCode+' li a img').each(function(index,obj){
    		var tmpSrc = $(obj).attr('src'),
    			tmpSrc = tmpSrc.split('--')[0] + '.jpg';
    		imgsAttr.push(tmpSrc);
    	});
    	color.Values.push({
            "ValueId": colorCode,
            "Name": colorName,
            "ImageUrls":imgsAttr
        });
        colorMapping[colorCode] = colorName;
    });

    var sizeMapping = new Object();
    var sizeNameMapping = new Object();
    var n = 0;
    $('#proSize li').find("a").each(function(index,obj){
		var sizeName=trim($(obj).attr('value')),
			sizeCode=trim($(obj).attr('code'));
		n++;
        var sizeValueId = type.size+_.padStart(n, 6, 0);
        size.Values.push({
            "ValueId": sizeValueId,
            "Name": sizeName
        });
        sizeMapping[sizeCode] = sizeValueId;
        sizeNameMapping[sizeCode] = sizeName;
    });

	var jscontent1='';
    $('script').each(function(index,obj){
    	var jscontent = $(obj).text();
    	if (jscontent.indexOf('select_sku_str') != -1) {
    		jscontent1=jscontent;
            return false;
    	}
    });
    if (jscontent1 == null || jscontent1 == undefined || jscontent1 == '') {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": '再试一次'
            }
        });
        return '';
    }
    try {
        eval(jscontent1)
    } catch (exception) {
        console.log("eval:");
        console.log(exception);
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception.message
            }
        });
        return;
    }

	_.forEach(all_inventory_skus, function(value, key) {
		var mappingVal = _.replace(value, pid, ''),
			colorCode = mappingVal.substring(1, 5),
			sizeCode = mappingVal.replace(colorCode, '').replace('\'','').replace('\'','');
            // console.log('1==='+mappingVal);
            // console.log('2==='+colorCode);
            // console.log('3==='+sizeCode);
		itemInfo.Items.push({
            "Unique":"cn.xtep."+value.replace('\'','').replace('\'',''),
            "Attr":[
                {
                    "Nid": color.Id,
                    "N":   color.Name,
                    "Vid": colorCode,
                    "V":   colorMapping[colorCode]
                },
                {
                    "Nid": size.Id,
                    "N":   size.Name,
                    "Vid": sizeMapping[sizeCode],
                    "V":   sizeNameMapping[sizeCode]
                }
            ],
            "Offers": [{
                "Merchant": {
                    "Name":"特步"
                },
                "List":[
                    {
                        "Price": goods_price,
                        "Type": "RMB"
                    }
                ]
            }]
        });
	});

    if(itemInfo.Items.length <= 0){//下架
        itemInfo.Status = 'outOfStock';
    }else{
        itemInfo.Variations.push(color);
        itemInfo.Variations.push(size);
    }

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
    }, function(error, response, body, callbackStatus) {
        //如果是限制ip了就返回false
        if(!error){
            if (body.indexOf("您访问的页面不存在") != -1) {
                callback('', error);
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
//         url: urlStr,
//         headers: {
//             'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.93 Safari/537.36',
//             "Accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//             "Accept-Encoding":"deflate, sdch",
//             "Accept-Language":"zh-CN,zh;q=0.8",
//             "Cache-Control":"no-cache",
//             "Connection":"keep-alive",
//             "Pragma":"no-cache"
//         }
//     };
//     request(options,function(error,response,body) {
//         if (body.indexOf("您访问的页面不存在") != -1) {
//             callback(body, '不存在');
//         } else {
//     	    callback(body, error);
//         }
//     });
}

function trim(str){ //删除左右两端的空格
    return str.replace(/(^\s*)|(\s*$)/g, "");
}
