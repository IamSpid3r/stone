const puppeteer = require('puppeteer');

module.exports=(async function(){
   const chrome = {
        browser:null,
        page:null,
    };
    chrome.browser = await puppeteer.launch({"headless":true, args: ['--no-sandbox']} );
    chrome.page  =  await chrome.browser.newPage();
    console.log('chrome init');
    //resolve the export promise
    return chrome;
})()

/*
if(chrome.browser == null) {
    (async ()=>{
       chrome.browser = await puppeteer.launch({"headless":true, args: ['--no-sandbox']} );
       chrome.page  =  await chrome.browser.newPage();
       console.log("chrome内核初始化完成！");
      
    })();
}
*/

