// 加载http模块
var iherb = require('../test/iherbtest');
var ih = new iherb();

// var url ='https://cn.iherb.com/pr/California-Gold-Nutrition-CGN-Protein-Bar-Peanut-Butter-Dark-Chocolate-Chip-Gluten-Free-2-1-oz-60-g/77592';
// var url='https://cn.iherb.com/pr/Optimum-Nutrition-Gold-Standard-100-Whey-Double-Rich-Chocolate-5-lbs-2-27-kg/27509';
var url ='https://cn.iherb.com/pr/Now-Foods-L-Cysteine-500-mg-100-Tablets/538';

ih.getPageInfo(url,function (err,data) {
    if(err) {
        throw new Error(err);
    }
    console.log(data);
});




