var redis = require('redis');
const NODE_ENV = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var redisConfig = config.db.redis;
console.log(redisConfig);
var client = redis.createClient({
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.database,
    password: redisConfig.password,
    connect_timeout: 5000,
    socket_keepalive: true
});
// if (!NODE_ENV){
//     //线上环境需要认证
//     client.auth(redisConfig.password);
// }

client.on("error", function (err) {
    console.log("Error " + err);
});

module.exports = client;