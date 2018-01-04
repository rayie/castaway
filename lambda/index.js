/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports multiple lauguages. (en-US, en-GB, de-DE).
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-fact
 **/

'use strict';

const Alexa = require('alexa-sdk');
const APP_ID = "amzn1.ask.skill.63e5bfb4-c558-4d8e-9f40-043f2feba9d6";  // TODO replace with your app ID (OPTIONAL).
const _ = require('lodash');
const axios = require("axios");
const https = require('https');
const TMPDIR = "/tmp/";
const S = {
  axiosInstance : axios.create({
    baseURL: "https://us-central1-attentiongame.cloudfunctions.net/",
    timeout: 10000
  }),
  agent : new https.Agent({ keepAlive: true })
}


const searchUg = function(artist, title ){
  var rc = {
    url:'search',
    method: 'post',
    data: { title: title, artist: artist },
    httpsAgent: S.agent
  }
  return S.axiosInstance.request(rc)
  .then((res) =>{
     return {msgToTell:_.get(res.data,'statements',["I found nothing"]).join(" ")};
  })
  .catch((err)=>{
    return {msgToTell: "Something went wrong in UG search"};
  })
  
}


const handlers = {
    'LaunchRequest': function () {
        console.log("App ID", this.appId);
        this.emit(':tell','You\'ve launched to Ray\'s CastAway app.');
    },
    'GetChords': function() {
       //var artist = this.event.request.intent.slots["object.startDate"].value;
       console.log('reached handler 1');
       var slots = this.event.request.intent.slots;
       //for(var k in slots){ console.log(k, slots[k]); }
       
       var artist = _.get(this.event.request.intent.slots,'artist',false);
       var songTitle = _.get(this.event.request.intent.slots,'songTitle',false);
       if (artist && songTitle){
         //this.emit(':tell',artist.value + " is the artist,  " + songTitle.value + " is the song. I'll try to find it.");
         return searchUg(artist,songTitle)
         .then((pkg)=>{
           this.emit(':tell',pkg.msgToTell);  
           return;
         })
  
       }

       this.emit(':tell','I didn\'t hear you correctly, could you try that again?')
        
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
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

