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
xApp = {
  initPubNub: function(){
    xApp.pubnub = new PubNub({
      subscribeKey: 'sub-b8449342-0962-11e1-bec7-05a8a56cd07c', // always required
      publishKey: 'pub-4f2959b6-ad9f-4c3a-a7d6-39aa4232d153' // only required if publishing
    });

    xApp.pubnub.addListener({
      status: function(se){  
        console.log('se');
        console.log(se);
        $("#titleRight").text(se.category);
      },
      message: function(msg){
        console.log("got pubnub msg")
        $("#titleLeft").text("Received message from PubNub");
        console.log(msg);
        msg = msg.message;
        switch(msg.kind){
          case "chords": 
            $("#titleRight").text(msg.pathToChords);
            console.log("got path:"+msg.pathToChords);
            return xApp.ajaxChords(msg.pathToChords);
          case "state":
            return xApp.loadMsg(msg.txt);
          case "transpose":
            $("#wrap").hide();
            $("#stateDiv").html("transposing " + msg.dir + " " + msg.steps + " half steps").fadeIn();
           
            for(var i =0 ; i < msg.steps; i++){ step(msg.dir); };
            setTimeout(function(){
              $("#stateDiv").hide();
              $("#wrap").fadeIn(300);
            },3000);
            return ;
          default:
                    
            break;
        }
      }
    });
    xApp.pubnub.subscribe({ channels: ['castaway'] });
  },

  ajaxChords: function(path){
    //https://storage.googleapis.com/song-chords/tab/billy_joel/uptown_girl_chords_62042
    var url = "https://storage.googleapis.com/song-chords/" + path;
    $.get(url,function(pre_html){
      $("#titleLeft").text("Received Chords from CastAway Bucket");
      xApp.formatChords(pre_html);
    }).fail(function(err){
      $("#titleLeft").text("got err");
      console.error("ajaxChords failed");
      console.error(err);
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

  formatChords: function(ph){
    console.log('ph',ph);
    ph = ph.replace(/\n{2,}/g,"\n");
    var col1 = ph.split("\n");
    if ( col1.length===1 ) return xApp.displayTitle(ph);

    $("#wrap").hide().append("<div><table id='mainTable'><tr> <td id='col1'></td><td id='col2'></td><td id='col3'></td></tr></table></div>");

    // 34 lines can fit vertically 
    var maxLinesPerCol = 34;
    console.log("TEST");
    console.log( maxLinesPerCol );
    console.log( col1.length , ( maxLinesPerCol * 2 ) );
    if ( col1.length <= ( maxLinesPerCol * 2 ) ){
      return xApp.formatTwo(col1);
    }
    return xApp.formatThree(col1);
  },

  formatTwo: function(col1){
    $("#mainTable").html("<tr class='twocol'><td id='col1'></td><td id='col2'></td></tr>");
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
  },

  formatThree: function(col1){
    $("#mainTable").html("<tr class='threecol'><td id='col1'></td><td id='col2'></td><td id='col3'></td></tr>");
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
  },

  initReceiver: function(){
    //window.onload = function() {
    cast.receiver.logger.setLevelValue(0);
    window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
    console.log('Starting Receiver Manager');
    // handler for the 'ready' event
    castReceiverManager.onReady = function(event) {
      console.log('Received Ready event: ' + JSON.stringify(event.data));
      window.castReceiverManager.setApplicationState('Application status is ready...');
    };
    // handler for 'senderconnected' event
    castReceiverManager.onSenderConnected = function(event) {
      console.log('Received Sender Connected event: ' + event.data);
      console.log(window.castReceiverManager.getSender(event.data).userAgent);
    };
    // handler for 'senderdisconnected' event
    castReceiverManager.onSenderDisconnected = function(event) {
      console.log('Received Sender Disconnected event: ' + event.data);
      if (window.castReceiverManager.getSenders().length == 0) {
        window.close();
      }
    };
    // handler for 'systemvolumechanged' event
    castReceiverManager.onSystemVolumeChanged = function(event) {
      console.log('Received System Volume Changed event: ' + event.data['level'] + ' ' +
          event.data['muted']);
    };
    // create a CastMessageBus to handle messages for a custom namespace
    window.messageBus =
      window.castReceiverManager.getCastMessageBus(
          'urn:x-cast:com.google.cast.sample.helloworld');
    // handler for the CastMessageBus message event
    window.messageBus.onMessage = function(event) {
      console.log('Message [' + event.senderId + ']: ' + event.data);
      // display the message from the sender
      xApp.formatChords(event.data);
      // inform all senders on the CastMessageBus of the incoming message event
      // sender message listener will be invoked
      window.messageBus.send(event.senderId, event.data);
    }
    // initialize the CastReceiverManager with an application status message
    window.castReceiverManager.start({statusText: 'Application is starting'});
    console.log('Receiver Manager started');
    //};
  }
}
