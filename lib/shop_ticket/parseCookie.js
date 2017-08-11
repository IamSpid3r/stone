/**
 * @Author: songxiaoqiang
 * @Date:   2017-05-12T19:34:17+08:00
 * @Last modified by:   songxiaoqiang
 * @Last modified time: 2017-06-13T16:44:00+08:00
 */



const regg = /[\u4e00-\u9fa5]/gm

/**
 * [unicode编码]
 * @return {[string]} [unicode转码后的字符串]
 */
String.prototype.toUnicode = function(){
    var result = "";
    for(var i = 0; i < this.length; i++){
		if(typeof this[i] == 'string' && this[i].match(regg)){
			result += "\\u" + ("000" + this[i].charCodeAt(0).toString(16)).substr(-4);
		}else{
			result += this[i]
		}
        // Assumption: all characters are < 0xffff

    }
    return result;
};

/**
 * [解析cookie]
 */
var parseCookie = class parseCookie{
  constructor(data) {
     this.data = data
  }

  parsetoJSON(){
    const arr = this.data.split(";");
    let obj = {}
    let reg = /[\u4e00-\u9fa5]/gm;
    for(var i = 0;i<arr.length;i++){
      let item = arr[i].split('=')
      if(item.length>2){
        var keyname = item[0].trim()
        var values = encodeURIComponent(arr[i].replace(item[0],'').slice(1))
      }else{
        var keyname = item[0].trim()
        var values = item[1].trim()
      }

      if(keyname != 'miid' && keyname != 'tkmb' && keyname != 'tkmb' && keyname != 'cna' && keyname != 'l' && keyname != 'isg'){
        if(reg.test(values)){
          if(keyname == 'sg'){
            obj[keyname] = encodeURIComponent(values)
          }else{
            obj[keyname] = encodeURIComponent(values.toUnicode())
          }

      	}else{
      		obj[keyname] = values
      	}
      }

    }
    return obj
  }

  parsetoSTR(){
    let arr = [];
    for(var i in this.data){
      arr.push(i+'='+this.data[i])
    }
    return arr.join('; ')
  }
}

module.exports = parseCookie
