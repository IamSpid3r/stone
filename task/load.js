const NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
//
const os = require('os');
const exec = require('child_process').exec;

const binList = [
    {
        'name': 'deliverQueue',
        'address' : 'center',
        'bin' : {
            start: '/usr/bin/pm2 start ./apps/evolution/deliverQueue.js -n deliverQueue',
            restart : '/usr/bin/pm2 start deliverQueue',
            stop : '/usr/bin/pm2 stop deliverQueue'
        }
    },{
        'name' : 'sendTask',
        'address' : 'center',
        'bin': {
            start: '/usr/bin/pm2 start ./apps/evolution/sendTask.js -n sendTask',
            restart : '/usr/bin/pm2 start sendTask',
            stop : '/usr/bin/pm2 stop sendTask',
        }
    },{
        'name' : 'crawlStoreGuonei',
        'address' : 'guonei',
        'bin': {
            start: [
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuonei.js -n crawlStoreGuonei1',
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuonei.js -n crawlStoreGuonei2',
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuonei.js -n crawlStoreGuonei3',
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuonei.js -n crawlStoreGuonei4',
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuonei.js -n crawlStoreGuonei5',
            ],
            restart : [
                '/usr/bin/pm2 restart crawlStoreGuonei1',
                '/usr/bin/pm2 restart crawlStoreGuonei2',
                '/usr/bin/pm2 restart crawlStoreGuonei3',
                '/usr/bin/pm2 restart crawlStoreGuonei4',
                '/usr/bin/pm2 restart crawlStoreGuonei5',
            ],
            stop : [
                '/usr/bin/pm2 stop crawlStoreGuonei1',
                '/usr/bin/pm2 stop crawlStoreGuonei2',
                '/usr/bin/pm2 stop crawlStoreGuonei3',
                '/usr/bin/pm2 stop crawlStoreGuonei4',
                '/usr/bin/pm2 stop crawlStoreGuonei5',
            ],
        }
    },
    {
        'name' : 'crawlStoreGuowai',
        'address' : 'guowai',
        'bin': {
            start: [
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuowai.js -n crawlStoreGuowai1',
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuowai.js -n crawlStoreGuowai2',
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuowai.js -n crawlStoreGuowai3',
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuowai.js -n crawlStoreGuowai4',
                '/usr/bin/pm2 start ./apps/evolution/crawlStoreGuowai.js -n crawlStoreGuowai5',
            ],
            restart : [

                '/usr/bin/pm2 restart crawlStoreGuowai1',
                '/usr/bin/pm2 restart crawlStoreGuowai2',
                '/usr/bin/pm2 restart crawlStoreGuowai3',
                '/usr/bin/pm2 restart crawlStoreGuowai4',
                '/usr/bin/pm2 restart crawlStoreGuowai5',
            ],
            stop : [
                '/usr/bin/pm2 stop crawlStoreGuowai1',
                '/usr/bin/pm2 stop crawlStoreGuowai2',
                '/usr/bin/pm2 stop crawlStoreGuowai3',
                '/usr/bin/pm2 stop crawlStoreGuowai4',
                '/usr/bin/pm2 stop crawlStoreGuowai5',
            ],
        }
    },
    {
        'name' : 'crawlStoreJd',
        'address' : 'guonei',
        'bin': {
            start: '/usr/bin/pm2 start ./apps/evolution/crawlStoreJd.js -n crawlStoreJd',
            restart : '/usr/bin/pm2 start crawlStoreJd',
            stop : '/usr/bin/pm2 stop crawlStoreJd',
        }
    },
    {
        'name' : 'crawlMainNotice',
        'address' : 'center',
        'bin': {
            start: '/usr/bin/pm2 start ./apps/evolution/crawlMainNotice.js -n crawlMainNotice',
            restart : '/usr/bin/pm2 start crawlMainNotice',
            stop : '/usr/bin/pm2 stop crawlMainNotice',
        }
    },
    {
        'name' : 'crawlMainMonitor',
        'address' : 'center',
        'bin': {
            start: '/usr/bin/pm2 start ./apps/evolution/crawlMainMonitor.js -n crawlMainMonitor',
            restart : '/usr/bin/pm2 start crawlMainMonitor',
            stop : '/usr/bin/pm2 stop crawlMainMonitor',
        }
    }
]

var currentAddress = [];
if (!NODE_ENV) {
    const ipList = {
        'center' : ['120.26.107.228'],
        'guonei' : ['120.26.107.228', '121.41.62.148', '121.41.62.183'],
        'guowai' : ['47.88.18.192', '47.88.77.102']
    }
    var  currentIp = os.networkInterfaces().eth1[0].address;
    if (ipList.guonei.indexOf(currentIp) != -1) {
        currentAddress.push('guonei')
    }
    if (ipList.guowai.indexOf(currentIp) != -1) {
        currentAddress.push('guowai')
    }
    if (ipList.center.indexOf(currentIp) != -1) {
        currentAddress.push('center')
    }
} else {
    const ipList = ['192.168.11.185'];
    var currentIp = os.networkInterfaces().eth0[0].address;
    currentAddress = ['guonei','guowai','center']
}

var options = process.argv;
for(var i=0;i<options.length;i++) {
    if(options[i].indexOf("start") == 0) {
        option = 'start';
    } else if (options[i].indexOf("restart") == 0){
        option = 'restart';
    } else if (options[i].indexOf("stop") == 0){
        option = 'stop';
    } else {
        option = '';
    }

    if (option) {
        binList.forEach(function (bin) {
            if (currentAddress.indexOf(bin.address) != -1) {
                if (!Array.isArray(bin.bin[option])) {
                    binTmpArr = [bin.bin[option]]
                } else {
                    binTmpArr = bin.bin[option];
                }

                binTmpArr.forEach(function (binTmp) {
                    exec(binTmp, function(err, stdout, stderr) {
                        if (err) {
                            console.log(err.message);
                        } else {
                            console.log(binTmp, ' ok');
                        }
                    });
                })
            }
        })
    }
}

if (!option) {
    console.log('没有此操作')
}