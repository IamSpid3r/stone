const md5 = require('md5')
const asyncProxyRequestGuowai = require('./proxyRequestGuowai').asyncProxyRequest
const cheerio = require('cheerio')

const platform = 'overkillshop'
const country = 'germany'

class OverKillShop {
    constructor(url) {
        this._url = url

        this._itemInfo = {
            Unique: 0,
            Md5: '',
            Status: 'inStock',
            Url: url,
            ItemAttributes: {
                'Title': '',
                'ShopName': 'OVERKILL Berlin',
                'ShopId': 0,
                'ImageUrl': '',
                'Gender': '',
            },
            Variations: [],
            Items: [],
        }
    }

    async getItemInfo() {
        this._body = await this._getHtml()
        const $ = cheerio.load(this._body)

        if ($('.cms_page').text().trim() === 'Page not found') {
            this._itemInfo.Status = 'notFind'
        } else {
            this._updateBaseInfo($)

            this._addVariations($)

            this._addItems()
        }

        this._itemInfo.Md5 = md5(JSON.stringify(this._itemInfo))

        return this._itemInfo
    }

    _addItems() {
        this._getConfig().attributes.options.map((item) => {
            this._itemInfo.Items.push({
                Unique: `${country}.${platform}.${item.id}`,
                Attr: [{
                    Nid: this._itemInfo.Variations[0].Id,
                    N: this._itemInfo.Variations[0].Name,
                    Vid: this._itemInfo.Variations[0].Values[0].ValueId,
                    V: this._itemInfo.Variations[0].Values[0].Name,
                }, {
                    Nid: this._itemInfo.Variations[1].Id,
                    N: this._itemInfo.Variations[1].Name,
                    Vid: parseInt(item.id),
                    V: item.label,
                }],
                Offers: [{
                    Merchant: {
                        Name: 'goat',
                    },
                    List: [{
                        Price: item.price > 0 ? item.price : parseInt(this._config.basePrice),
                        Type: 'EURO'
                    }]
                }],
            })

        })
    }

    _getConfig() {
        if (!this._config) {
            let exec = /new Product\.Config\((.*?)\);/.exec(this._body)
            this._config = eval(`(${exec[1]})`)

            this._config.attributes = this._config.attributes[Object.keys(this._config.attributes)[0]]

            exec = /new StockStatus\((.*?)\); spConfig.loadStatus\(\);/.exec(this._body)

            const products = eval(`(${exec[1]})`)

            let productIds = []

            for (const key in products) {
                if (products[key].is_in_stock === true) {
                    productIds.push(products[key].product_id)
                }
            }

            this._config.attributes.options.map((item, key) => {
                if (productIds.indexOf(item.products[0]) < 0) {
                    this._config.attributes.options.splice(key, 1)
                }
            })
        }

        return this._config
    }

    _addVariations($) {
        this._itemInfo.Variations.push({
            Id: 1,
            Name: '颜色',
            Values: [{
                ValueId: 1,
                Name: this._getColor($),
                ImageUrls: this._getDefaultImages($),
            }],
        })

        const values = this._getConfig().attributes.options.map((item) => {
            return {
                ValueId: parseInt(item.id),
                Name: item.label,
            }
        })

        this._itemInfo.Variations.push({
            Id: 2,
            Name: '尺码',
            Values: values,
        })
    }

    _updateBaseInfo($) {
        const id = $('.product-sku .muted:nth-child(1) .middlegrey').text()
        const women = 'Women\'s'
        const men = 'Men\'s'

        this._itemInfo.Unique = this._itemInfo.ItemAttributes.ShopId = `${country}.${platform}.${id}`
        this._itemInfo.ItemAttributes.Title = this._getTitle($)
        this._itemInfo.ItemAttributes.ImageUrl = $('.carousel-inner>.item img').attr('src')

        if ($('.gender-label-group').hasClass('unisex') || $('.gender-label-group').hasClass('men')) {
            this._itemInfo.ItemAttributes.Gender = men
        } else {
            this._itemInfo.ItemAttributes.Gender = women
        }
    }

    _getDefaultImages($) {
        let urls = []
        $('.more-views>li').each((key, li) => {
            urls.push($(li).find('img').attr('src'))
        })
        return urls
    }

    _getTitle($) {
        let title = $('.product-name h2').text().trim()
        let exec = /(.*?)"(.*?)"/.exec(title)

        if (exec) {
            title = exec[1]
        }

        return title.trimRight()
    }

    _getColor($) {
        let exec = /(.*?)"(.*?)"/.exec($('.product-name h2').text().trim())

        if (exec) {
            return exec[2]
        }

        return 'default'
    }

    _getHtml() {
        return asyncProxyRequestGuowai({
            gzip:true,
            method: 'GET',
            url: this._url,
            headers: {
                authority: 'www.overkillshop.com',
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
                'upgrade-insecure-requests': '1',
                'cache-control': 'no-cache',
                'accept-encoding': 'gzip, deflate, br',
            }
        })
    }
}

exports.getInfo = async (urlStr, callback) => {
    try {
        const overKillShop = new OverKillShop(urlStr)
        callback(null, await overKillShop.getItemInfo())
    } catch (e) {
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error:' + e.message
            }
        })
    }
}