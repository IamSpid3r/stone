var assert = require('assert');
var nbaStore = require('../lib/nbaStore');


describe('nbaStore', function() {
    describe('#getItemInfo', function () {
        it('测试nbaStore正常商品',function(done){
            this.timeout(80000)
            nbaStore.getInfo('http://store.nba.com/Basketball_Essentials_Mens/Mens_Nike_Gray_PG_1_Basketball_Shoes',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('inStock',data.Status);
                assert.equal('com.nbastore.2788817',data.Unique);
                assert.ok(data.Variations.length > 0,'data.Variations.length is 0');
                assert.ok(data.Variations[0].Values.length > 0,'data.Variations[0].Values is 0');
                assert.ok(data.Items.length > 0,'data.Items.length is 0')
                assert.ok(data.Items[0].Attr.length > 0,'data.Items[0].Attr.length is 0')
                assert.ok(data.Items[0].Offers.length > 0,'data.Items[0].Attr[0].Offers.length is 0')
                assert.ok(data.Items[0].Offers[0].List[0].Price > 0,'data.Items[0].Attr[0].Offers[0].list[0].price is 0')
                done()
            })
        })

        it('测试nbaStore下架商品',function(done){
            this.timeout(60000)
            nbaStore.getInfo('http://store.nba.com/Collectibles/Autographed_Golden_State_Warriors_Stephen_Curry_Fanatics_Authentic_Curry_2_Black_and_Yellow_Shoes',function(err,data){
                if(err)
                {
                    throw new Error(err);
                }
                assert.equal('outOfStock',data.Status);
                assert.equal('com.nbastore.2287228',data.Unique);
                done()
            })
        })

        // it('测试nbaStore下架商品',function(done){
        //     this.timeout(80000)
        //     nbaStore.getInfo('http://store.nba.com/Basketball_Essentials/Youth_Black_White_Green_Air_Jordan_14_Retro_Basketball_Shoe',function(err,data){
        //         if(err)
        //         {
        //             throw new Error(err);
        //         }
        //         assert.equal('outOfStock',data.Status);
        //         assert.equal('com.nbastore.2330576',data.Unique);
        //         done()
        //     })
        // })
    });


});