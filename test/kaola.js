var assert = require('assert');
var kaola = require('../lib/kaola12');


describe('kaola', function() {
    describe('#getItemInfo', function () {
        it('测试kaola商品',function(done){
            this.timeout(30000)
            kaola.getInfo('https://www.kaola.com/product/1371032.html',function(err,data){
                if(err) {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.kaola.1371032',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试kaola下架商品',function(done){
            this.timeout(30000)
            kaola.getInfo('http://www.kaola.com/product/18283.html',function(err,data){
                if(err) {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                done()
            })
        })

        it('测试kaola不存在商品',function(done){
            this.timeout(30000)
            kaola.getInfo('http://www.kaola.com/product/44.html',function(err,data){
                if(err) {
                    throw new Error(err);
                }
                assert.equal('notFind',data.Status);
                done()
            })
        })
    });

});