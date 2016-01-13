var request = require('request');
var url  = require('url');
var querystring = require('querystring');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy')
var iconv = require('iconv-lite');
var md5 = require('md5');
var _ = require('lodash');

var proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host == 'www.yougou.com' || urlInfo.host == 'seoul.yougou.com'){
            var sku = urlInfo.path.split('/')[2].split('-');
            var sid = sku[1];       //商品id
            var pid = _.trimRight(sku[2],'.shtml');       //商品子ID
        }else{
            throw new Error();
        }
    } catch (exception) {
        callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error'
            }
        });
        return '';
    }

    var mUrl = 'http://m.yougou.com/touch/c-newbalance/sku-'+sid+'-'+pid

    getHtml(mUrl, function(body){
        if(body){
            getItemInfo({
                res:body,
                sid:sid,
                pid:pid,
                url:urlStr
            } , callback);
        }else{
            callback({
                "Errors":{
                    'Code': 'error',
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
    var $ = cheerio.load(params.res);
    var title = $('.huodong h1').first().text();

    var itemInfo = {
        Unique: 'cn.yougou.' + params.sid,
        Md5: '',
        Status: 'inStock',
        Url: params.url,
        ItemAttributes: {
            Title: title
        },
        Variations: [],
        Items: []
    };

    var n = j = i = h = f = 0;
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
    var yougouUrls = [];
    var yougouItems = [];

    //获取所有的链接
    $('.opt_color dd a').each(function(){
        if(!$(this).hasClass('checked')){
            yougouUrls.push('http://m.yougou.com/'+$(this).attr('href'))
        }
    })


    //数据处理
    var ep = new eventproxy();
    ep.after('yougouUrls', yougouUrls.length, function (yougouItems) {
          yougouItems.push(params.res);
          yougouItems.forEach(function(item){
              $ = cheerio.load(item);

              //获取所有的颜色
              j++;
              var ImageUrls = [];
              $('.pro_img img').each(function(){
                  ImageUrls.push($(this).attr('src'))
              })
              currentColor = {
                  "ValueId": type.color+_.padLeft(j, 6, 0),
                  "Name":$('.opt_color dd .checked img').attr('alt'),
                  "ImageUrls":ImageUrls
              }
              color.Values.push(currentColor);

              $('.opt_cm dd a').each(function(){
                  if((sizeIndex = _.findIndex(size.Values, {"Name": $(this).find('span').html()})) == -1){
                      //获取所有的尺寸
                      n++;
                      valueId = type.size+_.padLeft(n, 6, 0);

                      size.Values.push({
                          "ValueId": valueId,
                          "Name": $(this).find('span').html()
                      });

                      sizeIndex = size.Values.length -1;
                  }

                  colorId      = currentColor.ValueId;
                  colorName    = currentColor.Name;
                  sizeId       = size.Values[sizeIndex].ValueId;
                  sizeName     = size.Values[sizeIndex].Name;

                  //保存商品信息
                  itemInfo.Items.push({
                      "Unique":"cn.yougou."+$('input[name="productid"]').val()+":"+sizeName,
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
                              "Name":"yougou"
                          },
                          "List":[
                              {
                                  "Price": _.trimLeft($('.pro_sku .price').text(),'¥'),
                                  "Type": "RMB"
                              }
                          ]
                      }]
                  })

              })
          })


        itemInfo.Variations.push(color);
        itemInfo.Variations.push(size);
        itemInfo.Md5 = md5(JSON.stringify(itemInfo))

        callback(null, itemInfo);
        return ;
    })

    //并发取数据
    yougouUrls.forEach(function (yougouUrl) {
        getHtml(yougouUrl, function(body){
            ep.emit('yougouUrls', body);
        });
    })

   /* //发送邮件
     var sendEmail = require('./email').sendEmail;
     sendEmail({
         from: 'hanxiaolin',
         to: '724753832@qq.com',
         subject:"nodejs测试",
         content:'测试一下啦'
     },function(err,msg){
         if(err){
             console.log(err);
         }else{
             console.log('successs:'+msg.message);
         }
     })*/
}


/*
 *获取html
 **/
function getHtml(urlStr, callback){
    proxyRequest({
        url: urlStr,
        headers: {
            "referer" : "http://m.yougou.com/"
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
        callback(body);
    })
}
