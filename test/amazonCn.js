var assert = require('assert');
var amazonCn = require('../lib/amazonCn');
//亚马逊 特别的商品 B00X7HAQEI
describe('amazonCn', function() {
    describe('#getItemInfo', function() {
        it('测试不存在的商品', function(done) {
            this.timeout(60000)
            amazonCn.getInfo('http://www.amazon.cn/gp/product/B00XCFJNBX', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('notFind', data.Status);
                assert.equal('cn.amazon.B00XCFJNBX', data.Unique)
                assert.equal('http://www.amazon.cn/gp/product/B00XCFJNBX/', data.Url)
                done()
            })
        });

        it('测试需要网页抓取方式的商品',function(done){
        this.timeout(120000)
            amazonCn.getInfo('http://www.amazon.cn/gp/product/B00KDRNYO4/', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('inStock', data.Status);
                assert.equal('cn.amazon.B00LWHVZKE', data.Unique);
                assert.ok(data.Variations.length == 1, 'data.Variations.length is 1');
                assert.ok(data.Variations[0].Values.length > 0, 'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0, 'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0, 'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0, 'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0, 'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试单个属性单个商品', function(done) {
            this.timeout(60000)
            amazonCn.getInfo('http://www.amazon.cn/gp/product/B010807UYK/', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.amazon.B010807UYK',data.Unique);
                assert.ok(data.Variations.length == 0,'data.Variations.length is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length == 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        });
        it('测试单个属性多个商品',function(done){
        this.timeout(60000)
            amazonCn.getInfo('http://www.amazon.cn/gp/product/B0195YELX8/', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('inStock', data.Status);
                assert.equal('cn.amazon.B019ERIO9I', data.Unique);
                assert.ok(data.Variations.length > 0, 'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0, 'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0, 'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0, 'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0, 'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0, 'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })
        it('测试多个属性多个商品',function(done){
        this.timeout(60000)
            amazonCn.getInfo('http://www.amazon.cn/gp/product/B00KWRHDOC/', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('inStock', data.Status);
                assert.equal('cn.amazon.B00KWRHDOC', data.Unique);
                assert.ok(data.Variations.length > 0, 'data.Variations.length error');
                assert.ok(data.Variations[0].Values.length > 0, 'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0, 'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0, 'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0, 'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0, 'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })
    })
})