var assert = require('assert');
var underarmour = require('../lib/underarmour');


describe('underarmour', function() {
    describe('#getItemInfo', function () {
        it('测试underarmour正常商品',function(done){
            this.timeout(40000)
            underarmour.getInfo('http://www.underarmour.cn/p1274425-400.htm',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.underarmour.1274425',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试underarmour已下架商品',function(done){
            this.timeout(40000)
            underarmour.getInfo('http://www.underarmour.cn/p1252132-0011.htm',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                assert.equal('cn.underarmour.1252132',data.Unique);
                done()
            })
        })

        it('测试underarmour不存在商品',function(done){
            this.timeout(40000)
            underarmour.getInfo('http://www.underarmour.cn/p22222-0011.htm',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                assert.equal('cn.underarmour.22222',data.Unique);
                done()
            })
        })
    });

});