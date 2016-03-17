var assert = require('assert');
var yintai = require('../lib/yintai');


describe('yintai', function() {
    describe('#getItemInfo', function () {
        it('测试yintai正常商品',function(done){
            this.timeout(30000)
            yintai.getInfo('http://item.yintai.com/20-997-9748.html',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.yintai.20.997',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试yintai售罄下架商品',function(done){
            this.timeout(30000)
            yintai.getInfo('http://item.yintai.com/05-017-0849C.html',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                assert.equal('cn.yohobuy.05.017',data.Unique);
                done()
            })
        })
    });

});