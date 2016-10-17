//尺码颜色翻译插件
var translationObj = {
    init : function (options) {
        var shop         = options.shop         || null,
            itemInfo     = options.itemInfo     || null,
            productGroup = options.hasOwnProperty('productGroup')  ? options.productGroup : null,
            department   = options.hasOwnProperty('department')    ? options.department : null;
        var that = this;
        if(shop == null || itemInfo.Status != 'inStock')
            return itemInfo;

        itemInfo.Variations.forEach(function (variation) {
            variation.Name =  that.changeName(variation.Name)
            if(variation.Name == '尺码'){
                variation.Values.forEach(function (value) {
                    value.Name = that.changeSize(value.Name, shop, productGroup, department)
                })
            }
        })
        itemInfo.Items.forEach(function (item) {
            item.Attr.forEach(function (attr) {
                attr.N =  that.changeName(attr.N);

                if(attr.N == '尺码'){
                    attr.V =  that.changeSize(attr.V, shop, productGroup, department);
                }
            })
        })
        return itemInfo;
    },
    changeName : function (name) {
        return name == 'Color' ? '颜色' : (name == 'Size' || name == '尺寸' ? '尺码' : name);
    },
    changeSize : function (size, shop, productGroup, department) {
        var that = this;
        if(productGroup != 'Shoes')
            return size;

        switch(shop){
            case 'amazonUsa':
                //womensReg = /([\d\.]{1,}) [B\(M\)|N\/C]/;
                //mensReg = /([\d\.]{1,}) [D\(M\)|C\/D|2A|2E|3E|4E|EE|D]/;
                reg = /([0-9\.]{1,4})[\s\S]+US/ig
                res = reg.exec(size);
                if(res){
                    if(department == 'mens'){
                        if(sizeTable.USA.Mens.hasOwnProperty(res[1]))
                            size = sizeTable.USA.Mens[res[1]]
                    }else if(department == 'womens'){
                        if(sizeTable.USA.Womens.hasOwnProperty(res[1]))
                            size = sizeTable.USA.Womens[res[1]]
                    }
                }

                break;
            case 'amazonJp':
                reg = /([0-9\.]{1,4})[\s\S]{1,4}/i
                res = reg.exec(size);
                if(res){
                    sizeKey = (res[1] % 1 == 0 && res[1].indexOf('.0') == -1) ? res[1]+'.0' : res[1]; //格式化key
                    if(sizeTable.JP.hasOwnProperty(sizeKey)){
                        size = sizeTable.JP[sizeKey]
                    }
                }
                break;
        }

        return size;
    }
}

module.exports = function (options) {
    return translationObj.init(options);
};

var  sizeTable = {
    'USA' : {
        'Mens':{
            3.5 : 35.5,
            4   : 36,
            4.5 : 37,
            5   : 37.5,
            5.5 : 38,
            6   : 39,
            6.5 : 39.5,
            7   : 40,
            7.5 : 40.5,
            8   : 41,
            8.5 : 41.5,
            9   : 42,
            9.5 : 42.5,
            10  : 43,
            10.5 : 43.5,
            11  : 44,
            11.5 : 44.5,
            12  : 45,
            12.5: 45.5,
            13  : 46,
            13.5: 46.5,
            14  : 47,
            14.5: 47.5,
            15  : 48,
            15.5: 48.5,
            16  : 49
        },
        'Womens':{
            4   : 35,
            4.5 : 35,
            5   : 35.5,
            5.5 : 36,
            6   : 36.5,
            6.5 : 37,
            7   : 37.5,
            7.5 : 38,
            8  : 38.5,
            8.5 : 39,
            9  : 39.5,
            9.5 : 40,
            10  : 40.5,
            10.5  : 41,
            11  : 41.5,
            11.5  : 42,
            12  : 42.5,
            12.5  : 43
        }
    },
    'JP':{
        '22.0' : 34,
        '22.5' : 35,
        '23.0' : 36,
        '23.5' : 37,
        '24.0' : 38,
        '24.5' : 39,
        '25.0' : 40,
        '25.5' : 41,
        '26.0' : 42,
        '26.5' : 43,
        '27.0' : 44,
        '27.5' : 45,
        '28.0' : 46,
        '28.5' : 47,
        '29.0' : 48,
        '29.5' : 49,
        '30.0' : 50,
        '30.5' : 51,
        '31.0' : 52,
        '32.0' : 53,
    }
}

