const md5 = require('md5')
const asyncProxyRequestGuowai = require('./proxyRequestGuowai').asyncProxyRequest
const cheerio = require('cheerio')

const platform = 'flightclub'
const country = 'usa'

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

const getItemInfo = async (url) => {

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

    itemInfo.Variations = [{
        Id: 1,
        Name: '颜色',
        Values: [{
            ValueId: 1,
            Name: '',
            ImageUrls: [],
        }],
    }, {
        Id: 0,
        Name: '尺码',
        Values: [],
    }]

    itemInfo.Variations.forEach((item, key) => {
        if (key == 0) {
            $('.more-views ul li').each((colorKey, li) => {
                itemInfo.Variations[key].Values[0].ImageUrls.push($(li).find('a').data('url-zoom'))
            })
        } else {
            $('#new-options>ul>li').each((sizeKey, li) => {
                const button = $(li).find('button')

                if (item.Id == 0) {
                    itemInfo.Variations[key].Id = button.data('attributeid')
                }

                const value = {
                    ValueId: button.data('optionid'),
                    Name: $(li).text().replace(/[\r\n\s]/g, ''),
                }

                const data = {
                    Unique: country + '.' + platform + '.' + value.ValueId,
                    Attr: [{
                        Nid: 1,
                        N: '颜色',
                        Vid: 1,
                        V: '',
                    }, {
                        Nid: itemInfo.Variations[key].Id,
                        N: itemInfo.Variations[key].Name,
                        Vid: value.ValueId,
                        V: value.Name,
                    }],
                }

                itemInfo.Variations[key].Values.push(value)
                itemInfo.Items.push(data)
            })
        }
    })

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
