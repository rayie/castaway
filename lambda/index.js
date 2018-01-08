'use strict';
const Alexa = require('alexa-sdk');
const APP_ID = "amzn1.ask.skill.63e5bfb4-c558-4d8e-9f40-043f2feba9d6";  // TODO replace with your app ID (OPTIONAL).
const _ = require('lodash');
const axios = require("axios");
const https = require('https');
const S = {
  axiosInstance : axios.create({
    baseURL: "https://us-central1-castaway-191110.cloudfunctions.net/",
    timeout: 5000
  }),
  agent : new https.Agent({ keepAlive: true })
}

const gcp_search = function(artist, title ){
  var rc = {
    url:'search',
    method: 'post',
    data: { title: title, artist: artist },
    httpsAgent: S.agent
  }
  return S.axiosInstance.request(rc)
  .then((res) =>{
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
  return S.axiosInstance.request(rc)
  .then((res) =>{
     return res.data;
     //return {msgToTell:_.get(res.data,'statements',["I found nothing"]).join(" ")};
  })
  .catch((err)=>{
    console.error(err);
    return {statements: ["Something went wrong during chord html fetch"],success:false};
  })
}


const GetChords = function() {

   //var artist = this.event.request.intent.slots["object.startDate"].value;
   console.log('reached handler 1');

   const requestId = this.event.request.requestId;
   const token = this.event.context.System.apiAccessToken;
   const endpoint = this.event.context.System.apiEndpoint;
   const ds = new Alexa.services.DirectiveService();

   var slots = this.event.request.intent.slots;
   //for(var k in slots){ console.log(k, slots[k]); }
   var artist = _.get(this.event.request.intent.slots,'artist',false);
   var songTitle = _.get(this.event.request.intent.slots,'songTitle',false);
   console.log('a and s', artist, songTitle);

   if (!artist || !songTitle){
     return this.emit(':tell','I didn\'t hear you correctly, could you try that again?')
   }


   var self = this;

   const msgA = artist.value + " is the artist,  " + songTitle.value + " is the song. I'll try to find it.";
   const directiveA = new Alexa.directives.VoicePlayerSpeakDirective(requestId, msgA);

   console.log("directive endpoint:", endpoint );
   console.log("directive token:", token);
   const progResA = ds.enqueue(directiveA, endpoint, token).catch(( dirAErr )=> { 
      console.error("dirAErr");
      console.error(dirAErr);
      self.emit(":tell","Directive A failed");
      return;
   })

   progResA.then(( ) => {  console.log('progResA completed');  });

   return gcp_search(artist.value,songTitle.value)
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
   .then((pkg)=>{
     console.log(pkg);
     if(!pkg.success){
       self.emit(':tell',_.get(pkg,'statements',["Unknown Error from GCP."]).join(" ") );
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
    console.log("App ID", this.appId);
    this.emit(':tell','You\'ve launched to CastAway.');
  },
  'SessionEndedRequest': function () {
    console.log("App ID", this.appId);
    console.log('Cast away ended session');
  },

  'GetChords': GetChords,

  'AMAZON.HelpIntent': function () {
      const speechOutput = 'Say CastAway SongTitle by Artist, for example CastAway Dancing in the Dark, by Bruce Springsteen';
      this.emit(':tell',speechOutput);
  },
  'AMAZON.CancelIntent': function () {
      this.emit(':tell','Cancelling your CastAway request');
  },
  'AMAZON.StopIntent': function () {
      this.emit(':tell', 'Stopping your CastAway request');
  }
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

