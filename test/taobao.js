var assert = require('assert');
var taobao = require('../lib/taobao');

describe('taobao', function() {
  describe('#getItemInfo', function () {
    it('测试不存在的商品', function (done) {
        taobao.getInfo('https://item.taobao.com/item.htm?id=43331888467',function(err,data){
            if(err)
            {
                throw new Error(err);
            }
            assert.equal('notFind',data.Status);
            assert.equal('cn.taobao.43331888467',data.Unique)
            assert.equal('https://item.taobao.com/item.htm?id=43331888467',data.Url)
            done()
        })
    });

    it('测试已经下架的商品',function(done){
        this.timeout(60000)
        taobao.getInfo('https://item.taobao.com/item.htm?id=524857221929',function(err,data){
            if(err)
            {
                throw new Error(err);
            }
            // console.log(data)
            assert.equal('outOfStock',data.Status);
            assert.equal('https://item.taobao.com/item.htm?id=524857221929',data.Url)
            done()
        })
    })

    it('测试淘宝商品',function(done){
        this.timeout(60000)
        taobao.getInfo('https://item.taobao.com/item.htm?spm=a230r.1.14.58.9cCqkV&id=45122936450&ns=1&abbucket=4#detail',function(err,data){
            if(err)
            {
                throw new Error(err);
            }
            assert.equal('inStock',data.Status);
            assert.equal('cn.taobao.45122936450',data.Unique);
            assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
            assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
            assert.ok(data.Items.length > 0,'data.Items.length is 0')
            assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
            assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
            assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
            done()
        })
    })

    it('测试天猫商品',function(done){
        this.timeout(60000)
            taobao.getInfo('https://detail.tmall.com/item.htm?spm=a230r.1.14.31.9cCqkV&id=40483556099&ns=1&abbucket=4',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('cn.taobao.40483556099',data.Unique);
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