"use strict"; // Start of use strict
var TransposeMap = {
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
    "A": "G#",
    "B": "Bb",
    "C": "B",
    "D": "C#",
    "E": "D#",
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
    "Fb": "D#",
    "Gb": "F"
  } 
}
function upstep(){ step('up') }
function downstep(){ step('down') }
function step(way){
  jQuery("pre span").each(function(idx,el){
    var chord =  jQuery(el).text().trim();
    console.log("old:",chord);
    var mm = chord.match( /[A-G][#b]{0,1}/g );
    mm.forEach(function(m){
      chord = chord.replace(m, TransposeMap[way][m]);
    });
    console.log("new:",chord);
    jQuery(el).text(chord);
  });
}
var xApp = {
  ajaxChords: function(path, cb){
    $("#debug").html("");
    log('got to ajaxChords')
    log(path);
    //https://storage.googleapis.com/song-chords/tab/billy_joel/uptown_girl_chords_62042
    if(path.substr(0,5)==="https")
      var url = path.replace("https://tabs.ultimate-guitar.com/","https://storage.googleapis.com/song-chords/");
    else
      var url = "https://storage.googleapis.com/song-chords/" + path;

    log("ajaxChords to " + url);

    $.get(url,function(pre_html){
      //$("#titleLeft").text("Received Chords from CastAway Bucket");
      log("Received Chords from CastAway Bucket");
      xApp.formatChords(pre_html);
      if( typeof cb==='function'){
        return cb(pre_html);        
      }
    }).fail(function(err){
      log("ajaxChords failed");
      log(err);
    })
  },


  backdrop: function(){
  },

  loadMsg: function(html) {
    $("#wrap").hide();
    $("#stateDiv").html(html).fadeIn(3);
    //window.castReceiverManager.setApplicationState(text);
  },

  displayTitle: function(text) {
    console.log(text);
    $("#titleLeft").text(text);
    //window.castReceiverManager.setApplicationState(text);
  },

  removeTopLines: function(n){
    var ph = xApp.last_col1.slice(n+1);
    console.log(ph);
    xApp.formatChords(ph);
  },

  formatChords: function(ph){
    log("got to formatchords");
    /* 
     * at font 11px, 6.6px wide per char
     * at font 12px, 7.2px wide per char
     * at font 13px, 7.8px wide per char
     * at font 15px, 9px wide per char
     *
     */
    console.log('ph',ph);
    if (typeof ph==="string"){
      ph = ph.replace(/\n{2,}/g,"\n");
      var col1 = ph.split("\n");
    }
    else{
      var col1 = ph;
    }

    xApp.last_col1 = [].concat(col1);

    var hh = col1.filter(function(line){
      return line.search(/<span>/)===-1;
    })

    /*
    col1 = col1.map(function(c){
      return (c.search(/<span>/)===-1) : c.trim() : c;
    })
    */

    var rows = col1.map(function(lineTxt, idx){

      var words = lineTxt.split(/ /g);

      if (lineTxt.search(/<span>/)>-1){

        return { idx: idx, lineTxt: lineTxt,  chords:true }       
      }
        
      var words = lineTxt.split(/ /g);
      return { idx: idx,lineTxt: lineTxt, words:words, chords:false }
      
    })

    var max_char = hh.sort(function(a,b){
      if (a.length>b.length) return 1;
    }).pop().length;
    
    var totalChars  = 0;
    var nonBlankLines = hh.filter(function(h){
      return h.trim().length;
    })
    nonBlankLines.forEach(function(h){
      totalChars+=h.trim().length;
    })
    var avgCharPerLine = Math.ceil(totalChars/nonBlankLines.length);
    
    /* 
    TV max width is 1260, less 12x2 for padding = 1236

    */
    var tvMaxWidth = 1236 - 20; 
    var pxPerChar = 7.8;
    var minColWidth = Math.ceil( max_char * pxPerChar );

    var numOfColsCanFit = Math.ceil( tvMaxWidth / minColWidth );

    if ( col1.length===1 ) return xApp.displayTitle(ph);

    $("#wrap").html(`<div id='mainTable' class='row'></div>`);

    // 34 lines can fit vertically 
    var maxLinesPerCol = 34;
    log("TEST");
    log( maxLinesPerCol );
    log( col1.length , ( maxLinesPerCol * 2 ) );
    if ( col1.length <= ( maxLinesPerCol * 2 ) ){
      return xApp.formatTwo(col1);
    }
    return xApp.formatThree(col1);
  },

  formatTwo: function(col1){
    $("#mainTable").html(`<div class='col-lg-6' id='col1'></div><div class='col-lg-6' id='col2'></div>`);
    var linesPerCol = Math.floor( col1.length/2 );
    var col2 = col1.splice(linesPerCol);

    if ( col1[ col1.length-1 ].search(/<span/) !== -1 ){
      col2 = [col1.pop()].concat(col2);
    }

    var pre1 = $("<pre></pre>");
    pre1.html(col1.join("\n"));

    var pre2 = $("<pre></pre>");
    pre2.html(col2.join("\n"));
    
    $("#col1").append(pre1);
    $("#col2").append(pre2);

    $("#stateDiv").hide();
    $("#wrap").fadeIn();
    xApp.scrollTo("top_of_song");
  },

  formatThree: function(col1){
    $("#mainTable").html(`<div class='col-lg-4' id='col1'></div><div class='col-lg-4' id='col2'></div><div class='col-lg-4' id='col3'></div>`);
    var linesPerCol = Math.floor( col1.length/3 );
    var col2 = col1.splice(linesPerCol);
    var col3 = col2.splice(linesPerCol); 

    if ( col1[ col1.length-1 ].search(/<span/) !== -1 ){
      col2 = [col1.pop()].concat(col2);
    }

    if ( col2[ col2.length-1 ].search(/<span/) !== -1 ){
      col3 = [col2.pop()].concat(col3);
    }

    var pre1 = $("<pre></pre>");
    pre1.html(col1.join("\n"));

    var pre2 = $("<pre></pre>");
    pre2.html(col2.join("\n"));
    
    var pre3 = $("<pre></pre>");
    pre3.html(col3.join("\n"));
    
    $("#col1").append(pre1);
    $("#col2").append(pre2);
    $("#col3").append(pre3);
    $("#stateDiv").hide();
    $("#wrap").fadeIn();
    xApp.scrollTo("top_of_song");
  },
  scrollTo: function(anchor_id){
    log("got scroll to message" + anchor_id);
    var tag = $("#"+anchor_id+"");
    if(tag.length){
      $('html,body').animate({scrollTop: tag.offset().top},'slow');
    }
  }
}


$( document ).ready(function(){

  // Smooth scrolling using jQuery easing
  $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function() {
    log("scroll triggerred");
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        log("animating");
        $('html, body').animate({
          scrollTop: (target.offset().top - 57)
        }, 1000, "easeInOutExpo");
        return false;
      }
    }
  });

  // Closes responsive menu when a scroll trigger link is clicked
  $('.js-scroll-trigger').click(function() {
    $('.navbar-collapse').collapse('hide');
  });

  // Activate scrollspy to add active class to navbar items on scroll
  $('body').scrollspy({
    target: '#mainNav',
    offset: 57
  });

  // Collapse Navbar
  var navbarCollapse = function() {
    if ($("#mainNav").offset().top > 100) {
      $("#mainNav").addClass("navbar-shrink");
    } else {
      $("#mainNav").removeClass("navbar-shrink");
    }
  };
  // Collapse now if page is not at top
  navbarCollapse();
  // Collapse the navbar when page is scrolled
  $(window).scroll(navbarCollapse);

  // Scroll reveal calls
  window.sr = ScrollReveal();
  sr.reveal('.sr-icons', {
    duration: 600,
    scale: 0.3,
    distance: '0px'
  }, 200);
  sr.reveal('.sr-button', {
    duration: 1000,
    delay: 200
  });
  sr.reveal('.sr-contact', {
    duration: 600,
    scale: 0.3,
    distance: '0px'
  }, 300);

  // Magnific popup calls
  $('.popup-gallery').magnificPopup({
    delegate: 'a',
    type: 'image',
    tLoading: 'Loading image #%curr%...',
    mainClass: 'mfp-img-mobile',
    gallery: {
      enabled: true,
      navigateByImgClick: true,
      preload: [0, 1]
    },
    image: {
      tError: '<a href="%url%">The image #%curr%</a> could not be loaded.'
    }
  });
})
