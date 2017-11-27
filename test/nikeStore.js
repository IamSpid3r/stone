var assert = require('assert');
var nikeStore = require('../lib/nikeStore');


describe('nikeStore', function() {
    describe('#getItemInfo', function () {
        it('测试nikeStore正常商品',function(done){
            this.timeout(60000)
            nikeStore.getInfo('https://store.nike.com/cn/zh_cn/pd/kyrie-3-ep-%E7%94%B7%E5%AD%90%E7%AF%AE%E7%90%83%E9%9E%8B/pid-11993009/pgid-11393222',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.nikestore.11393222',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试nikeStore定制化商品',function(done){
            this.timeout(80000)
            nikeStore.getInfo(encodeURI('https://store.nike.com/cn/zh_cn/product/pegasus-34-id/?piid=44339&pbid=308183394'),function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.nikestore.pid.12106155',data.Unique);
                done()
            })
        })

        it('测试nikeStore下架商品',function(done){
            this.timeout(80000)
            nikeStore.getInfo(encodeURI('http://store.nike.com/cn/zh_cn/product/lunarepic-flyknit-id/?piid=42164&pbid=350687392'),function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                assert.equal('cn.nikestore.pid.lunarepic-flyknit-id',data.Unique);
                done()
            })
        })
    });

});