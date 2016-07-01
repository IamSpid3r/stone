var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var md5 = require('md5');
var _ = require('lodash');
var eventproxy = require('eventproxy')

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    if(urlInfo.host == 'www.footlocker.com'){
        getItemInfo(urlStr, callback);
    }else{
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": 'Url Error'
            }
        });
        return '';
    }
}

/*
 *内容处理
 **/
function getItemInfo(urlStr, callback) {
    getHtml(urlStr, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        try {
            var tagMgt = {};
            var regExp = /var secured_dialog[\s|\S]*var aSameDayDeliveryItems/g
            var scriptText = regExp.exec(body);
            var regExp2 = /tagMgt.page_id[\s|\S]*tagMgt.product_type/g
            var scriptText2 = regExp2.exec(body);

            eval(scriptText[0]);
            eval(scriptText2[0]);

        } catch (exception) {
            console.log(exception);
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'Crawl Error'
                }
            });
            return '';
        }

        var url = urlStr;
        var title = model.NM;

        var itemInfo = {
            Unique: 'usa.footlocker.'+model_nbr,
            Md5: '',
            Status: 'inStock',
            Url: url,
            ItemAttributes: {
                Title: title,
                ShopName: 'footlocker',
                ShopId: 'usa.footlocker',
                ImageUrl:''
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
        var imagePathApiUrls = [];
        var n = 0;

        _(styles).forEach(function(val,key){
            imagePathApiUrls.push([key,scene7url +"EBFL2/"+key+"?req=imageset,json"]);

            currentColor = {
                "ValueId": key,
                "Name":val[15],
                "ImageUrls":[]
            }
            color.Values.push(currentColor);

            val[7].forEach(function(sizeDetail){
                currentSizeName =_.trim(sizeDetail[0]) ? sizeDetail[0] : 'normal';
                if((sizeIndex = _.findIndex(size.Values, {"Name": currentSizeName})) == -1){
                    n++;
                    valueId = type.size+_.padStart(n, 6, 0);

                    size.Values.push({
                        "ValueId": valueId,
                        "Name": currentSizeName
                    });

                    sizeIndex = size.Values.length -1;
                }

                colorId      = currentColor.ValueId;
                colorName    = currentColor.Name;
                sizeId       = size.Values[sizeIndex].ValueId;
                sizeName     = size.Values[sizeIndex].Name;

                //保存商品信息
                itemInfo.Items.push({
                    "Unique":"usa.footlocker."+colorId+"."+sizeId,
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
                            "Name":"footlocker"
                        },
                        "List":[
                            {
                                "Price": val[5],
                                "Type": "USA"
                            }
                        ]
                    }]
                })
            })
        })
;
        //并发取图片
        var ep = new eventproxy();
        ep.after('imagePathApiUrls', imagePathApiUrls.length, function (imageItems) {
            imageItems.sort(function(a,b){
                return a[0] > b[0];
            })
            imageItems.forEach(function(imageItem){
                var regExp3 = /{"IMAGE_SET":[\s|\S]*"}/g;
                var thisdata = regExp3.exec(imageItem[1]);
                var imgjson = JSON.parse(thisdata[0]);
                var imageSet = imgjson['IMAGE_SET'].split(',');
                var imageUrls = [];
                imageSet.forEach(function(imgs){
                     imgs = imgs.split(';');
                     imageUrls.push('http://images.footlocker.com/is/image/'+imgs[0]+'?fit=constrain,1&wid=300&hei=300&fmt=jpg');
                })

                colorIndex = _.findIndex(color.Values, {"ValueId": imageItem[0]});

                color.Values[colorIndex].ImageUrls = imageUrls;
            })

            //save
            itemInfo.Variations.push(color);
            itemInfo.Variations.push(size);
            itemInfo.Variations.forEach(function(val){
                if(val.Name == '颜色'){
                    itemInfo.ItemAttributes.ImageUrl = val.Values[0].ImageUrls[0];
                    return ;
                }
            })
            itemInfo.Md5 = md5(JSON.stringify(itemInfo))

            callback(null, itemInfo);
            return ;
        })

        imagePathApiUrls.forEach(function (imagePathApiUrl) {
            getHtml(imagePathApiUrl[1], function(body, err){
                if(err){
                    callback({
                        "Errors":{
                            'Code': 'Error',
                            "Message": err
                        }
                    });
                    return '';
                }

                ep.emit('imagePathApiUrls', [imagePathApiUrl[0], body]);
            });
        })
    })
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
            if (body.indexOf('Please retry your requests at a slower rate') > 0) {
                callbackStatus(false);
            } else {
                callbackStatus(true);
            }
        }else{
            callbackStatus(false)
        }
    }, function(error, response, body) {
        if(!error && response.statusCode == 200){
            callback(body);
        }else{
            callback(null, error || 'http status not 200');
        }
    })
}
