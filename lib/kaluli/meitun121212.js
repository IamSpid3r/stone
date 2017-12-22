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
  if(urlInfo.host == 'item.meitun.com'){
    var patt = /itemDetail\/([\s\S]*?)\-0\-([\s\S]*?)\.htm/ig;


    var result = patt.exec(urlInfo.path);
    if (!result) {
      callback({
        "Errors":{
          'Code': 'Fatal',
          "Message": 'url error no math goods id'
        }
      });
      return ;
    }
    // 获取到商品的主分类id
    var goods_main_id = result[1],
      goods_this_id = result[2];
    // 抓取商品页面数据
    getHtml(urlStr, function(body, err, response){
      if(err){
        callback({
          "Errors":{
            'Code': 'Error',
            "Message": err
          }
        });
        return ;
      }

      if(body && response.statusCode == 200){
        // getItemInfo({body : body, goods_type_id : result[1], goods_mian_id : result[2], url:urlStr} , callback);

        var goods_type_id = result[1],
          goods_main_id = result[2],
          body     = body,
          url      = urlStr;
        // 将需要的数据挨个匹配出来
        var regexplistSkus = /\<div id=\"listSkus\" style="display:none\"\>([\s\S]*?)\<\/div>/ig;
        var regexplistSpecGroup = /\<div id=\"listSpecGroup\" style="display:none\"\>([\s\S]*?)\<\/div>/ig;
        var regexpskuInfos = /\<div id=\"skuInfos\" style="display:none\"\>([\s\S]*?)\<\/div>/ig;
        var listSkus = regexplistSkus.exec(body);
        var listSpecGroup = regexplistSpecGroup.exec(body);
        var skuInfos = regexpskuInfos.exec(body);
        if(!listSkus){
          var notFoundReg = /404-找不到页面/ig;
          if(notFoundReg.exec(body)){//not found
            var itemInfo = {
              Unique: 'cn.meitun.' + goods_type_id + '-0-' + goods_main_id,
              Md5: '',
              Status: 'notFind',
              Url: url,
              Tax: '',
              ItemAttributes: {},
              Variations: [],
              Items: []
            };
            callback(null, itemInfo);
            return ;
          }else{// regexp error
            callback({
              "Errors":{
                'Code': 'Error',
                "Message": 'goods not found'
              }
            });
            return ;
          }
        }

        try {
          // eval(result[1]);
        } catch (exception) {
          callback({
            "Errors":{
              'Code': 'Error',
              "Message": exception
            }
          });
          return ;
        }
        // 组建数据
        var itemInfo = {
          Unique: 'cn.meitun.' + goods_type_id + '-0-' + goods_main_id,
          Md5: '',
          Status: 'inStock',
          Url: url,
          Tax: '',
          ItemAttributes: {
            Title: '',
            ShopName : '考拉海购',
            ShopId: 'cn.kaola',
            ImageUrl: '',
          },
          Variations: [],
          Items: []
        };

        // 获取标题
        var titleregexp = /\<span class=\"mlr5\"\>\>\<\/span\>([\s\S]*?)\<\/div>/ig;
        var titleResult = titleregexp.exec(body);
        itemInfo.ItemAttributes.Title = titleResult[1]
        //获取首图
        var imgregexp = /\<img alt\=\"([\s\S]*?)\<\/div>/ig;
        var imgResult = imgregexp.exec(body);
        var z = imgResult[1]
        var imgs = /src\=\"([\s\S]*?)\"/;
        var imgage = imgs.exec(z)
        itemInfo.ItemAttributes.ImageUrl = imgage[1]
        // 组装Variations数据
        var sku_group = JSON.parse(listSpecGroup[1]);
        for(var i = 0; i<sku_group.length; i ++){
          var attr = {}
          attr.Id = sku_group[i].specGroupDO.code
          attr.Name = sku_group[i].specGroupDO.name
          attr.Values = []

          for(var j = 0; j<sku_group[i].specDoList.length; j++){
            var types = {}
            types.ValueId = sku_group[i].specDoList[j].id
            types.Name = sku_group[i].specDoList[j].spec
            attr.Values.push(types)
          }

          itemInfo.Variations.push(attr)
        }
        // 组装Items数据
        // 先将attr数据组装好
        // 两种规格的
        var length = itemInfo.Variations.length
        if( length == 2){
          var typeO = itemInfo.Variations[0]
          var typeT = itemInfo.Variations[1]
          var typeOne = itemInfo.Variations[0].Values
          var typetwo = itemInfo.Variations[1].Values
          for(var i = 0; i<typeOne.length; i++){
            var val = {};
            val.Nid = typeO.Id
            val.N = typeO.Name
            val.Vid = typeOne[i].ValueId
            val.V = typeOne[i].Name
            for(var j = 0; j<typetwo.length; j++){
              var attrs = {};
              attrs.attr = [];
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

              var val2 = {};
              val2.Nid = typeT.Id
              val2.N = typeT.Name
              val2.Vid = typetwo[j].ValueId
              val2.V = typetwo[j].Name

              attrs.attr.push(val)
              attrs.attr.push(val2)
              itemInfo.Items.push(attrs);
            }
          }
        }else if(length == 1){
          var typeO = itemInfo.Variations[0]
          var typeOne = itemInfo.Variations[0].Values
          for(var i = 0; i<typeOne.length; i++){
            var val = {};
            val.Nid = typeO.Id
            val.N = typeO.Name
            val.Vid = typeOne[i].ValueId
            val.V = typeOne[i].Name


            var attrs = {};
            attrs.attr = [];
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
            attrs.attr.push(val)
            itemInfo.Items.push(attrs);
          }
        }
        // 两层组装Unique数据
        var listSkusVal = JSON.parse(listSkus[1])//显示出原网页的服装组合值
        listSkusVal.forEach(function (listSkusVal) {
          var listSkusValString = eval(listSkusVal.listSpec)
          for(var i = 0; i< itemInfo.Items.length; i++){//遍历Items
            var ItemAttr = itemInfo.Items[i].attr
            var size = ItemAttr[0].Vid
            var color = ItemAttr[1].Vid

            var listSkusValStringColor = listSkusValString[0].specId
            var listSkusValStringSize = listSkusValString[1].specId
            if((size == listSkusValStringSize)&&(color == listSkusValStringColor)){
              itemInfo.Items[i].Unique = 'meitun.' + goods_type_id + '-0-' + listSkusVal.sku
            }
          }
        })
        itemInfo.Items.forEach(function (itemsId) {
          if(itemsId.Unique !=''){
            var unique = itemsId.Unique.replace('meitun.','')
            getHtml('item.meitun.com/itemDetail/3059882-0-07020402400301.html',function (body, err) {
              // console.log(err)
            })
          }
        })
        // 加密部分。。执行最后的数据返回
        itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        if(itemInfo.Items.length > 0){
          // itemInfo.Variations = attribute;
          // itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        }else{
          itemInfo.Status = 'outOfStock';
        }

        callback(null, itemInfo);
        return ;
        //换机结束
      }else{
        callback({
          "Errors":{
            'Code': 'Error',
            "Message": 'body null or status code not equal 200'
          }
        });
        return ;
      }
    })
  }else{
    callback({
      "Errors":{
        'Code': 'Fatal',
        "Message": 'url error'
      }
    });
    return ;
  }
}
/*
 *内容处理
 **/
/*function getItemInfo(params, callback) {
  var goods_type_id = params.goods_type_id,
    goods_main_id = params.goods_mian_id,
    body     = params.body,
    url      = params.url;
  // 将需要的数据挨个匹配出来
  var regexplistSkus = /\<div id=\"listSkus\" style="display:none\"\>([\s\S]*?)\<\/div>/ig;
  var regexplistSpecGroup = /\<div id=\"listSpecGroup\" style="display:none\"\>([\s\S]*?)\<\/div>/ig;
  var regexpskuInfos = /\<div id=\"skuInfos\" style="display:none\"\>([\s\S]*?)\<\/div>/ig;
  var listSkus = regexplistSkus.exec(body);
  var listSpecGroup = regexplistSpecGroup.exec(body);
  var skuInfos = regexpskuInfos.exec(body);
  if(!listSkus){
    var notFoundReg = /404-找不到页面/ig;
    if(notFoundReg.exec(body)){//not found
      var itemInfo = {
        Unique: 'cn.meitun.' + goods_type_id + '-0-' + goods_main_id,
        Md5: '',
        Status: 'notFind',
        Url: url,
        Tax: '',
        ItemAttributes: {},
        Variations: [],
        Items: []
      };
      callback(null, itemInfo);
      return ;
    }else{// regexp error
      callback({
        "Errors":{
          'Code': 'Error',
          "Message": 'goods not found'
        }
      });
      return ;
    }
  }

  try {
    // eval(result[1]);
  } catch (exception) {
    callback({
      "Errors":{
        'Code': 'Error',
        "Message": exception
      }
    });
    return ;
  }
  // 组建数据
  var itemInfo = {
    Unique: 'cn.meitun.' + goods_type_id + '-0-' + goods_main_id,
    Md5: '',
    Status: 'inStock',
    Url: url,
    Tax: '',
    ItemAttributes: {
      Title: '',
      ShopName : '考拉海购',
      ShopId: 'cn.kaola',
      ImageUrl: '',
    },
    Variations: [],
    Items: []
  };

  // 获取标题
  var titleregexp = /\<span class=\"mlr5\"\>\>\<\/span\>([\s\S]*?)\<\/div>/ig;
  var titleResult = titleregexp.exec(body);
  itemInfo.ItemAttributes.Title = titleResult[1]
  //获取首图
  var imgregexp = /\<img alt\=\"([\s\S]*?)\<\/div>/ig;
  var imgResult = imgregexp.exec(body);
  var z = imgResult[1]
  var imgs = /src\=\"([\s\S]*?)\"/;
  var imgage = imgs.exec(z)
  itemInfo.ItemAttributes.ImageUrl = imgage[1]
  // 组装Variations数据
  var sku_group = JSON.parse(listSpecGroup[1]);
  for(var i = 0; i<sku_group.length; i ++){
    var attr = {}
    attr.Id = sku_group[i].specGroupDO.code
    attr.Name = sku_group[i].specGroupDO.name
    attr.Values = []

    for(var j = 0; j<sku_group[i].specDoList.length; j++){
      var types = {}
      types.ValueId = sku_group[i].specDoList[j].id
      types.Name = sku_group[i].specDoList[j].spec
      attr.Values.push(types)
    }

    itemInfo.Variations.push(attr)
  }
  // 组装Items数据
  // 先将attr数据组装好
  // 两种规格的
  var length = itemInfo.Variations.length
  if( length == 2){
    var typeO = itemInfo.Variations[0]
    var typeT = itemInfo.Variations[1]
    var typeOne = itemInfo.Variations[0].Values
    var typetwo = itemInfo.Variations[1].Values
    for(var i = 0; i<typeOne.length; i++){
      var val = {};
      val.Nid = typeO.Id
      val.N = typeO.Name
      val.Vid = typeOne[i].ValueId
      val.V = typeOne[i].Name
      for(var j = 0; j<typetwo.length; j++){
        var attrs = {};
        attrs.attr = [];
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

        var val2 = {};
        val2.Nid = typeT.Id
        val2.N = typeT.Name
        val2.Vid = typetwo[j].ValueId
        val2.V = typetwo[j].Name

        attrs.attr.push(val)
        attrs.attr.push(val2)
        itemInfo.Items.push(attrs);
      }
    }
  }else if(length == 1){
    var typeO = itemInfo.Variations[0]
    var typeOne = itemInfo.Variations[0].Values
    for(var i = 0; i<typeOne.length; i++){
      var val = {};
      val.Nid = typeO.Id
      val.N = typeO.Name
      val.Vid = typeOne[i].ValueId
      val.V = typeOne[i].Name


      var attrs = {};
      attrs.attr = [];
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
      attrs.attr.push(val)
      itemInfo.Items.push(attrs);
    }
  }
  // 两层组装Unique数据
  var listSkusVal = JSON.parse(listSkus[1])//显示出原网页的服装组合值
  listSkusVal.forEach(function (listSkusVal) {
    var listSkusValString = eval(listSkusVal.listSpec)
    for(var i = 0; i< itemInfo.Items.length; i++){//遍历Items
      var ItemAttr = itemInfo.Items[i].attr
      var size = ItemAttr[0].Vid
      var color = ItemAttr[1].Vid

      var listSkusValStringColor = listSkusValString[0].specId
      var listSkusValStringSize = listSkusValString[1].specId
      if((size == listSkusValStringSize)&&(color == listSkusValStringColor)){
        itemInfo.Items[i].Unique = 'meitun.' + goods_type_id + '-0-' + listSkusVal.sku
      }
    }
  })
  itemInfo.Items.forEach(function (itemsId) {
    if(itemsId.Unique !=''){
      var unique = itemsId.Unique.replace('meitun.','')
      getHtml('item.meitun.com/itemDetail/3059882-0-07020402400301.html',function(body,err){
        // console.log(itemInfo.Items[i].Offers[0].List[0].Type)
      })
    }
  })
  // 加密部分。。执行最后的数据返回
  itemInfo.Md5 = md5(JSON.stringify(itemInfo));
  if(itemInfo.Items.length > 0){
    // itemInfo.Variations = attribute;
    // itemInfo.Md5 = md5(JSON.stringify(itemInfo));
  }else{
    itemInfo.Status = 'outOfStock';
  }

  callback(null, itemInfo);
  return ;
}*/

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


