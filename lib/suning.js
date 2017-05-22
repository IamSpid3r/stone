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
    try {
        if(urlInfo.host == 'product.suning.com'){
            var exp = /\/(\d*)\/(\d*)\.html/ig;
            var res = exp.exec(urlInfo.path);
            var sid = res[1];
            var pid = res[2];
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

    //http://pas.suning.com/nssnitemsale_000000000171958781_0000000000_20_021_0210101_0_5__999__.html?callback=wapData
    //http://pas.suning.com/nssnitemsale_000000000616950990_0070158136_20_021_0210101_0_5__999__.html?callback=wapData
    var m_url ="http://pas.suning.com/nssnitemsale_000000000"+pid+"_"+sid+"_10_010_0100101_0_5__999__.html?callback=wapData";
    //get html
    getHtml(m_url, function(body, err){
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err
                }
            });
            return '';
        }

        getItemInfo({body:body, sid:sid, pid:pid, url:urlStr},  callback);
    })

}

/*
 *内容处理
 **/
function getItemInfo(params, callback) {
    var pid = params.pid,
        body = params.body,
        sid = params.sid,
        url = params.url;

    try{
        body = body.replace(/^wapData\(|\)\s*$/g, '');
        body = JSON.parse(body);
    } catch (exception) {
        console.log(exception)
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": exception
            }
        });
        return '';
    }
    var itemInfo = {
        Unique: 'cn.suning.' + sid + pid,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            Title: '',
            ShopName : 'suning',
            ShopId: '',
            ImageUrl: ''
        },
        Variations: [],
        Items: []
    };

    if (body.code != 200){//抓取失败
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": "Crawl Error"
            }
        });
        return '';
    }

    if(typeof body.data.data1.data.ItemClusterDisplayVO == undefined){//未获得信息
        itemInfo.Status = 'notFind'
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return '';
    }

    itemInfo.ItemAttributes.Title    =   body.data.data1.data.itemInfoVo.itemName;
    itemInfo.ItemAttributes.ImageUrl =   'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-000000000'+pid+'_1.jpg';
    itemInfo.ItemAttributes.ShopId   =  (sid == '0000000000')
        ? 'cn.suning'
        : 'cn.suning.'+parseInt(sid);

    var itemType = body.data.data1.data.itemType;
    var priceSkus=[];
    var priceSid=[];
    var items = [];
    var colorSkus = [];

    console.log(itemType)

    if (itemType == 0){
        var priceinfo  = body.data.price.saleInfo[0];
        var item = {
            "Unique":"cn.suning."+body.data.data1.data.partNumber,
            "Attr":[],
            "Offers": [{
                "Merchant": {
                    "Name":"suning"
                },
                "List":[
                    {
                        "Price": priceinfo.promotionPrice?priceinfo.promotionPrice:priceinfo.netPrice,
                        "Type": "RMB"
                    }
                ]
            }]
        };
        itemInfo.Items.push(item);
        //返回数据
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;

    } else if(itemType == 2 || itemType == 1){//鞋 衣服

        var colorList = body.data.data1.data.CharacterInfoVO.uniqueSubs.color;
        var versionList = body.data.data1.data.CharacterInfoVO.uniqueSubs.version;
        var clusterPartMap =  body.data.data1.data.CharacterInfoVO.uniqueSubs.colorMap[0];

        if (colorList.length>0 && versionList.length>0 && clusterPartMap){//都存在
            var type = {'color':1, 'version': 2};   //类型对应id
            var color = {
                "Id": 1 ,
                "Name":"",
                "Values":[]
            };
            var version = {
                "Id": 2 ,
                "Name":"",
                "Values":[]
            };
            

            //循环类型
            colorList.forEach(function(cval){
                if (typeof clusterPartMap[cval.characterValueId] != 'undefined'){
                    color.Name = cval.characterDisplayName;
                    var valueId = cval.characterValueId;
                    var ImageUrls = [];
                    color.Values.push({
                        "ValueId": valueId,
                        "Name": cval.characterValueDisplayName,
                        "ImageUrls": ImageUrls
                    });
                    versionList.forEach(function(vval){
                        if (typeof clusterPartMap[cval.characterValueId][vval.characterValueId] != 'undefined'){
                            var item = {
                                "Unique":"cn.suning."+clusterPartMap[cval.characterValueId][vval.characterValueId],
                                "Attr":[],
                                "Offers": [{
                                    "Merchant": {
                                        "Name":"suning"
                                    },
                                    "List":[
                                        {
                                            "Price": 0,
                                            "Type": "RMB"
                                        }
                                    ]
                                }]
                            };

                            item.Attr.push({
                                "Nid": color.Id,
                                "N":   color.Name,
                                "Vid": cval.characterValueId,
                                "V":   cval.characterValueDisplayName
                            })

                            item.Attr.push({
                                "Nid": version.Id,
                                "N":   vval.characterDisplayName,
                                "Vid": vval.characterValueId,
                                "V":   vval.characterValueDisplayName
                            })

                            //保存商品信息
                            items.push(item);
                            priceSkus.push(clusterPartMap[cval.characterValueId][vval.characterValueId]);
                            priceSid.push(sid);
                            if(_.findIndex(colorSkus, {"vid":cval.characterValueId}) == -1){
                                colorSkus.push({
                                    "vid": cval.characterValueId,
                                    "skuid": clusterPartMap[cval.characterValueId][vval.characterValueId]
                                });
                            }


                            //存储版本
                            version.Name = vval.characterDisplayName;
                             if(_.findIndex(version.Values, {"Name":vval.characterValueDisplayName}) == -1){
                                var valueId = vval.characterValueId;

                                version.Values.push({
                                    "ValueId": valueId,
                                    "Name": vval.characterValueDisplayName,
                                });
                            }

                        }
                    }) 
                }
        
            });
        } else {colorList.length>0 || versionList.length>0}{//一种属性 手表
            if (colorList){
                var type = {'color':1};   //类型对应id
                var color = {
                    "Id": 1 ,
                    "Name":"",
                    "Values":[]
                };

                //循环类型
                colorList.forEach(function(cval){
                    color.Name = cval.characterDisplayName;
                    var valueId = cval.characterValueId;
                    var ImageUrls = [];
                    color.Values.push({
                        "ValueId": valueId,
                        "Name": cval.characterValueDisplayName,
                        "ImageUrls": ImageUrls
                    });

                    var item = {
                        "Unique":"cn.suning."+cval.partNumber,
                        "Attr":[],
                        "Offers": [{
                            "Merchant": {
                                "Name":"suning"
                            },
                            "List":[
                                {
                                    "Price": 0,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };

                    item.Attr.push({
                        "Nid": color.Id,
                        "N":   color.Name,
                        "Vid": cval.characterValueId,
                        "V":   cval.characterValueDisplayName
                    })

                    //保存商品信息
                    items.push(item);
                    priceSkus.push(cval.partNumber);
                    priceSid.push(sid);
                    if(_.findIndex(colorSkus, {"vid":cval.characterValueId}) == -1){
                        colorSkus.push({
                            "vid": cval.characterValueId,
                            "skuid": cval.partNumber
                        });
                    }

                })
            } else{
                var type = {'version':1};   //类型对应id
                var version = {
                    "Id": 1 ,
                    "Name":"",
                    "Values":[]
                };
                //循环类型
                versionList.forEach(function(vval){
                    version.Name = vval.characterDisplayName;
                    var valueId = vval.characterValueId;
                    var ImageUrls = [];
                    version.Values.push({
                        "ValueId": valueId,
                        "Name": vval.characterValueDisplayName,
                    });

                    var item = {
                        "Unique":"cn.suning."+vval.partNumber,
                        "Attr":[],
                        "Offers": [{
                            "Merchant": {
                                "Name":"suning"
                            },
                            "List":[
                                {
                                    "Price": 0,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };

                    item.Attr.push({
                        "Nid": version.Id,
                        "N":   version.Name,
                        "Vid": vval.characterValueId,
                        "V":   vval.characterValueDisplayName
                    })

                    //保存商品信息
                    items.push(item);
                    priceSkus.push(vval.partNumber);
                    priceSid.push(sid);
                })
            }
        }

        
    
    } else if(itemType == 3){//手机
        var colorList = body.data.data1.data.ItemClusterDisplayVO.colorList;
        var versionList = body.data.data1.data.ItemClusterDisplayVO.versionList;
        var clusterPartMap =  body.data.data1.data.ItemClusterDisplayVO.clusterPartMap;

        if (colorList.length>0 && versionList.length>0 && clusterPartMap){//都存在
            var type = {'color':1, 'version': 2};   //类型对应id
            var color = {
                "Id": 1 ,
                "Name":"",
                "Values":[]
            };
            var version = {
                "Id": 2 ,
                "Name":"",
                "Values":[]
            };
            //循环类型
            colorList.forEach(function(cval){
                if (typeof clusterPartMap[cval.characterValueId] != 'undefined'){
                    color.Name = cval.characterName;
                    var valueId = cval.characterValueId;
                    var ImageUrls = [];
                    color.Values.push({
                        "ValueId": valueId,
                        "Name": cval.characterValueName,
                        "ImageUrls": ImageUrls
                    });
                    versionList.forEach(function(vval){
                        if (typeof clusterPartMap[cval.characterValueId][vval.characterValueId] != 'undefined'){
                            var item = {
                                "Unique":"cn.suning."+clusterPartMap[cval.characterValueId][vval.characterValueId],
                                "Attr":[],
                                "Offers": [{
                                    "Merchant": {
                                        "Name":"suning"
                                    },
                                    "List":[
                                        {
                                            "Price": 0,
                                            "Type": "RMB"
                                        }
                                    ]
                                }]
                            };

                            item.Attr.push({
                                "Nid": color.Id,
                                "N":   color.Name,
                                "Vid": cval.characterValueId,
                                "V":   cval.characterValueName
                            })

                            item.Attr.push({
                                "Nid": version.Id,
                                "N":   vval.characterName,
                                "Vid": vval.characterValueId,
                                "V":   vval.characterValueName
                            })

                            //保存商品信息
                            items.push(item);
                            priceSkus.push(clusterPartMap[cval.characterValueId][vval.characterValueId]);
                            priceSid.push(sid);
                            if(_.findIndex(colorSkus, {"vid":cval.characterValueId}) == -1){
                                colorSkus.push({
                                    "vid": cval.characterValueId,
                                    "skuid": clusterPartMap[cval.characterValueId][vval.characterValueId]
                                });
                            }


                            //存储版本
                            version.Name = vval.characterName;
                             if(_.findIndex(version.Values, {"Name":vval.characterValueName}) == -1){
                                var valueId = vval.characterValueId;

                                version.Values.push({
                                    "ValueId": valueId,
                                    "Name": vval.characterValueName,
                                });
                            }

                        }
                    }) 
                }
        
            });
                
        } else {colorList.length>0 || versionList.length>0}{//一种属性 例如相机
            if (colorList){
                var type = {'color':1};   //类型对应id
                var color = {
                    "Id": 1 ,
                    "Name":"",
                    "Values":[]
                };

                //循环类型
                colorList.forEach(function(cval){
                    color.Name = cval.characterName;
                    var valueId = cval.characterValueId;
                    var ImageUrls = [];
                    color.Values.push({
                        "ValueId": valueId,
                        "Name": cval.characterValueName,
                        "ImageUrls": ImageUrls
                    });

                    var item = {
                        "Unique":"cn.suning."+cval.partNumber,
                        "Attr":[],
                        "Offers": [{
                            "Merchant": {
                                "Name":"suning"
                            },
                            "List":[
                                {
                                    "Price": 0,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };

                    item.Attr.push({
                        "Nid": color.Id,
                        "N":   color.Name,
                        "Vid": cval.characterValueId,
                        "V":   cval.characterValueName
                    })

                    //保存商品信息
                    items.push(item);
                    priceSkus.push(cval.partNumber);
                    priceSid.push(sid);
                    if(_.findIndex(colorSkus, {"vid":cval.characterValueId}) == -1){
                        colorSkus.push({
                            "vid": cval.characterValueId,
                            "skuid": cval.partNumber
                        });
                    }

                })
            } else{
                var type = {'version':1};   //类型对应id
                var version = {
                    "Id": 1 ,
                    "Name":"",
                    "Values":[]
                };
                //循环类型
                versionList.forEach(function(vval){
                    version.Name = vval.characterName;
                    var valueId = vval.characterValueId;
                    var ImageUrls = [];
                    version.Values.push({
                        "ValueId": valueId,
                        "Name": vval.characterValueName,
                    });

                    var item = {
                        "Unique":"cn.suning."+vval.partNumber,
                        "Attr":[],
                        "Offers": [{
                            "Merchant": {
                                "Name":"suning"
                            },
                            "List":[
                                {
                                    "Price": 0,
                                    "Type": "RMB"
                                }
                            ]
                        }]
                    };

                    item.Attr.push({
                        "Nid": version.Id,
                        "N":   version.Name,
                        "Vid": vval.characterValueId,
                        "V":   vval.characterValueName
                    })

                    //保存商品信息
                    items.push(item);
                    priceSkus.push(vval.partNumber);
                    priceSid.push(sid);
                })
            }

        }
        

    } else{//其他 还没发现
        callback({
            "Errors":{
                'Code': 'Fatal',
                "Message": '暂不支持的商品种类'
            }
        });
        return '';
    }

     var priceSkusArr = _.chunk(priceSkus,20);
     var priceSidArr = _.chunk(priceSid,20);

     var length = priceSkusArr.length + colorSkus.length;

     var ep = new eventproxy();
     ep.after('priceSkus', length, function (priceSkusItems) {
        priceSkusItems.forEach(function(priceSkusItem){
            if (priceSkusItem[0] == 'price'){
                priceSkusItem[1].forEach(function(bodyPrice){
                    if((itemIndex = _.findIndex(items, {"Unique": "cn.suning."+ bodyPrice.cmmdtyCode})) != -1){
                            if(bodyPrice.status == 1 && bodyPrice.price){
                                items[itemIndex].Offers[0].List[0].Price = bodyPrice.price;
                            }
                        }
                })
            } else {
                if((colorSkuIndex = _.findIndex(colorSkus, {"skuid":priceSkusItem[1].data.data1.data.partNumber})) != -1){
                    if((colorIndex = _.findIndex(color.Values, {"ValueId":colorSkus[colorSkuIndex].vid})) != -1){
                        var ImageUrls = [];
                        if (priceSkusItem[1].data.data1.data.itemInfoVo.imageCount == 1){
                            ImageUrls = ['http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_1.jpg'];
                        } else if (priceSkusItem[1].data.data1.data.itemInfoVo.imageCount == 2){
                            ImageUrls = [
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_1.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_2.jpg',
                                ];
                        } else if (priceSkusItem[1].data.data1.data.itemInfoVo.imageCount == 3){
                            ImageUrls = [
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_1.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_2.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_3.jpg',
                                ];
                        } else if (priceSkusItem[1].data.data1.data.itemInfoVo.imageCount == 4){
                            ImageUrls = [
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_1.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_2.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_3.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_4.jpg',
                                ];
                        } else if (priceSkusItem[1].data.data1.data.itemInfoVo.imageCount >= 5){

                            ImageUrls = [
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_1.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_2.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_3.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_4.jpg',
                                'http://image3.suning.cn/uimg/b2c/newcatentries/'+sid+'-'+priceSkusItem[1].data.data1.data.partNumber+'_5.jpg',
                                ];
                        }
                        color.Values[colorIndex].ImageUrls = ImageUrls;
                    }
                }
             }
        })

        //只获取价格存在的
        items.forEach(function(item){
            if (item.Offers[0].List[0].Price > 0){
                itemInfo.Items.push(item);
            }
        });
        

         //返回数据
        if (color) itemInfo.Variations.push(color);
        if (version) itemInfo.Variations.push(version);
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        callback(null, itemInfo);
        return ;
    })


    //获取价格
    priceSkusArr.forEach(function (priceSkuP,key) {
        getHtml('http://icps.suning.com/icps-web/getVarnishAllPrice014/'+priceSkuP.join(',')+'_010_0100101_'+priceSidArr[key].join(',')+'_1_getClusterPrice.vhtm?callback=getClusterPrice', function(bodyPrices, err){
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
                bodyPrices = bodyPrices.replace(/^getClusterPrice\(|\);?\s*$/g, '');
                bodyPrices = JSON.parse(bodyPrices);
            }catch(e){
                callback(null, bodyPrices);
                return '';
            }
            ep.emit('priceSkus', ['price', bodyPrices]);
        });
    })

    //获取图片
    if (colorSkus){
        colorSkus.forEach(function (colorSku) {
            var wap_url ="http://pas.suning.com/nssnitemsale_"+colorSku.skuid+"_"+sid+"_10_010_0100101_0_5__999__.html?callback=wapData";
            getHtml(wap_url, function(bodyColor, err){
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
                    bodyColor = bodyColor.replace(/^wapData\(|\)\s*$/g, '');
                    bodyColor = JSON.parse(bodyColor);
                }catch(e){
                    callback(null, bodyColor);
                    return '';
                }
                ep.emit('priceSkus', ['image', bodyColor]);
            });
        })
    }
    
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        gzip: true,
        headers: {
            'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
            "Accept":'*/*',
            "Accept-Encoding":"gzip, deflate, sdch",
            "Accept-Language":"zh-CN,zh;q=0.8,en;q=0.6",
            "Cache-Control":"no-cache",
            "Connection":"keep-alive",
            "Pragma":"no-cache"
        },
         //proxy: 'http://172.16.49.62:8888'
        //encoding: null
    }, function(error, response, body, callbackStatus) {

        if(!error){
            if (body.indexOf('Please retry your requests at a slower rate') > 0
                || body.indexOf('Direct connection failed, no parent proxy') > 0
            ) {
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

