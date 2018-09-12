const puppeteer = require('puppeteer');
const request = require('request');
const _ = require('lodash');
const url = require('url');
const fun = require(process.cwd()+"/apps/lib/fun.js");
//const redis = require('redis');
const config = require(process.cwd() + '/config/develop/app.json');
const taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');

var browser = null;
var getbrowser =  async function () {
    var launch = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: false
    };
    // const proxyIp = await getProxyip();
    // if (proxyIp) {
    //     console.log(proxyIp)
    //     launch.args.push('--proxy-server='+proxyIp)
    // }
    if (browser == null) {
        browser = await puppeteer.launch(launch);
    }
    return browser;
}


exports.getInfo = async function(askUrl, callback) {
    try {
        var browser = await getbrowser();
        var page = await browser.newPage();

        var urlInfo = url.parse(askUrl, true);
        if (!('id' in  urlInfo.query)) {
            throw new Error('urlerror');
        }
        var currentAskId = urlInfo.query.id;
        var isResponse = false;
        var returnData = {};

        //监听response
        var FAIL_SYS_TOKEN_EMPTY = 0;
        page.on('response', async function (data) {
            try {
                if (data.url.indexOf('mtop.taobao.social.ugc.post.detail') != -1) {
                    var text = await data.text();
                    text = text.replace(/mtopjsonp(\d+)\(/, '');
                    text = _.trim(text, ')')
                    if (fun.isJson(text)) {
                        text = JSON.parse(text);
                    } else {
                        throw new Error('needlogin');
                    }

                    if (text.ret[0].indexOf('SUCCESS') != -1) {
                        var commentDetail = [];
                        text.data.list.list.map(listVal => {
                            commentDetail.push(listVal.title)
                        });

                        returnData.item_url = 'https://item.taobao.com/item.htm?id='+text.data.refId;
                        returnData.item_title =  text.data.refTitle;
                        returnData.ask_title =  text.data.title;
                        returnData.comment_detail = commentDetail;
                        returnData.comment_num =  text.data.list.totalCount;
                        returnData.like_count =  text.data.interact.likeCount;
                        returnData.view_count = text.data.interact.viewCount;

                        console.log(returnData)
                    } else {
                        console.log('xxx', FAIL_SYS_TOKEN_EMPTY)
                        FAIL_SYS_TOKEN_EMPTY++;
                        if (FAIL_SYS_TOKEN_EMPTY > 1) {
                            isResponse = true;
                            page.close();
                            throw new Error('tokenerror');
                        }
                    }
                }

                if (data.url.indexOf('mtop.taobao.social.feed.aggregate') != -1){
                    var text = await data.text();
                    text = text.replace(/mtopjsonp(\d+)\(/, '');
                    text = _.trim(text, ')')
                    if (fun.isJson(text)) {
                        text = JSON.parse(text);
                    } else {
                        throw new Error('needlogin');
                    }
                    if (text.ret[0].indexOf('SUCCESS') != -1) {
                        var jsonUrlInfo =  url.parse(data.url, true);
                        var postData = decodeURIComponent(jsonUrlInfo.query.data);
                        postData = JSON.parse(postData);
                        var postparams = JSON.parse(postData.params);

                        //结束
                        var isIndex = false;
                        if ('cursor' in postData) {
                            text.data.list.forEach((dataVal, key) => {
                                if (key < 2 && dataVal[0].id == currentAskId) {
                                    isIndex = true;
                                }
                            })

                            returnData.is_index = isIndex;
                            isResponse = true;
                            page.close();
                            return callback(null, returnData);
                        }
                    } else {
                        FAIL_SYS_TOKEN_EMPTY++;
                        if (FAIL_SYS_TOKEN_EMPTY > 3) {
                            isResponse = true;
                            page.close();
                            throw new Error('tokenerror');
                        }
                    }
                }

                if (data.url.indexOf('https://login.m.taobao.com') != -1) {
                    if (!isResponse) {
                        page.close();
                        isResponse = true;
                        throw new Error('needlogin');
                    }
                }
            } catch(e){
                isResponse = true;
                return callback(e.message);
            }
        });

        //文档里首页
        await page.goto(askUrl);
        //timeout
        setTimeout(function () {
            if (!isResponse) {
                //主动response
                isResponse = true;
                console.log(44)
                page.close();
                throw new Error('timeout');
            }
        }, 10000)
        console.log(55)
        //商品详情页面
        await page.waitFor(5000);
        if (!isResponse) {
            if ('item_url' in returnData){
                var urlInfo2 = url.parse(returnData.item_url, true);
                var item_id = urlInfo2.query.id;
                var askListUrl = 'https://h5.m.taobao.com/wendajia/question2017.html?refId='+item_id;
                await page.goto(askListUrl);
            }  else {
                isResponse = true;
                page.close();
                throw new Error('missurl');
            }

            //timeout
            setTimeout(function () {
                if (!isResponse) {
                    //主动response
                    isResponse = true;
                    page.close();
                    throw new Error('timeout');
                }
            }, 10000)
        }
    } catch (e) {
        isResponse = true;
        page.close();
        return callback(e.message);
    }
    //var urlInfo = url.parse(askUrl, true);
    //list = await getAsk(urlInfo.query.id);
}



