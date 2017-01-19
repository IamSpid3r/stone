var assert = require('assert');
var yougou = require('../lib/yougou');


describe('yougou', function() {
    describe('#getItemInfo', function () {
        it('测试yougou商品',function(done){
            this.timeout(60000)
            yougou.getInfo('http://www.yougou.com/c-adidas/sku-kdg18-100386520.shtml#ref=detail&po=look&abVersion=1',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.yougou.kdg18',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试yougou下架商品',function(done){
            this.timeout(100000)
            yougou.getInfo('http://www.yougou.com/c-nike/sku-554954-100268270.shtml#ref=list&po=list',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                done()
            })
        })
    });

});