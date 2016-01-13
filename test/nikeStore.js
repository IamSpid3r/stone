var assert = require('assert');
var nikeStore = require('../lib/nikeStore');


describe('nikeStore', function() {
    describe('#getItemInfo', function () {
        it('测试nbastore商品',function(done){
            this.timeout(60000)
            nikeStore.getInfo('http://store.nike.com/cn/zh_cn/pd/free-5-solstice-%E8%B7%91%E6%AD%A5%E9%9E%8B/pid-10338569/pgid-10349077',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.nikestore.10349077',data.Unique);
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