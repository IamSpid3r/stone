var assert = require('assert');
var nikeStore = require('../lib/nikeStore');


describe('nikeStore', function() {
    describe('#getItemInfo', function () {
        it('测试nikeStore正常商品',function(done){
            this.timeout(60000)
            nikeStore.getInfo('http://store.nike.com/cn/zh_cn/pd/kobe-11-elite-low-bhm-%E7%AF%AE%E7%90%83%E9%9E%8B/pid-10873886/pgid-11181193',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.nikestore.11181193',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试nikeStore售罄商品',function(done){
            this.timeout(60000)
            nikeStore.getInfo(encodeURI('http://store.nike.com/cn/zh_cn/pd/kobe-10-elite-se-篮球鞋/pid-10870422/pgid-11181186?cp=cnns_aff_080214_a_ALHPMC_hp100'),function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                assert.equal('cn.nikestore.11181186',data.Unique);
                done()
            })
        })
    });

});