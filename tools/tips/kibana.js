const puppeteer = require('puppeteer');
const request = require('request');
const _ = require('lodash');
const fs = require('fs');
const url = require('url');
const iconv = require('iconv-lite');
const fun = require(process.cwd()+"/apps/lib/fun.js");

var browser = null;
var getbrowser =  async function () {
    var launch = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    };
    if (browser == null) {
        browser = await puppeteer.launch(launch);
    }
    return browser;
}


var timerStime = null;
var start = function () {
    if (!timerStime || (Date.now() - timerStime) > 1800000) {
        var stime = Date.now() - 1000*60;
        var etime = Date.now();
        var audi = '{"index":["accesslog-*"],"ignore_unavailable":true,"preference":1543396571098}\n' +
            '{"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{"highlight_query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*","all_fields":true}},{"match_phrase":{"host":{"query":"www.shihuo.cn"}}},{"range":{"code":{"gt":499}}},{"range":{"time":{"gte":'+stime+',"lte":'+etime+',"format":"epoch_millis"}}}],"must_not":[]}}}},"fragment_size":2147483647},"query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*"}},{"match_phrase":{"host":{"query":"www.shihuo.cn"}}},{"range":{"code":{"gt":499}}},{"range":{"time":{"gte":'+stime+',"lte":'+etime+',"format":"epoch_millis"}}}],"must_not":[]}},"version":true,"size":500,"sort":[{"time":{"order":"desc","unmapped_type":"boolean"}}],"_source":{"excludes":[]},"aggs":{"2":{"date_histogram":{"field":"time","interval":"5m","time_zone":"Asia/Shanghai","min_doc_count":1}}},"stored_fields":["*"],"script_fields":{},"docvalue_fields":["@timestamp","time"]}\n';
        request.post({
            url: 'http://kibana.hupu.io/elasticsearch/_msearch',
            body: audi,
            headers: {
                'Origin' : 'http://kibana.hupu.io',
                'kbn-version' : '5.6.9',
                'cookie' : '_ga=GA1.2.1489105848.1542709584',
                'content-type' : 'application/x-ndjson',
                'Accept-Language' : 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5',
                'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
            },
            encoding: null
        },async function(error,response,body){
            body = iconv.decode(body, 'gbk');
            body = JSON.parse(body);
            try {
                let total = body.responses[0].hits.total;
console.log(total)
                if (!isNaN(total) && total > 100) {
                    var browser = await getbrowser();
                    var page = await browser.newPage();
                    await page.setViewport({
                        width: 1200,
                        height: 1000
                    });
                    await page.goto('http://kibana.hupu.io/app/kibana#/discover/%E8%AF%86%E8%B4%A7-swoole-500%E9%94%99%E8%AF%AF?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-1m,mode:quick,to:now))&_a=(columns:!(code,host,path,method,request_time),filters:!((\'$state\':(store:appState),meta:(alias:!n,disabled:!f,index:\'accesslog-*\',key:host,negate:!f,type:phrase,value:www.shihuo.cn),query:(match:(host:(query:www.shihuo.cn,type:phrase)))),(\'$state\':(store:appState),meta:(alias:!n,disabled:!f,index:\'accesslog-*\',key:query,negate:!f,type:custom,value:\'%7B%22range%22:%7B%22code%22:%7B%22gt%22:499%7D%7D%7D\'),query:(range:(code:(gt:499))))),index:\'accesslog-*\',interval:auto,query:(query_string:(analyze_wildcard:!t,query:\'*\')),sort:!(time,desc),vis:(aggs:!((params:(field:code,orderBy:\'2\',size:20),schema:segment,type:terms),(id:\'2\',schema:metric,type:count)),type:histogram))&indexPattern=accesslog-*&type=histogram');
                    await page.waitFor(8000);
                    await page.screenshot({
                        path: './dashboard_shot.png',
                        clip: {
                            x: 200,
                            y: 10,
                            width: 1000,
                            height: 1200
                        }
                    });
                    console.log('ok')
                    var imgPath = await uploadImg();
                    console.log('uploadImg ok')

                    await r(imgPath);

                    page.close();
                    //push time
                    timerStime = Date.now();
                }

            } catch (e) {
                console.log(e.message)
                process.exit();
            }
        });
    }
}

var uploadImg = function () {
    return new Promise((resolve, reject) => {
        var req = request.post('http://www.shihuo.cn/api/ueditorImageUpload', function (err, resp, body) {
            if (err) {
                console.log('Error!');
            } else {
                body = JSON.parse(body);
                if (body.state == 'SUCCESS') {
                    var imgPath = body.url;
                    imgPath = imgPath.substr(0, imgPath.indexOf('?'));
                    console.log(imgPath)
                    return resolve(imgPath);
                } else {
                   return reject('up error')
                }
            }
        });
        var form = req.form();
        form.append('upfile', fs.createReadStream('./dashboard_shot.png'));
    })
}

var r = function (imagePath) {
    let json = {
        "msgtype": "link",
        "link": {
            "text":"kibana错误详情",
            "title": "点击查看",
            "picUrl": imagePath,
            "messageUrl": imagePath
        }
    }
    var dinPath = 'https://oapi.dingtalk.com/robot/send?access_token=3fa1eed27ee5e61df33f6530611bc316cf7c79b351615c882324dfa60f98773d';
    return new Promise((resolve, reject) => {
        request({
            method : 'post',
            uri :  dinPath,
            json :json
        }, function (err, res , body) {
            if (err) {
                reject(err)
            } else {
                resolve(body)
            }
        })
    })
}


//
start();
setInterval(function () {
    start();
}, 60000)