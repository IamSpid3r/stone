var request = require('request');
var md5 = require('md5');
var stringRandom = require('string-random');

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
// var ttid = "10001401@taobao_android_8.0.0";
var features = "27";
var v = "3.2";
var api = "mtop.taobao.idle.main.item.search";
var t = Date.parse(new Date())/1000;
// var comment_str = "不错的评价，有用";

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
    Get_xsign(data, xuid, t, utdid, appKey, lat, lng, api, v, sid, ttid, deviceId, features,function(xsign,signTime){

    var url = "http://guide-acs.m.taobao.com/gw/"+api+"/" + v + "/";
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

    function call(error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(response);
        var info = JSON.parse(body);
        console.log('-------------------------------------------');
        console.log(info);
        callback(null,info);
      }else{
        callback(error,{});
      }
    }
    request({
      method: 'post',
      url: url,
      headers: headers,
      form: {data:data}
    }, call);


  })
}


// ' http.Open (“GET”, “https://guide-acs.m.taobao.com/gw/” ＋ api ＋ “/” ＋ v ＋ “/?data=” ＋ 编码_URL编码 (data, 真, 真))
// http.Open (“GET”, “https://guide-acs.m.taobao.com/gw/” ＋ api ＋ “/” ＋ v ＋ “?type=originaljson&data=” ＋ 编码_URL编码 (data, 真, 真))
// http.SetRequestHeader (“x-appkey”, appKey, )
// http.SetRequestHeader (“x-t”, t, )
// http.SetRequestHeader (“x-pv”, “5.2”, )
// http.SetRequestHeader (“x-sign”, xsign, )
// http.SetRequestHeader (“x-features”, features, )
// http.SetRequestHeader (“x-location”, lng ＋ “%2C” ＋ lat, )
// http.SetRequestHeader (“x-ttid”, ttid, )
// http.SetRequestHeader (“x-utdid”, utdid, )
// http.SetRequestHeader (“x-devid”, deviceId, )
// http.SetRequestHeader (“x-uid”, xuid, )
// http.SetRequestHeader (“x-sid”, sid, )
// console.log(Buffer.from(data, 'utf8'))
// console.log(md5(Buffer.from(data, 'utf8')))
// data ＝ 取文本 (“{'cheapestMoney':'99900','detail_v':'3.1.7','from':'detail','isAsy':'1','isAsyn':'1','itemId':'572671020154','pageType':'weex','sellerId':'1664752604','sellerType':'B','ttid':'10001401@taobao_android_8.0.0'}”, )
// api ＝ “mtop.macao.market.activity.applycoupon.querycouponsfordetail”



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
