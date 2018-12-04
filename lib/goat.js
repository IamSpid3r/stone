const md5 = require('md5')
const asyncProxyRequestGuowai = require('./proxyRequestGuowai').asyncProxyRequest
const url = require('url')

const platform = 'goat'
const country = 'usa'

class Goat {
    constructor(url) {
        this._url = url

        this._itemInfo = {
            Unique: 0,
            Md5: '',
            Status: 'inStock',
            Url: url,
            ItemAttributes: {
                'Title': '',
                'ShopName': 'GOAT',
                'ShopId': 0,
                'ImageUrl': '',
                'Gender': '',
            },
            Variations: [],
            Items: [],
        }
    }

    async getItemInfo() {

        const women = 'Women\'s'
        const men = 'Men\'s'

        const parse = url.parse(this._url)

        const parseNames = parse.pathname.split('/')

        const slug = parseNames[parseNames.length - 1]

        const data = await this.getJson(slug)

        const Unique = `${country}.${platform}.${data.id}`

        this._itemInfo.Unique = this._itemInfo.ItemAttributes.ShopId = Unique

        const name = data.name.replace(`'${data.nickname}'`, '').trim()

        this._itemInfo.ItemAttributes.Title = `${data.brand.name} ${name}`

        this._itemInfo.ItemAttributes.ImageUrl = data.original_picture_url

        this._itemInfo.ItemAttributes.Gender = data.gender[0] === 'men' ? men : women

        this.addVariations(data)

        this.addItems(data)

        this._itemInfo.Md5 = md5(JSON.stringify(this._itemInfo))

        return this._itemInfo
    }

    addVariations(data) {
        const urls = data.product_template_additional_pictures.map((item) => {
            return item.original_picture_url
        })

        this._itemInfo.Variations.push({
            Id: 1,
            Name: '颜色',
            Values: [{
                ValueId: 1,
                Name: data.nickname,
                ImageUrls: urls,
            }],
        })

        const values = data.formatted_available_sizes_new_v2.map((item) => {
            return {
                ValueId: item.size * 10,
                Name: item.size,
            }
        })

        this._itemInfo.Variations.push({
            Id: 2,
            Name: '尺寸',
            Values: values,
        })
    }

    addItems(data) {
        const gender = data.gender[0] === 'men' ? 'M' : 'W'

        const items = data.formatted_available_sizes_new_v2.map((item) => {
            return {
                Unique: `${country}.${platform}.${item.size * 10}`,
                Attr: [{
                    Nid: this._itemInfo.Variations[0].Id,
                    N: this._itemInfo.Variations[0].Name,
                    Vid: this._itemInfo.Variations[0].Values[0].ValueId,
                    V: this._itemInfo.Variations[0].Values[0].Name,
                }, {
                    Nid: this._itemInfo.Variations[1].Id,
                    N: this._itemInfo.Variations[1].Name,
                    Vid: item.size * 10,
                    V: parseFloat(item.size) + gender,
                }],
                Offers: [{
                    Merchant: {
                        Name: 'goat',
                    },
                    List: [{
                        Price: item.price_cents / 100,
                        Type: 'USD'
                    }]
                }],
            }
        })

        this._itemInfo.Items.push(items)
    }

    async getJson(slug) {
        const body = await asyncProxyRequestGuowai({
            gzip: true,
            method: 'POST',
            url: 'https://www.goat.com/web-api/graphql',
            headers:
                {
                    'cache-control': 'no-cache',
                    authority: 'www.goat.com',
                    referer: 'https://www.goat.com/sneakers/' + slug,
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6)' +
                        ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
                    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'accept-encoding': 'gzip, deflate, br',
                    origin: 'https://www.goat.com' },
            body: '{"query":"{\\n    viewer {\\n      productTemplate(slug: \\"' + slug +
                '\\") {\\n        id\\n        internal_shot\\n      ' +
                '  details\\n        name\\n        original_picture_url\\n    ' +
                '    sku\\n        slug\\n        story\\n     ' +
                '   is_active\\n        release_date\\n     ' +
                '   color\\n        special_type\\n    ' +
                '    upper_material\\n        lowest_price_cents\\n  ' +
                '      new_lowest_price_cents\\n        can_return\\n    ' +
                '    brand {\\n          id\\n          name\\n        }\\n    ' +
                '    size_brand\\n        midsole\\n        designer\\n       ' +
                ' nickname\\n        silhouette\\n        gender\\n      ' +
                '  formatted_available_sizes_new_v2 {\\n          size\\n   ' +
                '       price_cents\\n          box_condition\\n       ' +
                '   shoe_condition\\n        }\\n        product_template_additional_pictures {\\n    ' +
                '      attribution_url\\n          original_picture_url\\n          source_url\\n     ' +
                '   }\\n        selling_count\\n        used_for_sale_count\\n       ' +
                ' used_lowest_price_cents\\n        goat_clean_for_sale_count\\n     ' +
                '   new_lowest_price_cents\\n        with_defect_for_sale_count\\n  ' +
                '      category\\n      }\\n    }\\n  }","variables":{"slug":"'+slug+'"}}'
        })

        return JSON.parse(body).data.viewer.productTemplate
    }
}

exports.getInfo = async (urlStr, callback) => {
    try {
        const goat = new Goat(urlStr)
        callback(null, await goat.getItemInfo())
    } catch (e) {
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error:' + e.message
            }
        })
    }
}