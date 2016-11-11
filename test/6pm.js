var assert = require('assert');
var _6pm = require('../lib/6pm');


describe('6pm', function() {
    describe('#getItemInfo', function() {
        it('测试1',function(done){
            this.timeout(50000)
            _6pm.getInfo('http://www.6pm.com/tommy-hilfiger-hilfiger-color-block-mini-duffel-navy-red', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('inStock', data.Status);
                assert.equal('com.6pm.8765395',data.Unique);
                assert.ok(data.Variations.length > 0, 'data.Variations.length is 1');
                assert.ok(data.Variations[0].Values.length > 0, 'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0, 'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0, 'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0, 'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0, 'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试2',function(done){
            this.timeout(50000)
            _6pm.getInfo('http://www.6pm.com/product/8550462/color/567398', function(err, data) {
                if (err) {
                    throw new Error(err);
                }
                assert.equal('notFind', data.Status);
                done()
            })
        })
    })
})