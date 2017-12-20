var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var dbConfig = config.db.stone;
const Sequelize = require('sequelize');
const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    dialect: 'mysql',
    pool: {
        max: 1,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    operatorsAliases: false,
    timezone: '+08:00' //东八时区
});


//kunlun_task
function StoneTasks() {
    return sequelize.define('stone_tasks', {
        task_id: {
            type: Sequelize.STRING(32)
        },
        url: {
            type: Sequelize.STRING(512)
        },
        status: {
            type: Sequelize.INTEGER(1)
        },
        store: {
            type: Sequelize.STRING(32)
        },
        from: {
            type: Sequelize.INTEGER(1)
        },
        update_info: {
            type: Sequelize.STRING(255)
        },
        update_status: {
            type: Sequelize.INTEGER(1)
        }
    });
}

//抓取主表CrawlMain
const CrawlMain = sequelize.define('stone_crawlmains', {
      id: {  
        type: Sequelize.INTEGER(11),  
        allowNull: false,  
        autoIncrement: true,  
        primaryKey: true  
      }, 
      task_id: {
        type: Sequelize.STRING(32)
      },
      url: {
        type: Sequelize.STRING(512)
      },
      store: {
        type: Sequelize.STRING(64)
      },
      sku_info: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.INTEGER(1)
      },
      update_err_num: {
        type: Sequelize.INTEGER(11)
      },
      callback_status: {
        type: Sequelize.INTEGER(1)
      },
      callback_err_num: {
        type: Sequelize.INTEGER(11)
      },
});


exports.db = {
    sequelize: sequelize,
    StoneTasks: StoneTasks,
    CrawlMain: CrawlMain,
};
