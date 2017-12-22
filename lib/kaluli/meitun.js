var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');

var Q            = require('q');

var proxyRequest = require('../proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
  var urlInfo = url.parse(urlStr, true, true);
  try{
    if(urlInfo.host == 'item.meitun.com'){
      var patt = /itemDetail\/([\s\S]*?)\-0\-([\s\S]*?)\.htm/ig;
      var result = patt.exec(urlInfo.path);
      var goodsMainId = result[2];//获取连接内的商品id
    }
  }catch(exception){
    callback({//连接错误，返回失败
      "Errors":{
        'Code': 'Fatal',
        "Message": 'Url Error'
      }
    });
    return '';
  }
  var timesTamp = Date.parse(new Date());//建立时间戳
  getHtml('http://m.meitun.com/newapi/item/itemDetailService?mt=1&sku='+goodsMainId+'&topicid=186510&topicType=&promotionId=&promotionType=&regcode=250&provinceId=&protocol=http&token=', timesTamp, function (body, err) {
    if(err){//如果抓取错误，返回错误信息
      callback({
        "Errors":{
          'Code': 'Error',
          "Message": err
        }
      });
      return '';
    }
    try{//将返回信息转化为json字符串
      body = JSON.parse(body);
    }catch(exception){//转换失败则返回错误信息
      callback({
        "Errors":{
          'Code': 'Error',
          "Message": exception.message
        }
      });
      return '';
    }
    var itemInfo = {//建立返回信息
      Unique: 'item.meitun.com.'+goodsMainId,
      Md5: '',
      Status: 'inStock',
      Url: urlStr,
      ItemAttributes: {
        Title: body.data.name,
        ShopName : body.data.storeInfoResultTO.storeName,
        ShopId: '',
        ImageUrl: body.data.imagebigurl[0],
        VenderType:'普通',
        Tax:'1',
      },
      Variations: [],
      Items: []
    };
    if(body.data.hasOwnProperty('specs')){
      body.data.specs.forEach(function (spaceItem) {//循环sku属性
        var sku={}
        sku.id = spaceItem.groupid
        sku.Name = spaceItem.groupname
        sku.Values = []
        spaceItem.groupdetails.forEach(function (groupdetails) {
          var types = {}
          types.ValueId = groupdetails.specid
          types.Name = groupdetails.specname
          sku.Values.push(types)
        })
        itemInfo.Variations.push(sku)
      })
    }
    var groupid = body.data.skulist[0].skudetails[0].groupid
    var specid = body.data.skulist[0].skudetails[0].specid
    // 纯粹单规格商品的Items属性的拼装
    if(groupid == -1 && specid == -1){
      var attrs = {}
      attrs.Unique = 'meitun.com.'+body.data.skulist[0].sku
      attrs.Attr = [];
      attrs.Offers = [{
        "Merchant": {
          "Name":"meitun"
        },
        "List":[
          {
            "Price": '',
            "Type": "RMB"
          }
        ]
      }];
      itemInfo.Items.push(attrs);
    }else{
      var times = 1
      body.data.skulist.forEach(function (skulistItems) {
        times ++
        var attrs = {};
        attrs.Attr = [];
        attrs.Offers = [{
          "Merchant": {
            "Name":"meitun"
          },
          "List":[
            {
              "Price": '',
              "Type": "RMB"
            }
          ]
        }];
        getPrice(skulistItems.sku,times,attrs)

        var ll = skulistItems.skudetails
        ll.forEach(function (aas) {
          var val = {}
          val.Nid = aas.groupid
          val.N = ''
          val.Vid = aas.specid
          val.V = ''
          attrs.Attr.push(val)
        })

        //最后的加密部分
        attrs.Unique = 'meitun.com.'+skulistItems.sku
        itemInfo.Items.push(attrs);
      })
    }



    getPrice().then(function(){
      // 数据加密
      itemInfo.Md5 = md5(JSON.stringify(itemInfo));
      callback(null, itemInfo);
      return ;
    })
  })
}
function getPrice(skuId,times,attrs) {
  var timesTamp = Date.parse(new Date());//建立时间戳
  var timesTampNew = timesTamp - times*10000
  var defer = Q.defer();
  getHtml('http://m.meitun.com/newapi/item/itemDetailService?mt=2&sku='+skuId+'&topicid=186510&topicType=&promotionId=&promotionType=&regcode=250&platform=1&protocol=http', timesTampNew, function (body, err) {
    if(!err){
      try{
        var bodys = JSON.parse(body);
        if(bodys.data.hasOwnProperty('price')){
          attrs.Offers[0].List[0].Price = bodys.data.price
        }else{
          getPrice(skuId,times,attrs)
        }
      }catch(e){
        getPrice(skuId,times,attrs)
      }
    }

    return defer.resolve({});
  })
  return defer.promise;
}
function getHtml(urlStr, timeTamp, callback){
  proxyRequest({
    url: urlStr,
    headers: {
      'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
      "Accept":'*/*',
      "Accept-Encoding":"gzip, deflate",
      "Accept-Language":"zh-CN,zh;q=0.8",
      "clientInfo":"{\"clientAppVersion\":\"1.9.8\",\"clientYunyuVersion\":\"\",\"clientSystem\":\"IOS\",\"clientVersion\":\"\",\"deviceCode\":\"\",\"latitude\":\"\",\"longitude\":\"\",\"traderName\":\"\",\"partner\":\"babytree\",\"nettype\":\"unknown\",\"clientip\":\"\",\"screenwidth\":320,\"screenheight\":568}",
      "Connection":"keep-alive",
      "Content-Type":"application/x-www-form-urlencoded",
      "platform":"1",

      "Cache-Control":"no-cache",

      "Pragma":"no-cache",
      "signature":"350F163035D51E8D400114BE70EDFBFA",
      "timestamp": timeTamp,
      "token": "null",
      "X-Requested-With":"XMLHttpRequest"
    }
    // proxy: 'http://172.16.13.177:8888'
    //encoding: null
  }, function(error, response, body, callbackStatus) {
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
    callback(body, error, response);
  })
}


