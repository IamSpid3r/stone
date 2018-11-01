var NODE_ENV   = typeof process.env.NODE_ENV != 'undefined' ? process.env.NODE_ENV : '';
var config = require(process.cwd()+'/config/'+NODE_ENV+'/app.json');
var dbConfig = config.db.kunlun;

const Sequelize = require('sequelize');
const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    dialect: 'mysql',
    pool: {
        max: 3,
        min: 1,
        acquire: 30000,
        idle: 40000
    },
    operatorsAliases: false,
    timezone: '+08:00', //东八时区,
    logging : false
});


//kunlun_task
function KunlunTasks(date) {
    return sequelize.define('kunlun_tasks_'+date, {
        task_id: {
            type: Sequelize.STRING(64), unique:'task_id'
        },
        url: {
            type: Sequelize.STRING(512)
        },
        url_md5: {
            type: Sequelize.STRING(32)
        },
        status: {
            type: Sequelize.INTEGER(1)
        },
        from: {
            type: Sequelize.INTEGER(1)
        },
        store: {
            type: Sequelize.STRING(32)
        },
        update_info: {
            type: Sequelize.STRING(255)
        },
        update_status: {
            type: Sequelize.INTEGER(1)
        },
        update_err_status: {
            type: Sequelize.INTEGER(1)
        },
        create_at: {
            type: Sequelize.DATE
        },
        update_at: {
            type: Sequelize.DATE
        }
    }, {
        timestamps: false,
        freezeTableName: true,
    });
}

//kunlun_goods_x
function KunlunGoods(i) {
    return sequelize.define('kunlun_goods_'+i, {
        url: {
            type: Sequelize.STRING(512)
        },
        url_md5: {
            type: Sequelize.STRING(32)
        },
        status: {
            type: Sequelize.INTEGER(1)
        },
        rank: {
            type: Sequelize.INTEGER(11)
        },
        store: {
            type: Sequelize.STRING(32)
        },
        info: {
            type: Sequelize.STRING(512)
        },
        update_info: {
            type: Sequelize.STRING(255)
        },
        update_time: {
            type: Sequelize.DATE
        },
        update_error_num: {
            type: Sequelize.INTEGER(11)
        },
        update_error_info: {
            type: Sequelize.STRING(255)
        },
        update_outofstock_num: {
            type: Sequelize.INTEGER(11)
        },
        create_time: {
            type: Sequelize.DATE
        },
    }, {
        timestamps: false,
        freezeTableName: true
    });
}

//kunlun_middle_distribution
function kunlunMiddleDistribution() {
    return sequelize.define('kunlun_middle_distribution', {
        url: {
            type: Sequelize.STRING(512)
        },
        url_md5: {
            type: Sequelize.STRING(32)
        },
        table_no: {
            type: Sequelize.INTEGER(1)
        },
        create_time: {
            type: Sequelize.DATE
        },
    }, {
        timestamps: false,
        freezeTableName: true
    });
}

exports.db = {
    sequelize: sequelize,
    KunlunTasks: KunlunTasks,
    KunlunGoods: KunlunGoods,
    kunlunMiddleDistribution: kunlunMiddleDistribution,
};
