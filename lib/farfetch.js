const request = require('request');
const url  = require('url');
const fs = require('fs');
// const querystring = require('querystring');
// const cheerio = require('cheerio');
const md5 = require('md5');
const _ = require('lodash');
// const eventproxy = require('eventproxy');
// const fun = require('./fun');
// const proxyRequest = require('./proxyRequestGuowai').proxyRequest;
const token_file = process.cwd()+'/farfetchtoken.txt';

// var redis = require(process.cwd()+'/apps/lib/redis.js');
const NODE_ENV = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
const AUTH_URL = config.farfetch.auth+'/connect/token';//获取token&刷新token
const DETAIL_URL = config.farfetch.api+'/v1/products/';//查看商品详情

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    try {
        if(urlInfo.host.indexOf('farfetch') != -1){
            var exp = /cn\/.*?item-(\d*)\.aspx/ig;
            var res = exp.exec(urlInfo.path);
            var productId = res[1];
            
            return getItemInfo(urlStr, productId, callback);
        } else {
            return  callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": 'Host Error'
                }
            });
        }
    } catch (exception) {
        return  callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error'
            }
        });
    }
}

/*
 *内容处理
 **/
function getItemInfo(urlStr, productId, callback) {
    var stat = fs.statSync(token_file);
    let now = Date.now();//13位 毫秒
=    if( (now - stat.mtimeMs) >= 12000 * 1000 ){//token过期
        console.log('regenerate file...');
        authToken().then(function(result){
            console.log(3);
            getProduct(result,urlStr,productId,callback);
        }).catch(function(err){
            console.log(err);
            callback(err);
        });
    }else{//token有效
        fs.readFile(token_file,'utf8',function(err,result){
            if (err) {
                return err.message;
            }
            if(result){
                getProduct(result,urlStr,productId,callback);
            }else{
                console.log('retrieve token...');
                authToken().then(function(result){
                    console.log(3);
                    getProduct(result,urlStr,productId,callback);
                }).catch(function(err){
                    console.log(err);
                    callback(err);
                });
            }
        });
    }
}

/** 授权登陆后获取token */
function authToken(){
    return new Promise((resolve, reject) =>{
        let option = {
            url: AUTH_URL,
            headers: [
            {
                name: 'content-type',
                value: 'application/x-www-form-urlencoded'
            }
            ],
            form: {
                grant_type: 'client_credentials',
                client_id: config.farfetch.clientId,
                client_secret: config.farfetch.clientSecret,
                scope: 'api'
            }
        };
        if(NODE_ENV == 'develop'){
            option.form.grant_type = 'password';
            option.form.username = config.farfetch.username;
            option.form.password = config.farfetch.password
        }
        console.log(option);
        request.post(option,function(error,response,body){
            if (!error && response.statusCode == 200) {
                let json = JSON.parse(body);
                fs.writeFileSync(token_file,json.token_type+' '+json.access_token);
                resolve(json.token_type+' '+json.access_token);
            }else{
                reject();
            }
        });
    });
}

function getProduct(token,urlStr,productId,callback){
    var itemInfo = {
        Unique: '',
        Md5: '',
        Status: 'inStock',
        Url: urlStr,
        ItemAttributes: {
            Title: '',
            ShopName : 'farfetch',
            ShopId: 'cn.farfetch',
            ImageUrl: '',
        },
        Variations: [],
        Items: [],
        Coupon:[]
    };

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

    (async () => {
        try {
            //当前页面的数据
            request.get(DETAIL_URL+productId,{
                'headers':{
                    'FF-Country':'CN',
                    'FF-Currency':'CNY',
                    'Accept-Language': 'zh-CN',
                    'Authorization':token 
                }
            },function(error,response,body){
                if (!error && response.statusCode == 200) {
                    body = JSON.parse(body);
                    color.Values.push({
                                ValueId: body.id,
                                Name: body.colors[0].color.name,
                                ImageUrls : _.map(body.images.images.filter(x=>x.size == 600),function(x){return x.url})
                            });
                    itemInfo.Unique = 'cn.farfetch.' + body.id;
                    itemInfo.Variations.push(color);

                    color.Values.forEach(col => {
                        body.variants.forEach(row=>{
                            if(row.quantity > 0){//必须有货
                                let sizeName = body.description.indexOf('鞋') != -1?row.attributes[4].value + ' ' + body.gender + ' ' +row.attributes[1].value:row.attributes[1].value;
                                size.Values.push({
                                    ValueId:  size.Values.length + 1,
                                    Name: sizeName
                                });

                                if(row.price.currencyIsoCode == 'CNY'){//必须人民币计价
                                    itemInfo.Items.push({
                                        Unique: 'cn.farfetch.' +col.ValueId+'.'+(itemInfo.Items.length+1),
                                        Attr: [
                                            {
                                                'Nid': 1,
                                                'N': '颜色',
                                                'Vid': col.ValueId,
                                                'V':  col.Name
                                            },{
                                                'Nid': 2,
                                                'N': '尺码',
                                                'Vid':  (itemInfo.Items.length+1),
                                                'V':  sizeName
                                            }
                                        ],
                                        Offers: [{
                                            Merchant: {
                                                Name: 'farfetch',
                                            },
                                            List: [{
                                                Price: Math.ceil(row.price.priceInclTaxes),
                                                Type: 'RMB'
                                            }]
                                        }]
                                    })
                                }
                            }
                        });
                    });
                    itemInfo.Variations.push(size);

                    if (itemInfo.Items.length == 0) {
                        itemInfo.Status = 'outOfStock';
                        return callback(null, itemInfo);
                    }
                    itemInfo.ItemAttributes.Title = body.brand.name + ' ' + body.shortDescription;
                    itemInfo.ItemAttributes.ImageUrl = color.Values[0].ImageUrls[0];
                    itemInfo.Md5 = md5(JSON.stringify(itemInfo));

                    return callback(null, itemInfo);
                }else{//请求失败
                    console.log(error);
                    itemInfo.Status = 'notFind';
                    return callback(body?JSON.parse(body):error);
                }
            });
            
        } catch(e) {
            return  callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": e.message
                }
            });
        }
    })();
}