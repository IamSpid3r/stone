const md5 = require('md5')
const asyncProxyRequestGuowai = require('./proxyRequestGuowai').asyncProxyRequest
const cheerio = require('cheerio')

const platform = 'flightclub'
const country = 'usa'

let getHtml = (url) => {
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

let getItemInfo = async (url) => {

    const data = /\.com\/.*?(\d+)\?/.exec(url)

    if (!data) {
        throw new Error('没有找到商品ID')
    }

    const Unique = country + '.' + platform + '.' + data[1]

    let itemInfo = {
        Unique,
        Md5: '',
        Status: 'inStock',
        Url: url,
        ItemAttributes: {
            'Title': '',
            'ShopName': platform,
            'ShopId': Unique,
            'ImageUrl': '',
        },
        Variations: [],
        Items: [],
    }

    const body = await getHtml(url)
    const $ = cheerio.load(body)

    if ($('.slab-h1-red').text() == '404 Not Found') {
        itemInfo.Status = 'notFind'
        return itemInfo
    }

    itemInfo.ItemAttributes.Title = $('.product-essential .product-shop .product-name h1').text()
    itemInfo.ItemAttributes.ImageUrl = $('.product-img-box .product-img').data('src')

    let variation = {
        Id: 1,
        Name: '颜色',
        Values: [],
    }

    let value = {
        ValueId: 1,
        Name: '',
        ImageUrls: [],
    }

    $('.more-views ul li').each((key, li) => {
        value.ImageUrls.push($(li).find('a').data('url-zoom'))
    })

    variation.Values.push(value)
    itemInfo.Variations.push(variation)

    variation = {
        Id: 0,
        Name: '尺码',
        Values: [],
    }

    $('#new-options>ul>li').each((key, li) => {

        const button = $(li).find('button')

        if (variation.Id == 0) {
            variation.Id = button.data('attributeid')
        }

        let value = {
            ValueId: button.data('optionid'),
            Name: $(li).text().replace(/[\r\n\s]/g, ''),
        }

        let item = {
            Unique: country + '.' + platform + '.' + value.ValueId,
            Attr: [{
                Nid: 1,
                N: '颜色',
                Vid: 1,
                V: '',
            }, {
                Nid: variation.Id,
                N: variation.Name,
                Vid: value.ValueId,
                V: value.Name,
            }],
        }

        variation.Values.push(value)
        itemInfo.Items.push(item)
    })

    itemInfo.Variations.push(variation)
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
