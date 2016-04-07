var assert = require('assert');
var kaluli = require('../lib/kaluli');


describe('yintai', function() {
    describe('#getItemInfo', function () {
        it('测试kaluli正常商品',function(done){
            this.timeout(30000)
            kaluli.getInfo('http://www.kaluli.com/product/203.html',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.kaluli.203',data.Unique);
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试kaluli售罄下架商品',function(done){
            this.timeout(30000)
            kaluli.getInfo('http://www.kaluli.com/product/270.html#qk=floor_zjbb&type=goods&order=6',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                assert.equal('cn.kaluli.270',data.Unique);
                done()
            })
        })
    });

});