var assert = require('assert');
var footlocker = require('../lib/footlocker');


describe('footlocker', function() {
    describe('#getItemInfo', function () {
        it('测试footlocker商品',function(done){
            this.timeout(60000)
            footlocker.getInfo('http://www.footlocker.com/product/model:219646/sku:28984672/nike-tech-fleece-shorts-mens/red/navy/?cm=',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('usa.footlocker.219646',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })
    });

});