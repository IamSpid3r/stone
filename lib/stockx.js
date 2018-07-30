const request = require('request');
const url  = require('url');
const querystring = require('querystring');
const cheerio = require('cheerio');
const md5 = require('md5');
const _ = require('lodash');
const eventproxy = require('eventproxy');
const fun = require('./fun');

const proxyRequest = require('./proxyRequest').proxyRequest;

exports.getInfo = function(urlStr, callback) {
    var urlInfo = url.parse(urlStr, true, true);
    
    try {
        if(urlInfo.host.indexOf('stockx') != -1){
            var productId = _.replace(urlInfo.path,'/buy/','');
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
    var itemInfo = {
        Unique: '',
        Md5: '',
        Status: 'inStock',
        Url: urlStr,
        ItemAttributes: {
            Title: '',
            ShopName : 'stockx',
            ShopId: 'cn.stockx',
            ImageUrl: '',
        },
        Variations: [],
        Items: [],
        Coupon:[]
    };
    
    //不存在颜色item
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
            var allSkuResults = [];
            //当前页面的数据
            var json = await getHtml('https://stockx.com/api/products/'+productId+'?includes=market');

            if(json){
                json = JSON.parse(json);
                //写入所有sku数组
                for(let x in json.Product.children){
                    if(json.Product.children[x].market.lowestAsk > 0){
                        allSkuResults.push(json.Product.children[x]);
                    }
                }
            }else{
                throw new Error('request failed');
            }
            
            //items 按尺码排序
            allSkuResults.sort(function (a, b) {
                return a.shoeSize - b.shoeSize;
            });

            //config color
            color.Values.push({
                ValueId: json.Product.id,
                Name: json.Product.colorway,
                ImageUrls : [json.Product.media.imageUrl]
            })
            
            allSkuResults.forEach(function (result) {
                
                //国际尺码 ＝》国内尺码 [先满足有货]
                size.Values.push({
                    ValueId:  size.Values.length + 1,
                    Name: result.sizeTitle + ' ' + result.shoeSize
                })
                
                //item
                itemInfo.Items.push({
                    Unique: 'cn.stockx.' + result.id,
                    Attr: [
                        {
                            'Nid': 1,
                            'N': '颜色',
                            'Vid': json.Product.id,
                            'V':  json.Product.colorway
                        }, 
                        {
                            'Nid': 2,
                            'N': '尺码',
                            'Vid':  size.Values.length ,
                            'V':  result.sizeTitle + ' ' + result.shoeSize
                        }
                    ],
                    Offers: [{
                        Merchant: {
                            Name: 'stockx',
                        },
                        List: [{
                            Price: result.market.lowestAsk,
                            Type: 'RMB'
                        }]
                    }]
                })
            })

            if (itemInfo.Items.length == 0) {
                itemInfo.Status = 'outOfStock';
                return callback(null, itemInfo);
            }

            //属性
            itemInfo.Unique = 'cn.stockx.' + json.Product.id;
            itemInfo.Variations.push(color);
            itemInfo.Variations.push(size);
            //基本信息
            itemInfo.ItemAttributes.Title = json.Product.title;
            itemInfo.ItemAttributes.ImageUrl = json.Product.media.imageUrl;

            itemInfo.Md5 = md5(JSON.stringify(itemInfo))
            return callback(null, itemInfo);
        } catch(e) {
            return  callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": e.message
                }
            });
        }
    })()
}

function getHtml(urlStrs) {
    return new Promise((resolve, reject) => {
        if (typeof urlStrs != 'object') {
            urlStrs = [urlStrs];
        }
        //wait all requests
        var ep = new eventproxy();
        ep.after('getHtml', urlStrs.length, function (body) {
            var contents = [];
            var isError = false;
            for (let i=0;i<body.length;i++) {
                if (body[i].err) {
                    isError = body[i].err;
                    break;
                } else {
                    contents.push(body[i].body)
                }
            }

            if (isError) {
                reject(isError);
            } else {
                resolve(contents);
            }
        })

        //request
        urlStrs.forEach(function (urlStr) {
            let options = {
                url: urlStr,
                gzip: true,
                timeout: 8000,
                headers: {
                    'authority': 'stockx.com',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
                    "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    "accept-encoding": "gzip, deflate, br",
                    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
                    "cache-control": "no-cache",
                    "pragma": "no-cache",
                    'upgrade-insecure-requests' : 1,
                    "referer": _.replace(urlStr,'/buy/',''),
                    "cookie" : '__cfduid=d1551546de2185f852609c3aefc8b4a131532656477; cto_lwid=33ac073c-25e5-4285-95af-223cc294f542; _ga=GA1.2.1191820825.1532656488; tracker_device=fd3831c4-beed-4a63-b323-7c2af426f0b2; _tl_duuid=83abe296-7250-4ba1-85eb-b100cce5e393; _tl_auid=5b5a7b6e5540e50052da69fd; rskxRunCookie=0; rCookie=9w3yk1tpggasbwu5gk7fam; stockx_seen_bid_new_info=true; PHPSESSID=4j0ah118jnhf8oq97ku8o2fp03; stockx_homepage=sneakers; stockx_seen_ask_new_info=true; _sp_ses.1a3e=*; _gid=GA1.2.1860514361.1532915656; _tl_csid=3f3107f3-e0af-48af-810c-ea4db12f75f7; _tl_sid=5b5e70b3d87346001a0ed706; lastRskxRun=1532916310373; stockx_product_visits=14; _gat=1; tl_sopts_3f3107f3-e0af-48af-810c-ea4db12f75f7_p_p_n=JTJGYnV5JTJGYWRpZGFzLXllZXp5LWJvb3N0LTM1MC12Mi1idXR0ZXI=; tl_sopts_3f3107f3-e0af-48af-810c-ea4db12f75f7_p_p_l_h=aHR0cHMlM0ElMkYlMkZzdG9ja3guY29tJTJGYnV5JTJGYWRpZGFzLXllZXp5LWJvb3N0LTM1MC12Mi1idXR0ZXI=; tl_sopts_3f3107f3-e0af-48af-810c-ea4db12f75f7_p_p_l_t=QnV5JTIwJTI2JTIwU2VsbCUyMERlYWRzdG9jayUyMFNob2VzJTIwLSUyMFJlYWwlMjBZZWV6eXMlMkMlMjBSZXRybyUyMEpvcmRhbnMlMkMlMjBOaWtl; tl_sopts_3f3107f3-e0af-48af-810c-ea4db12f75f7_p_p_l=JTdCJTIyaHJlZiUyMiUzQSUyMmh0dHBzJTNBJTJGJTJGc3RvY2t4LmNvbSUyRmJ1eSUyRmFkaWRhcy15ZWV6eS1ib29zdC0zNTAtdjItYnV0dGVyJTIyJTJDJTIyaGFzaCUyMiUzQSUyMiUyMiUyQyUyMnNlYXJjaCUyMiUzQSUyMiUyMiUyQyUyMmhvc3QlMjIlM0ElMjJzdG9ja3guY29tJTIyJTJDJTIycHJvdG9jb2wlMjIlM0ElMjJodHRwcyUzQSUyMiUyQyUyMnBhdGhuYW1lJTIyJTNBJTIyJTJGYnV5JTJGYWRpZGFzLXllZXp5LWJvb3N0LTM1MC12Mi1idXR0ZXIlMjIlMkMlMjJ0aXRsZSUyMiUzQSUyMkJ1eSUyMCUyNiUyMFNlbGwlMjBEZWFkc3RvY2slMjBTaG9lcyUyMC0lMjBSZWFsJTIwWWVlenlzJTJDJTIwUmV0cm8lMjBKb3JkYW5zJTJDJTIwTmlrZSUyMiU3RA==; tl_sopts_3f3107f3-e0af-48af-810c-ea4db12f75f7_p_p_v_d=MjAxOC0wNy0zMFQwMiUzQTA4JTNBMTEuNzUyWg==; intercom-id-h1d8fvw9=de2d0204-fb15-4acf-a51b-7f0836df550c; _sp_id.1a3e=9e648efd-4283-473e-91a0-c36e5e7d9e06.1532656489.4.1532916502.1532685748.49b2da5d-77b1-4078-93e3-4ac4cd3f5051'
                }
            };
            request(options, function (err, response, body) {
                console.log(urlStr, err);
                ep.emit('getHtml', {
                    err : err,
                    body : body,
                });
            })
        })
    })
}
