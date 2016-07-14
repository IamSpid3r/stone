var assert = require('assert');
var nikeStore = require('../lib/nikeStore');


describe('nikeStore', function() {
    describe('#getItemInfo', function () {
        it('测试nikeStore正常商品',function(done){
            this.timeout(60000)
            nikeStore.getInfo('http://store.nike.com/cn/zh_cn/pd/mercurial-superfly-5-ag-pro-%E5%88%BA%E5%AE%A2%E7%B3%BB%E5%88%97%E7%94%B7%E5%AD%90%E4%BA%BA%E9%80%A0%E8%8D%89%E5%9C%B0%E8%B6%B3%E7%90%83%E9%9E%8B/pid-10946325/pgid-11294588',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.nikestore.11294588',data.Unique);
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
            nikeStore.getInfo(encodeURI('http://store.nike.com/cn/zh_cn/product/air-zoom-pegasus-33-id-shoe/?piid=42691&pbid=649797738#?pbid=649797738'),function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.nikestore.piid.air-zoom-pegasus-33-id-shoe',data.Unique);
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
                assert.equal('cn.nikestore.piid.lunarepic-flyknit-id',data.Unique);
                done()
            })
        })
    });

});