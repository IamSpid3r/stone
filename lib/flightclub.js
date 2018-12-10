const md5 = require('md5')
const asyncProxyRequestGuowai = require('./proxyRequestGuowai').asyncProxyRequest
const cheerio = require('cheerio')
const url  = require('url');

const platform = 'flightclub'
const country = 'usa'

let itemInfo

const getHtml = (url) => {
    const options = {
        url,
        gzip: true,
        timeout: 10000,
        headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 ' +
                '(KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
            "accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7,zh-TW;q=0.6,la;q=0.5",
            "cache-control": "no-cache",
            "jwt-authorization": "false",
            "pragma": "no-cache",
            "cookie": "",
        }
    }

    return asyncProxyRequestGuowai(options)
}

const addColorVariation = ($, name) => {
    const key = itemInfo.Variations.length

    itemInfo.Variations.push({
        Id: 1,
        Name: '颜色',
        Values: [{
            ValueId: 1,
            Name: name,
            ImageUrls: [],
        }],
    })

    $('.more-views ul li').each((colorKey, li) => {
        itemInfo.Variations[key].Values[0].ImageUrls.push($(li).find('a').data('url-zoom'))
    })
}

const addSizeVariation = ($, name, body) => {
    const women = 'Women\'s'
    const men = 'Men\'s'

    const key = itemInfo.Variations.length

    itemInfo.Variations.push({
        Id: 0,
        Name: '尺码',
        Values: [],
    })

    let index = 0
    let type = ''

    $('#new-options>ul>li').each((sizeKey, li) => {

        const size = $(li).text().replace(/[\r\n\s]/g, '')

        if (size.indexOf('w') !== -1) {
            type = 'w'
        } else if (size.indexOf('y') !== -1) {
            type = 'y'
        } else if (size.indexOf('m') !== -1) {
            type = 'm'
        }

        if (type !== '') {
            index = size.indexOf(type)
            return false
        }
    })

    if (type === '') {
        type = 'm'
    }

    const arr = /data-lookup="(.*?)"/.exec(body)
    let json = eval(`(${arr[1]})`);

    $('#new-options>ul>li').each((sizeKey, li) => {
        const button = $(li).find('button')

        if (itemInfo.Variations[key].Id === 0) {
            itemInfo.Variations[key].Id = button.data('attributeid')
        }

        let size = $(li).text().replace(/[\r\n\s]/g, '')

        if (size.indexOf('w') === -1) {
            itemInfo.ItemAttributes.Gender = men
        } else {
            itemInfo.ItemAttributes.Gender = women
        }

        if (!/[w|m|y]/.test(size)) {
            size = index === 0 ? type + size : size + type
        }

        const value = {
            ValueId: button.data('optionid'),
            Name: size,
        }

        let price = 0;

        for (let item of Object.values(json)) {
            if (item[value.ValueId]) {
                price = /.*?(\d+).*?/.exec(item[value.ValueId].price)[1]
                if (price > 0) {
                    break
                }
            }
        }
        
        if (price > 0) {
            const data = {
                Unique: country + '.' + platform + '.' + value.ValueId,
                Attr: [{
                    Nid: 1,
                    N: '颜色',
                    Vid: 1,
                    V: name,
                }, {
                    Nid: itemInfo.Variations[key].Id,
                    N: itemInfo.Variations[key].Name,
                    Vid: value.ValueId,
                    V: value.Name,
                }],
                Offers: [{
                    Merchant: {
                        Name: 'flightclub',
                    },
                    List: [{
                        Price: price,
                        Type: 'USD'
                    }]
                }],
            }

            itemInfo.Variations[key].Values.push(value)
            itemInfo.Items.push(data)
        }
    })
}

const getItemInfo = async (urlStr) => {
    const data = url.parse(urlStr).pathname.split('-')
    const id = data[data.length - 1]
    if (!/\d+/.test(id)) {
        throw new Error('没有找到商品ID')
    }

    itemInfo = {
        Unique: `${country}.${platform}.${id}`,
        Md5: '',
        Status: 'inStock',
        Url: urlStr,
        ItemAttributes: {
            'Title': '',
            'ShopName': 'Flight Club',
            'ShopId': `${country}.${platform}`,
            'ImageUrl': '',
            'Gender': '',
        },
        Variations: [],
        Items: [],
    }

    const body = await getHtml(urlStr)
    const $ = cheerio.load(body)

    if ($('.slab-h1-red').text() == '404 Not Found') {
        itemInfo.Status = 'notFind'
        return itemInfo
    }

    const brand = $('.product-essential .product-shop .product-name h2').text()
    const title = $('.product-essential .product-shop .product-name h1').text()

    let arr = /(.*?)"(.*?)"/.exec(title)
    if (arr) {
        arr.shift()
    } else {
        arr = [title, title]
    }

    if (arr[0].indexOf(brand) === 0) {
        itemInfo.ItemAttributes.Title = arr[0].trimRight()
    } else {
        itemInfo.ItemAttributes.Title = `${brand} ${arr[0].trimRight()}`
    }

    itemInfo.ItemAttributes.ImageUrl = $('.product-img-box .product-img').data('src')

    addColorVariation($, arr[1])
    addSizeVariation($, arr[1], body)

    itemInfo.Md5 = md5(JSON.stringify(itemInfo))
    return itemInfo
}

exports.getInfo = async (urlStr, callback) => {
    try {
        callback(null, await getItemInfo(urlStr))
    } catch (e) {
        return callback({
            "Errors":{
                'Code': 'Error',
                "Message": 'Url Error:' + e.message
            }
        })
    }
}
