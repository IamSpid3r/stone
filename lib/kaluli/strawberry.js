/**
 * Created by libin on 2018/6/13.
 */
var request      = require('request');
var url          = require('url');
var querystring  = require('querystring');
var cheerio      = require('cheerio');
var md5          = require('md5');
var _            = require('lodash');
var eventproxy = require('eventproxy');
var Q            = require('q');
var iconv = require('iconv-lite');

// var proxyRequest = require('./proxyRequest2');
var proxyRequest = require('../proxyRequest').proxyRequest;


exports.getInfo = function(urlStr,callback) {
    var urlInfo = url.parse(urlStr);
    var regexp = /\/([0-9]+)\//ig;
    result = regexp.exec(urlInfo.path);
    var goods_id = result[1];

    getHtml(urlStr,function(body,err,response) {
        if(err){
            callback({
                "Errors":{
                    'Code': 'Error',
                    "Message": err.message
                }
            });
            return ;
        }
        var newBody = iconv.decode(body, 'gb2312');
        $ = cheerio.load(newBody);
        var regexp = /<script type=\"application\/ld\+json\">(.*)<\/script>/ig;
        result = regexp.exec(newBody);
        var content = result[1];
        text = _.trim(content);
        text = JSON.parse(text);

        var info = text[0];
        var itemInfo = {
            Unique: 'cn.starwberrynet.'+goods_id,
            Md5: '',
            Status: 'inStock',
            Url: urlStr,
            ItemAttributes: {
                Title: info.name,
                ShopName: '香港草莓网',
                ShopId: 'cn.starwberrynet',
                ImageUrl: info.image,
                Tax: 1
            },
            Variations: [],
            Items: [],
            Coupon: ''
        };
        //不存在属性直接装载
        //判断是否有多属性
        if ($('ul.prod-Option.list-unstyled li').length) {
            var item       = [];
            var attr       = '';
            if ($('.colortxt').html() != '') {
                attr = '颜色';
            }else if($('.sizetext').html() != ''){
                attr = '容量';
            }else {
                attr = '未知';
            }
            var variations = {
                "Id":1,
                "Name":attr
            };
            var value = [];
            var Id = 1;
            $('ul.prod-Option.list-unstyled li').each(function (k, v) {
                var that = $(v);
                var id = that.attr('id').replace(/[^0-9]/ig,"");
                var name;
                if (attr != '颜色') {
                    name = $('#option_'+id).text();
                } else {
                    name = $('.prod'+id+' .colortxt b').text();
                }
                console.log(name)
                var price = $('.prod'+id+' .price .intPrice').text()+$('.prod'+id+' .price .decPrice').text();
                price = price.replace(',','');
                item.push({
                    "Unique": "cn.starwberrynet." + id,
                    "Attr": [{
                        "Nid":1,
                        "N"  :attr,
                        "Vid":1000000 + Id,
                        "V":name
                    }],
                    "Offers": [{
                        "Merchant": {
                            "Name": "starwberrynet"
                        },
                        "List": [
                            {
                                "Price": parseFloat(price),
                                "Type": "RMB"
                            }
                        ]
                    }]
                })
                value.push({
                    "ValueId":1000000 + Id,
                    "Name":name
                })
                Id++
            })
            variations.Values = value;
            itemInfo.Variations.push(variations);
            itemInfo.Items = item;
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        } else {
            var item = {
                "Unique": "cn.starwberrynet." + goods_id,
                "Attr": [],
                "Offers": [{
                    "Merchant": {
                        "Name": "starwberrynet"
                    },
                    "List": [
                        {
                            "Price": parseFloat(info.offers.price),
                            "Type": "RMB"
                        }
                    ]
                }]
            };
            itemInfo.Items.push(item);
            itemInfo.Md5 = md5(JSON.stringify(itemInfo));
        }
        callback(null, itemInfo);

    });




}



function getHtml(urlStr, callback){
    proxyRequest({
        encoding: null,
        url: urlStr,
        timeout: 5000,
        header: {
            'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding':'gzip, deflate, br',
            'Accept-Language':'zh-CN,zh;q=0.8,en;q=0.6,ja;q=0.4',
            'Cache-Control':'no-cache',
            'User-Agent':'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36',
            'Cookie': 'ASP.NET_SessionId=a4erk1gdgj2tdb0b55fc5cro; StrawberryRegion=CN; CurrID=CNY; View=list; repeatvisitor=1; visitid=0613181021413; _ga=GA1.2.539858873.1528884621; _gid=GA1.2.1090228178.1528884621; Hm_lvt_071d86d99c539a3bc35c820465eaf3ec=1528884621; _ga=GA1.3.539858873.1528884621; _gid=GA1.3.1090228178.1528884621; __asc=9530579c163f8a00195f7ad41c1; __auc=9530579c163f8a00195f7ad41c1; _atrk_siteuid=TWxf-YDvL_3d-bzb; _atrk_ssid=7iCMAnKQ9SuwgTLUAKYk55; scarab.visitor=%22580147D7A1BBADBB%22; appier_utmz=%7B%22csr%22%3A%22cn.strawberrynet.com%252Fskincare%252Fclinique%252F%22%2C%22lcsr%22%3A%22cn.strawberrynet.com%252Fskincare%252Fclinique%252F%22%7D; scarab.mayAdd=%5B%7B%22i%22%3A%22105704%22%7D%2C%7B%22i%22%3A%22215863%22%7D%2C%7B%22i%22%3A%22211047%22%7D%5D; prodhist=105704,215863,211047,211047; _gat=1; Hm_lpvt_071d86d99c539a3bc35c820465eaf3ec=1528887078; _gat_UA-6543040-1=1; appier_tp=; appier_pv_counterSXdbx8FhQ8hsMgT=14; _atrk_sessidx=29'
        }
    }, function(error, response, body) {
        callback(body, error);
    })
}