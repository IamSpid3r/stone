const store = require('./lib/store')
const assert = require('assert');

/**
 * 测试 store 返回的 json 格式
 *
 * 使用方法: node ./test.js url
 */
class Test {
    constructor(url) {
        this._url = url
    }

    _getInfo() {
        const object = store.getStore(this._url)

        if (object === '') {
            throw new Error('不支持该url的抓取')
        }

        return new Promise((resolve, reject) => {
            object.getInfo(this._url, (error, data) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(data)
                }
            })
        })
    }

    async exec() {
        const data = await this._getInfo()

        assert.ok('Unique' in data, 'Unique属性不存在')
        assert.ok(/.*?\..*?\.\d+/.test(data.Unique), 'Unique属性格式不正确: 国家域名缩写.域名.商品ID 如: cn.taobao.100')
        assert.ok('Url' in data, 'Url属性不存在')

        assert.ok('Status' in data, 'Status属性不存在')

        assert.ok(/^(inStock|outStock|notFind)$/.test(data.Status), 'Status 只允许 inStock|outStock|notFind')
        assert.ok('Md5' in data, 'data.Md5属性不存在')

        if (data.Status === 'inStock') {
            /**
             * ItemAttributes
             */
            assert.ok('ItemAttributes' in data, 'ItemAttributes属性不存在')
            assert.ok('Title' in data.ItemAttributes, 'ItemAttributes.Title属性不存在')
            assert.ok('ShopName' in data.ItemAttributes, 'ItemAttributes.ShopName属性不存在')
            assert.ok('ShopId' in data.ItemAttributes, 'ItemAttributes.ShopId属性不存在')
            assert.ok('ImageUrl' in data.ItemAttributes, 'ItemAttributes.ImageUrl属性不存在')
            assert.ok('Gender' in data.ItemAttributes, 'ItemAttributes.Gender属性不存在')

            /**
             * Variations
             */
            assert.ok('Variations' in data, 'Variations属性不存在')
            for (const variation of data.Variations) {
                assert.deepStrictEqual(Object.keys(variation).sort(), [
                    'Id',
                    'Name',
                    'Values',
                ])

                for (const value of variation.Values) {
                    assert.ok('ValueId' in value, 'Variations[].Values[].ValueId属性不存在')
                    assert.ok('Name' in value, 'Variations[].Values[].Name属性不存在')

                    if (variation.Name === '颜色') {
                        assert.ok('ImageUrls' in value, '颜色规格ImageUrls属性必须存在')
                    }
                }
            }

            /**
             * Items
             */
            assert.ok('Items' in data, 'Items属性不存在')
            for (const item of data.Items) {
                assert.ok('Unique' in item, 'Items[].Unique属性不存在')
                assert.ok('Offers' in item, 'Items[].Offers属性不存在')

                for (const offer of item.Offers) {
                    assert.ok('Merchant' in offer, 'Items[].Offers[].Merchant属性不存在')
                    assert.ok('Name' in offer.Merchant, 'Items[].Offers[].Merchant.name属性不存在')
                    assert.ok('List' in offer, 'Items[].Offers[].List属性不存在')
                    assert.ok(offer.List.length, 'Items[].Offers[].List属性不能为空')
                    for (const list of offer.List) {
                        assert.ok('Price' in list, 'Items[].Offers[].List[].Price属性不存在')
                        assert.ok('Type' in list, 'Items[].Offers[].List[].Type属性不存在')
                    }
                }

                if (data.Variations.length || 'Attr' in item) {
                    assert.ok('Attr' in item, 'Items[].Attr属性不存在')
                    for (const attr of item.Attr) {
                        assert.deepStrictEqual(Object.keys(attr).sort(), [
                            'N',
                            'Nid',
                            'V',
                            'Vid',
                        ])
                    }
                }
            }
        }

        console.log('检查通过!')
    }
}

const argv = process.argv.splice(2)

new Test(argv[0]).exec()