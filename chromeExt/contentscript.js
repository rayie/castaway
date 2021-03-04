function land(){
  if(jQuery==undefined){
    console.log("jquery not available yet")
    return setTimeout(land, 3000);
  }

  console.log("running clear out in 1000");
  setTimeout(c, 1000)
}

const keymap = {
    up : {
    "A": "Bb",
    "B": "C",
    "C": "C#",
    "D": "D#",
    "E": "F",
    "F": "F#",
    "G": "G#",

    "A#": "B",
    "B#": "C#",
    "C#": "D",
    "D#": "E",
    "E#": "F#",
    "F#": "G",
    "G#": "A",

    "Ab": "A",
    "Bb": "B",
    "Cb": "C",
    "Db": "D",
    "Eb": "E",
    "Fb": "F",
    "Gb": "G"
  } , 
  down: {
    "A": "Ab",
    "B": "Bb",
    "C": "B",
    "D": "Db",
    "E": "Eb",
    "F": "E",
    "G": "F#",

    "A#": "A",
    "B#": "B",
    "C#": "C",
    "D#": "D",
    "E#": "E",
    "F#": "F",
    "G#": "G",

    "Ab": "G",
    "Bb": "A",
    "Cb": "Bb",
    "Db": "C",
    "Eb": "D",
    "Fb": "Eb",
    "Gb": "F"
  } 
}

//  examples: Am Gmaj7 F#m Bb
function transpose(p,dir){
  if ( p.search(/^[A-G][b#]/) === 0 ){
    return  keymap[dir][ p.substr(0,2) ] + p.substr(2);
  }

  return  keymap[dir][ p.substr(0,1) ] + p.substr(1);

  if ( p.search(/^[A-G][a-z]{3}/) === 0 ){
    //it has a 'maj' or 'dim' or 'aug' or 'sus' , but no flat or sharp
    return  keymap[dir][ p.substr(0,1) ] + p.substr(1);
  }
}

function tr(dir){
  jQuery("#controls").hide()
  jQuery("#wait_div").show()
  for(let i = 0; i < jQuery("span[data-name]").length; i ++ ){
    let el = jQuery("span[data-name]").eq(i);
    let orig = el.data("name")
    console.log(orig)
    let parts = orig.split(/\//g)
    parts = parts.map(p=>transpose(p,dir))
    let _c = parts.join("/")
    console.log(`${orig} to ${_c}`)
    el.data("name",_c).text(_c)
  }
  setTimeout(()=>{
    jQuery("#controls").show()
    jQuery("#wait_div").hide()
  },1000)
}

function up(){ tr('up') }
function down(){ tr('down') }

function c(){
  console.log('clearing out iframes');

  //main article containing the pre 
  let a = jQuery("article").eq(3);

  let pre = jQuery("pre", a);

  let bg_color = '#FFF8E1';

  console.log(pre);
  pre.removeAttr("class")
  for(let i = 0; i < jQuery("span",pre).length; i ++ ){
     jQuery("span",pre).eq(i)
      .css('color','#37474F').css('background-color', bg_color)
      .removeAttr('class')
  }

  for(let i = 0; i < jQuery("span[data-name]",pre).length; i ++ ){
     jQuery("span[data-name]",pre).eq(i).css('color','#283593').css('background-color',bg_color).removeAttr('class')
  }

  let w = `<div id='main_div' style="margin: 62px">
      <div id='controls'>
        <strong id='upBtn' style="cursor:pointer">Transpose Up</strong>
        <strong id='downBtn' style="margin-left: 30px; cursor:pointer">Transpose Down</strong>
      </div>
      <div style="display:none" id='wait_div'>...wait</div>

      <div id='new_wrap'></div>
    </div>`

  jQuery("body").css("background-color",bg_color).html(w);
  jQuery("#new_wrap").html(pre);
  jQuery("head").remove()

  jQuery("#upBtn").bind('click',up)
  jQuery("#downBtn").bind('click',down)
  return

}

console.log("ug hack content script, running land")
land();
