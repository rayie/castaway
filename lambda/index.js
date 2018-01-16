'use strict';
const Alexa = require('alexa-sdk');
const APP_ID = "amzn1.ask.skill.63e5bfb4-c558-4d8e-9f40-043f2feba9d6";  // TODO replace with your app ID (OPTIONAL).
const _ = require('lodash');
const axios = require("axios");
const https = require('https');
const http = require('http');
const PUBNUB_SUB_KEY=process.env.PUBNUB_SUB_KEY;
const PUBNUB_PUB_KEY=process.env.PUBNUB_PUB_KEY;
const S = {
  GCP: axios.create({
    baseURL: "https://us-central1-castaway-191110.cloudfunctions.net/",
    timeout: 14000
  }),
  PubNub: axios.create({
    baseURL: "http://pubsub.pubnub.com/",
    timeout: 8000
  }),
  agent : new https.Agent({ keepAlive: true }),
  agentHttp : new http.Agent({ keepAlive: true })
}

const toReceiver = function(data,wait){
  var rc = {
    url: [ "publish", PUBNUB_PUB_KEY, PUBNUB_SUB_KEY, "0", "castaway", "0" ].join("/"),
    method: 'post',
    headers: {
      "Content-Type": "application/json; charset=UTF-8"
    },
    httpsAgent: S.agentHttp,
    data:data 
  }
  var Prom = S.PubNub.request(rc)
  .then((pres)=>{
    console.log('pubnub response');
    console.log(pres);
  })
  .catch((err)=>{
    console.log('pubnub err');
    console.error(err);
  })
  if (wait) return Prom;
  Prom.then(( result ) => {  console.log( "toReceiver responded", result); })
}

const gcp_search = function(userId, artist, title ){
  var rc = {
    url:'search',
    method: 'post',
    data: { userId: userId, title: title, artist: artist },
    httpsAgent: S.agent
  }
  return S.GCP.request(rc)
  .then((res) =>{
     //console.log(res.data);
     return res.data;
  })
  .catch((err)=>{
    console.error(err);
    return {statements: ["Something went wrong during chord search"],rec:false};
  })
}

const gcp_song = function(ug_url){
  var rc = {
    url:'song',
    method: 'post',
    data: { ug_url : ug_url },
    httpsAgent: S.agent
  }
  return S.GCP.request(rc)
  .then((res) =>{
     return res.data;
     //return {msgToTell:_.get(res.data,'statements',["I found nothing"]).join(" ")};
  })
  .catch((err)=>{
    console.error(err);
    return {statements: ["Something went wrong during chord html fetch"],success:false};
  })
}

const gcp_get_version = function(userId,verNum){
  var rc = {
    url:'get_version',
    method: 'post',
    data: { userId: userId, verNum: verNum },
    httpsAgent: S.agent
  }
  return S.GCP.request(rc)
  .then((res) =>{
     return res.data;
  })
  .catch((err)=>{
    console.error(err);
    return {success:false};
  })
}


const NextVersion = function() {
  var self = this;
  var verNum = _.get(this.event.request.intent.slots,'verNum','next'); //up or down
  const userId = _.get(this.event,'session.user.userId','na');
  console.log("got verNum", verNum);
  console.log("got userID", userId);

  return gcp_get_version(userId,verNum)
  .then((pkg)=>{
    if(pkg.success===false){
      throw new Error("Failed getting version");
    }

    toReceiver({ kind:"state",txt:"Pulling up another version..."})

    return gcp_song(pkg.url)
  })
  .then((songPkg)=>{
     if(false===songPkg.success){
       self.emit(':tell',_.get(songPkg,'statements',["Unknown Error from GCP."]).join(" ") );
     }
     else{
       self.emit(':responseReady');
     }
  })
  .catch((err)=>{
    console.error(err);
    return self.emit(':responseReady');
  })
}

const Transpose = function() {
   var self = this;
   var dir = _.get(this.event.request.intent.slots,'direction',{value:'up'}).value; //up or down
   var steps = _.get(this.event.request.intent.slots,'steps',{value:1}).value;
   console.log('steps and dir', steps , dir);

   return toReceiver({ 
     kind:"transpose",
     steps: steps,
     dir: dir
   },true)
   .then(( )=>{
      return self.emit(':responseReady');
   })
   .catch((err)=>{
      console.error("err in transpose");
      console.error(err);
      return self.emit(':responseReady');
   })
}

const GetChords = function() {

   //var artist = this.event.request.intent.slots["object.startDate"].value;
   console.log('reached handler 1');
   const userId = _.get(this.event,'session.user.userId','na')
   const requestId = this.event.request.requestId;
   const token = this.event.context.System.apiAccessToken;
   const endpoint = this.event.context.System.apiEndpoint;
   const ds = new Alexa.services.DirectiveService();

   //for(var k in slots){ console.log(k, slots[k]); }
   var artist = _.get(this.event.request.intent.slots,'artist',false);
   var songTitle = _.get(this.event.request.intent.slots,'songTitle',false);
   console.log('a and s', artist, songTitle);

   if (!artist || !songTitle){
     return this.emit(':tell','I didn\'t hear you correctly, could you try that again?')
   }


   var self = this;

   const msgA = artist.value + " is the artist,  " + songTitle.value + " is the song.";
   const directiveA = new Alexa.directives.VoicePlayerSpeakDirective(requestId, msgA);

   toReceiver({ kind:"state",txt:"..searching for <i>" + songTitle.value + "</i> by <i>" + artist.value+"</i>"});

   console.log("directive endpoint:", endpoint );
   console.log("directive token:", token);
   const progResA = ds.enqueue(directiveA, endpoint, token).catch(( dirAErr )=> { 
      console.error("dirAErr");
      console.error(dirAErr);
      self.emit(":tell","Directive A failed");
      return;
   })

   progResA.then(( ) => {  console.log('progResA completed');  });

   return gcp_search(userId,artist.value,songTitle.value)
   .then((pkg)=>{
     console.log("searchUG completed");
     const msgB = pkg.statements.join(" ");
     if(pkg.rec===false){
       self.emit(':tell',msgB);
       return; //session ends
     }
        
     const directiveB = new Alexa.directives.VoicePlayerSpeakDirective(requestId, msgB);
     const progResB = ds.enqueue(directiveB, endpoint, token).catch(( dirBErr )=> { 
       self.emit(":tell","Directive B failed");
       return;
     })
     progResB.then(( ) => {  console.log('progResB completed');  });
     return gcp_song(pkg.rec.url) 
   })
   .then((songPkg)=>{
     console.log("songPkg",songPkg);
     if(false===songPkg.success){
       self.emit(':tell',_.get(songPkg,'statements',["Unknown Error from GCP."]).join(" ") );
     }
     else{
       self.emit(':responseReady');
     }
   })
   .catch((iErr)=>{
     
     self.emit(':tell',_.get(pkg,'statements',["Unknown Error in Intent"]).join(" ") );
   })
}


/*
 * this.event === Lamba event  and this.context === context
 */
const handlers = {
  'LaunchRequest': function () {
    console.log("App ID", this.APP_ID);
    this.emit(':tell','You\'ve launched to CastAway.');
  },
  'SessionEndedRequest': function () {
    console.log("App ID", this.APP_ID);
    console.log('Cast away ended session');
  },
  'AMAZON.HelpIntent': function () {
    const speechOutput = 'Say CastAway SongTitle by Artist, for example CastAway Dancing in the Dark, by Bruce Springsteen';
    this.emit(':tell',speechOutput);
  },
  'AMAZON.CancelIntent': function () {
    this.emit(':tell','Cancelling your CastAway request');
  },
  'AMAZON.StopIntent': function () {
    this.emit(':tell', 'Stopping your CastAway request');
  },
  'GetChords': GetChords,
  'NextVersion': NextVersion,
  'Transpose': Transpose
};

exports.handler = function (event, context) {
    /*
    console.log("TOP OF HANDLER");
    console.log(
       event.request.requestId,
       event.context.System.apiAccessToken,
       event.context.System.apiEndpoint
     )
    */

    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

