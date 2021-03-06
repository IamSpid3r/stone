var assert = require('assert');
var amazonJp = require('../lib/amazonJp');
//亚马逊 特别的商品 B00X7HAQEI
describe('amazonJp', function() {
    describe('#getItemInfo', function() {
        it('测试不存在的商品', function(done) {
            this.timeout(60000)
            amazonJp.getInfo('http://www.amazon.co.jp/gp/product/B005MKGOOD', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('notFind', data.Status);
                assert.equal('jp.amazon.B005MKGOOD', data.Unique)
                assert.equal('http://www.amazon.co.jp/gp/product/B005MKGOOD/', data.Url)
                done()
            })
        });

        it('测试需要网页抓取方式的商品',function(done){
        this.timeout(120000)
            amazonJp.getInfo('http://www.amazon.co.jp/gp/product/B00QJDOM6U/', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('inStock', data.Status);
                assert.equal('jp.amazon.B00U878M00', data.Unique);
                assert.ok(data.Variations.length > 0, 'data.Variations.length is 1');
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
            amazonJp.getInfo('http://www.amazon.co.jp/gp/product/B015FFC0HK/', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('jp.amazon.B015FFC0HK',data.Unique);
                assert.equal(data.Variations.length , 0,'data.Variations.length is 0');
                done()
            })
        });

        it('测试单个属性多个商品',function(done){
        this.timeout(60000)
            amazonJp.getInfo('http://www.amazon.co.jp/gp/product/B00FP6BCXI/', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('inStock', data.Status);
                assert.equal('jp.amazon.B00FQA7WZ0', data.Unique);
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
            amazonJp.getInfo('http://www.amazon.co.jp/gp/product/B00F4O3XAQ/', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('inStock', data.Status);
                assert.equal('jp.amazon.B00F4O0HCS', data.Unique);
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