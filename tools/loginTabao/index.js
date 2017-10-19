var phantom = require('phantom')
var express = require('express')
var app = express()
var request = require('request');
var fs  = require('fs');
var server = require('http').createServer();
var io = require('socket.io')(server);
var Login = require('./login');
var fun = require(process.cwd()+'/lib/fun.js');

var login_num = 0;
var login_sleep = null;

//登录函数
function login_alimama(){
    phantom.create().then(
        oPh => {
            oPhantom = oPh;
            var oLogin = new Login();
            var oCallBack = function(val){
                if (!val){
                    if(login_num >=3) {
                        if(!login_sleep) {
                            login_sleep = true;
                            setTimeout(function(){
                                login_num = 0;
                                login_sleep = null;
                            },600000);
                        }else {
                            return '';
                        }
                    } else {
                        login_num++;
                        login_alimama();
                    }
                } else {
                    cookie = val;
                    console.log('登录拉')
                    //callback(cookie);
                    fun.writeLog('taobaoLogin.txt', cookie)
                }
            }
            oLogin.fLogin('shihuo', oPhantom, oCallBack);
        }
    ).catch(e => console.log(e));
};

module.exports =  login_alimama;
