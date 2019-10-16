
chrome.webNavigation.onCommitted.addListener(function(e) {
    console.log("Inside bg script");
    console.log("in ug, applying land");
}, {url: [
    {hostSuffix: 'ultimate-guitar.com'}
    ]
});

chrome.runtime.onInstalled.addListener(function() {
  console.log("ug hack installed")
});
