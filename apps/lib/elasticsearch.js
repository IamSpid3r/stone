const NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
const config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
const elasticConfig = config.db.elasticsearch;
const elasticsearch = require('elasticsearch');

const client = new elasticsearch.Client({
    host: elasticConfig.user+':'+elasticConfig.pass+'@'+elasticConfig.host,
    log: 'error'
});


exports.esClient = client;