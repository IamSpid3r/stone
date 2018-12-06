var request = require('request');
var md5 = require('md5');
var stringRandom = require('string-random');
var Q = require('q');
const NODE_ENV = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');

//unb=336134075 munb=336134075
var xuid = "";
//cookie2=
var sid = "";

var deviceId = stringRandom(44);
var utdid = stringRandom(24);
console.log(deviceId,utdid)
var appKey = "21646297";
var lat = "30.91966";
var lng ="121.614151";
var ttid = "219201@taobao_android_7.6.0";
var features = "27";
var t = Date.parse(new Date())/1000;

/**
 * 咸鱼根据 关键词 获取鱼塘id
 */
function getPoolId(params,callback){
    let data_obj = {
        keyword:params.keyword,
        pageNumber:params.page,
        // city:'上海',
        // gps:'31.271676,121.476',
        // latitude:'31.271676',
        // longitude:'121.476',
        // pageSize:20
    }
    var data = JSON.stringify(data_obj);
    Get_xsign(data, xuid, t, utdid, appKey, lat, lng, config.idlefish.poolid_api, config.idlefish.poolid_v, sid, ttid, deviceId, features,function(xsign,signTime){

        var url = "http://guide-acs.m.taobao.com/gw/"+config.idlefish.poolid_api+"/" + config.idlefish.poolid_v + "/";
        headers = {
            'x-appkey': appKey,
            'x-t':signTime,
            'x-pv':"5.1",
            "x-sign":xsign,
            "x-features":features,
            "x-location":lng+"%2C"+lat,
            "x-ttid":ttid,
            "x-utdid":utdid,
            "x-devid":deviceId,
            "x-uid":xuid,
            "x-sid":sid
        };

        proxyRequest({
                method: 'post',
                url: url,
                headers: headers,
                form: {data:data}
            },function(error, body,response={}) {
                if(error){
                    callback(error,{});
                    return ;
                }
                var info = JSON.parse(body);
                console.log('-------------------------------------------');
                console.log(info);
                console.log(info.data.cardList);
                info && info.data && info.data.cardList && info.data.cardList.forEach(element => {
                    console.log(element);
                });
                callback(null,info);
            }
        );
    });
}
// getPoolId({keyword:'篮球鞋爱好者平台',page:1},x=>{});

/**
 * 咸鱼鱼塘列表
 */
exports.getPoolList = function(params, callback){
    var [api,v,data_obj] = [];
    if(params.isarea == '1'){//地域鱼塘
        console.log(111);
        data_obj = {
            poolId:params.id,
            pageNumber:params.page,
            pageSize:20
        }
        api = config.idlefish.poolarea_api;
        v = config.idlefish.poolarea_v;
    }else{
        data_obj = {
            fishpoolId:params.id,
            fishpoolTopicId:'1994818',
            fishpoolTopicName:'大杂烩',
            // gps:'31.271676,121.476',
            topicCreateType:0,
            topicRule:{fishpoolId:params.id},
            topicSeq:0
        }
        api = config.idlefish.poollist_api;
        v = config.idlefish.poollist_v;
    }

    var data = JSON.stringify(data_obj);
    Get_xsign(data, xuid, t, utdid, appKey, lat, lng, api, v, sid, ttid, deviceId, features,function(xsign,signTime){
        var url = "http://guide-acs.m.taobao.com/gw/"+ api +"/" + v + "/";
        headers = {
            'x-appkey': appKey,
            'x-t':signTime,
            'x-pv':"5.1",
            "x-sign":xsign,
            "x-features":features,
            "x-location":lng+"%2C"+lat,
            "x-ttid":ttid,
            "x-utdid":utdid,
            "x-devid":deviceId,
            "x-uid":xuid,
            "x-sid":sid
        };

        proxyRequest({
                method: 'post',
                url: url,
                headers: headers,
                form: {data:data}
            },function(error, body,response={}) {
                if(error){
                    callback(error,{});
                    return ;
                }
                var info = JSON.parse(body);
                console.log('-------------------------------------------');
                console.log(info);
                callback(null,info);
            }
        );
    });
}

/**
 * 咸鱼商品列表
 */
exports.doSearch = function( params , callback){
    var comment_object = {
      "gps": "31.271684,121.475946",
      "activeSearch": true,
      "bizFrom": "home",
      "categoryId": 0,
      "fromKits": false,
      "fromLeaf": false,
      "fromShade": false,
      "fromSuggest": false,
      "keyword": params.keyword || "nike",
      "mType": {
        "mFrom": "fromPush",
        "mParam": "paramHistory"
      },
      "noSelect": false,
      "originJson": false,
      "pageNumber": params.page || 1,
      "parentCategoryId": 0,
      "recommend": false,
      "rowsPerPage": 10,
      "shadeBucketNum": -1,
      "suggestBucketNum": 2
    };

    // var data_obj = {"submit":JSON.stringify(comment_object)};

    var data = JSON.stringify(comment_object);
    Get_xsign(data, xuid, t, utdid, appKey, lat, lng, config.idlefish.fishlist_api, config.idlefish.fishlist_v, sid, ttid, deviceId, features,function(xsign,signTime){

    var url = "http://guide-acs.m.taobao.com/gw/"+config.idlefish.fishlist_api+"/" + config.idlefish.fishlist_v + "/";
    headers = {
        'x-appkey': appKey,
        'x-t':signTime,
        'x-pv':"5.1",
        "x-sign":xsign,
        "x-features":features,
        "x-location":lng+"%2C"+lat,
        "x-ttid":ttid,
        "x-utdid":utdid,
        "x-devid":deviceId,
        "x-uid":xuid,
        "x-sid":sid
    };

    proxyRequest({
        method: 'post',
        url: url,
        headers: headers,
        form: {data:data}
      },function(error, body,response={}) {
        if(error){
            callback(error,{});
            return ;
        }
        var info = JSON.parse(body);
        console.log('-------------------------------------------');
        console.log(info);
        callback(null,info);
      }
    );
    });
}

function Get_xsign(data, xuid, t, utdid, appKey, lat, lng, api, v, sid, ttid, deviceId, features ,call) {
    var param = [];
    param.push("data="+encodeURIComponent(data));
    console.log(md5(Buffer.from(data, 'utf8')))
    param.push("xuid="+xuid);
    param.push("t="+t);
    param.push("utdid="+utdid);
    param.push("appKey="+appKey);
    param.push("lat="+lat);
    param.push("lng="+lng);
    param.push("api="+api);
    param.push("v="+v);
    param.push("sid="+sid);
    param.push("ttid="+ttid);
    param.push("deviceId="+deviceId);
    param.push("features="+features);
    console.log('http://van.shihuo.cn:7891/?'+param.join("&"));
    request('http://van.shihuo.cn:7891/?'+param.join("&"), function (error, response, body) {
      console.log('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      console.log('body:', body); // Print the HTML for the Google homepage.
      var arr = JSON.parse(body);
      console.log("sign:"+arr.sign)
      call(arr.sign,arr.time)
    });
    // body...

}
function randomString(expect){
    var str=Math.random().toString(100).substring(2);
    while(str.length<expect){
        str=Math.random().toString(100).substring(2)
    }
    return str.substring(0,expect);
}

/*
 *获取html
 **/
function proxyRequest(opt,callback){
      var developUrl = 'http://121.41.100.22:3333/proxyGet?add=1';
      Q('get').then(function(success){
          var defer = Q.defer();
          request({url:developUrl,timeout:2000}, function (error, response, body) {
              if (!error && response.statusCode == 200) {
                  body = JSON.parse(body);
                  if(body.status == 'ok'){
                    opt.proxy = 'http://'+body.Ip.Ip+':'+body.Ip.Port;
                      defer.resolve('success');
                  }
              }else{
                  defer.reject('代理服务器错误');
              }
          })
          return defer.promise;
      }).then(function(success){
          console.log(opt);
          request(opt,function(error,response,body) {
              if (!error && response.statusCode == 200) {
                  callback(null, body, response);
              }else{
                  console.log(error);
                  callback(error, null, null);
              }
          })
      },function(rejected){
          callback(rejected, null, null);
      })
  
}
