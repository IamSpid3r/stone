const puppeteer = require('puppeteer');
const fs = require('fs');
const _ = require('lodash');

const fun = require(process.cwd()+"/apps/lib/fun.js");
const taobaoToken = require(process.cwd()+'/tools/taobaoToken/runList.js');

const taobaoLoginUrl = 'https://login.taobao.com/member/login.jhtml?style=mini&newMini2=true&is_ignore=false&redirect_url=https%3A%2F%2Fwww.taobao.com%2Fgo%2Fact%2Floginsuccess%2Ftaobao.php';
const sSocketUri = 'http://115.29.162.63:3001';
const username = 'shihuo';

//所有账户cookie
var cookieInfos = {
    'shihuo': {
        'file' : 'taobaoCookieShihuo.txt',
        'status' : false,
         timer: {
            's' : 0,
            'e' : 3,
        }
    },
    'paobu': {
        file : 'taobaoCookiePaobu.txt',
        status : false,
        timer : {
            's' : 0,
            'e' : 3,
        }
    },
    'kaluli': {
        file : 'taobaoCookieKaluli.txt',
        status : false,
        timer: {
            's' : 0,
            'e' : 3,
        }
    }
};

//socket
var socket = require('socket.io-client')(sSocketUri);
socket.on('connect', function(){
    socket.emit('register', {'index':222}, function(data){
        console.log(data);
    })
});
//浏览器
async function browserStart(username) {
    try {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });
        const page = await browser.newPage();
        await page.goto(taobaoLoginUrl);
        await page.addScriptTag({ url: 'https://cdn.bootcss.com/jquery/2.2.3/jquery.js' });
        const qrcodeHref = await page.evaluate(() => {
            const $ = window.$;
            return 'http:'+$('#J_QRCodeImg img').attr('src');
        });
        //获取img
        console.log(username, 'sendImg')
        var sendImgTime  = Date.now();
        var si = setInterval(function () {
            //超过50s钟
            if ((Date.now() - sendImgTime) > 1000*50) {
                //关闭浏览器
                browser.close();

                console.log('sendImgTimeout')
                fun.stoneLog('taobaoLogin', 'info', {
                    "param1": username,
                    "param2": 'sendImgTimeout',
                })

                clearInterval(si);
            }
        }, 5000)
        socket.emit('sendImg', {'type':username, 'img': qrcodeHref}, async function (sContent){
            clearInterval(si);
            console.log(username, sContent)
            if (sContent.status == 200) {
                await page.waitFor(2000);
                var currentUrl = await page.url();
                if ('https://www.taobao.com/go/act/loginsuccess/taobao.php' == currentUrl) {
                    await page.on('requestfinished', async function (msg) {
                        //h5api js cookie
                        if (msg.url.indexOf('https://h5api.m.taobao.com/h5/com.taobao.mcl.fav.querycolgoodsbycursor/3.0/') != -1) {
                            var cookies = await page.cookies();
                            var cookiesArr = cookies.map(function (val) {
                                return val.name+'='+val.value+';';
                            });
                            var cookiesStr = cookiesArr.join(' ');

                            console.log(username, cookiesStr);
                            //写入js
                            fs.writeFile(process.cwd()+'/logs/'+cookieInfos[username].file, cookiesStr,  function(err) {
                                if (err) {
                                    return console.log(err.message);
                                }
                                cookieInfos[username].status = true;
                            });
                        }
                    });

                    //页面加载完毕
                    await page.on('load', async function (msg) {
                        console.log(username, 'load finish')
                        //关闭浏览器
                        setTimeout(function () {
                            browser.close();
                        }, 2000)
                    })

                    console.log(username, 'my fav');
                    await page.goto("https://h5.m.taobao.com/fav/index.htm");
                } else {
                    if (cookieInfos[username].timer.s < cookieInfos[username].timer.e) {
                        cookieInfos[username].timer.s++;
                        //关闭浏览器
                        browser.close();
                        //新开浏览器
                        browserStart(username);
                    } else {
                        //关闭浏览器
                        browser.close();
                        console.log(username, 'err max '+cookieInfos[username].timer.e)

                        fun.stoneLog('taobaoLogin', 'info', {
                            "param1": username,
                            "param2": 'err max '+cookieInfos[username].timer.s,
                        })
                    }
                }
            } else {
                if (cookieInfos[username].timer.s < cookieInfos[username].timer.e) {
                    cookieInfos[username].timer.s++;
                    //关闭浏览器
                    browser.close();
                    //新开浏览器
                    browserStart(username);
                } else {
                    //关闭浏览器
                    browser.close();
                    console.log('err max '+cookieInfos[username].timer.s)

                    fun.stoneLog('taobaoLogin', 'info', {
                        "param1": username,
                        "param2": 'err max '+cookieInfos[username].timer.s,
                    })
                }
            }
        });
    } catch (e) {
        //关闭浏览器
        browser && browser.close();

        console.log(e.message)
    }
}

//抓取优惠券的接口
async function couponpage (cookieVal, callback) {
    var api = 'mtop.tmall.detail.couponpage';
    var version = '1.0';
    var params = {
        "api" : api,
        'v' : version,
        'jsv' : '2.4.8',
        "ecode" : 0,
        "ttid" : "tmalldetail",
        "data" :{"itemId": 562728700307,"source":"tmallH5"},
    };

    await taobaoToken(params , cookieVal.file, function (body, err) {
        if(err){
           return callback(false);
        }

        return callback(true);
    })
}

//
_(cookieInfos).forEach(function (cookieVal, username) {
    cookieInfos[username].timer.s = 0;
    couponpage(cookieVal, function (status) {
        console.log(username, status)
        if (!status) {
            browserStart(username);
        }
    });
})
//查看各自账号是否可用
setInterval(function () {
    console.log('start check...')
    _(cookieInfos).forEach(function (cookieVal, username) {
        cookieInfos[username].timer.s = 0;
        couponpage(cookieVal, function (status) {
            console.log(username, status)
            if (!status) {
                browserStart(username);
            }
        });
    })
}, 1000*60*3)








