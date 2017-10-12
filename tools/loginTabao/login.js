const Login = function () {
    this.fInit();
}

Login.prototype = {
    sQcNumber:0,//扫码次数
    sAlimamaIndexNumber:0,//扫码成功次数
    sIntervalId:null,//定时器id
    sLoginSite: null,    //阿里妈妈登录地址
    sLoginUser: null,    //当前登录的用户名称
    sCookieStr: null,    //当前登录用户用于后续的身份认证的cookie,
    sSocketUri: null,    //转发二维码验证的服务的socket地址
    oVerifyedQcCodeMap: {}, //已验证的二维码集合
    /*
     * 登录状态：
     *  0 -- 未登录，
     *  1 -- 获取登录二维码成功，
     *  2 -- 二维码扫码成功，
     *  3 -- 登录成功并且已记录好cookie
     *  4 -- 二维码扫描失败
     *  6 -- 二维码扫描验证中
     */
    iLoginStatus: 0,
    fInit: function () {
        this.sQcNumber =0;
        this.sAlimamaIndexNumber = 0;
        this.isGetCookie = 0;
        this.sLoginSite = 'https://login.taobao.com/member/login.jhtml?style=mini&newMini2=true&is_ignore=false&redirect_url=https%3A%2F%2Fwww.taobao.com%2Fgo%2Fact%2Floginsuccess%2Ftaobao.php';
        this.sSocketUri = 'http://115.29.162.63:3001';
    },

    fLogin: function (sUserName, oPhantom, oCallBack) {
        console.log('start')
        var oLogin = this;
        var oCurPage  = null;
        this.sLoginUser = sUserName;
        oPhantom.createPage().then(
            oPage=> {
                oCurPage = oPage;
                oCurPage.setting('userAgent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36').then(
                    _=> {oCurPage.open(oLogin.sLoginSite);}
                )
            }
        ).then(
            _=> {
                 //setInterval(function(){
                   //  oCurPage.render('/Users/liangtian/alimama.png');
                 //},3000)
                oCurPage.on('onLoadFinished', function(status) { oLogin.fOnLoadFinished(oCurPage, oPhantom) });
                oCurPage.on('onResourceRequested', function(oResponse) { oLogin.fOnResourceRequested(oResponse, oCurPage, oPhantom) });
                oCurPage.on('onResourceReceived', function(oResponse) { oLogin.fOnResourceReceived(oResponse, oCurPage, oPhantom, oCallBack);});
            }
        )

    },
    /**
     * @desc 页面载入完成后检测是否已经登录成功，并做后续操作
     * @param oCurPage
     * @returns {boolean}
     */
    fOnLoadFinished: function (oCurPage, oPhantom)
    {
        var oLogin = this;
        if (this.iLoginStatus != 2) {
            oCurPage.evaluate(function () {
                if (document.getElementById('J_Static2Quick')){
                    document.getElementById('J_Static2Quick').click();
                }
            });
        }
    },

    //处理页面的时候，有时不希望加载某些特定资源。这时，可以对URL进行匹配，一旦符合规则，就中断对资源的连接。
    fOnResourceRequested: function (oResponse, oCurPage, oPhantom) {
        var oLogin= this;
        if (oResponse.url.indexOf('https://img.alicdn.com/tfscom') !=-1 && this.sQcNumber == 0) {
            this.sQcNumber = 1;
            console.log('one:'+ oResponse.url)
            this.fScanQrCode(oResponse.url, this.sLoginUser, oPhantom, this);

        } else if(oResponse.url.indexOf('https://img.alicdn.com/tfscom') !=-1){
            this.sQcNumber = this.sQcNumber + 1;
            var timeout = this.sQcNumber*15*1000;
            console.log('two:'+ oResponse.url)
            console.log('timeout',timeout);
             setTimeout(function(){
                    if (!oLogin.sCookieStr){
                        console.log('继续扫码')
                        oLogin.fScanQrCode(oResponse.url, oLogin.sLoginUser, oPhantom, oLogin);
                    } else {
                        console.log('已经登录了')
                    }
            },timeout)
        }
    },
    /**
     * @desc 当阿里妈妈登录页面中的登录二维码异步获取成功后，调用
     *    此方法进行扫码登录。
     *
     * @param oResponse
     * @param oCurPage
     * @param oPhantom
     */
    //当网页收到所请求的资源时，就会执行该回调函数。它的参数就是服务器发来的HTTP回应的元数据对象，包括以下字段。
    //如果HTTP回应非常大，分成多个数据块发送，onResourceReceived会在收到每个数据块时触发回调函数。
    fOnResourceReceived: function (oResponse, oCurPage, oPhantom, oCallBack) {
        var oLogin = this;
        var oQrPage = null  
       console.log(oResponse.url);
        //https://h5.m.taobao.com/fav/index.htm
        //https://h5api.m.taobao.com/h5/com.taobao.mcl.fav.querycolgoodsbycursor/3.0/
        if (oResponse.url.indexOf('https://h5api.m.taobao.com/h5/com.taobao.mcl.fav.querycolgoodsbycursor/3.0/') !=-1  &&  oResponse.stage =='end'){
    //if (oResponse.url.indexOf('https://api.m.taobao.com/h5/com.taobao.mcl.fav.querycolgoodsbycursor') !=-1  &&  oResponse.stage =='end'){
    //console.log('Response (#' + oResponse.id + ', stage "' + oResponse.stage + '"): ' + JSON.stringify(oResponse));
            oCurPage.evaluate(function() {
            }).then(_=>{
                return oCurPage.property('cookies');
            }).then(oCookies=> {
                console.log('get cookie')
                var sCookieStr = '';
                for (var i in oCookies) {
                    //if (oCookies[i].name == '_tb_token_' || oCookies[i].name == 'cookie2') {
                        sCookieStr += oCookies[i].name + '=' + oCookies[i].value + ';';
                    //}
                }
                //console.log('cookie',oCookies)
                oLogin.sCookieStr = sCookieStr;
                oLogin.iLoginStatus = 3;
                //关闭登录页
                 //oPhantom.kill();
                 //oPhantom.exit();
                //登录成功回调
                oCallBack(oLogin.sCookieStr);
                //oCallBack.sFun.call(oCallBack.oCaller, oLogin);
            }); 
        }
        //gwyy(oResponse.url);
        //oResponse.url.indexOf('https://img.alicdn.com/tfscom') !=-1
        if (oResponse.url == 'https://www.taobao.com/go/act/loginsuccess/taobao.php' && this.sAlimamaIndexNumber == 0){
            this.sAlimamaIndexNumber = 1;
            console.log('打开我的收藏');
            oCurPage.open("https://h5.m.taobao.com/fav/index.htm");
        }
      
    },
   
    /**
     * 借用socket服务发起扫描二维码请求
     */
    fScanQrCode: function (sImgUrl, sType, oPhantom, oLogin)
    {
        // socket 访问代理服务
        console.log(this.sSocketUri)
        var socket = require('socket.io-client')(this.sSocketUri);
        socket.on('connect', function(){
            socket.emit('register', {'index':222}, function(data){
                console.log(data);
            })
        });
        //获取img
        socket.emit('sendImg', {'type':sType, 'img': sImgUrl}, function(sContent){
            if (sContent.status == 200) {
                oLogin.iLoginStatus = 2
            } else {
                oLogin.iLoginStatus = 4
                //关闭登录页
                // oPhantom.kill();
                // oPhantom.exit();
            }
        });
    }

}

module.exports = Login;

function  gwyy(str) {
    console.log(JSON.stringify(str,null,2));
    process.exit();
}
