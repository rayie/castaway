function land(){
  if(jQuery==undefined){
    console.log("jquery not available yet")
    return setTimeout(land, 3000);
  }

  console.log("running clear out in 5000");
  setTimeout(c, 5000)
}

function c(){
  console.log('clearing out iframes');
  jQuery("iframe").remove()
  jQuery("bidding-wrapper").remove()


  let k = jQuery(".js-page.js-global-wrapper").children().children().children("div")
  jQuery(k.get(1)).children().eq(0).remove()
}

console.log("ug hack content script, running land")
land();
