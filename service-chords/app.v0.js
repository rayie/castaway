'use strict';
const Promise = require("bluebird");
const _ = require("lodash");
const fs = require('fs');
const write = Promise.promisify(fs.writeFile);
const read = Promise.promisify(fs.readFile);
const $ = require('cheerio');
const SONG_BUCKET_NAME = "song-chords";
const storage = require('@google-cloud/storage')({ projectId: "castaway-191110", keyFilename: "./storage-owner.keys.json" });
const Datastore = require('@google-cloud/datastore');
const datastore = Datastore({ projectId: "castaway-191110", keyFilename: "./datastore-owner.keys.json" });
const DS_KIND = "Song";

const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'))

const PUBNUB_SUB_KEY=process.env.PUBNUB_SUB_KEY;
const PUBNUB_PUB_KEY=process.env.PUBNUB_PUB_KEY;

const axios = require("axios");
const http = require('http');
const https = require('https');
const S = {
  //https://www.ultimate-guitar.com/search.php?search_type=title&order=&value=kesha+your+love+is+my+drug
  Search: axios.create({
    baseURL: "https://www.ultimate-guitar.com/",
    timeout: 12000
  }),
  Song: axios.create({
    baseURL: "https://tabs.ultimate-guitar.com/",
    timeout: 10000
  }),
  PubNub: axios.create({
    baseURL: "http://pubsub.pubnub.com/",
    timeout: 8000
  }),
  /*
  Chords: axios.create({
    baseURL: "https://www.googleapis.com/",
    timeout: 8000
  }),
  */
  agentHttps : new https.Agent({ keepAlive: true }),
  agentHttp : new http.Agent({ keepAlive: true }),
  songBkt : storage.bucket(SONG_BUCKET_NAME)
}

function saveLastSearch(userId,artist,title,cursor){
  var key = datastore.key([ "LastSearch", userId ]);
  if(undefined===cursor){
    cursor = 0; //first search
  }
  return datastore.upsert({key: key, data: {ts:new Date(),artist:artist,title:title,cursor:cursor}})
  .then((upresult)=>{
    console.log('saveLastSearch',upresult);
    return true;
  })
  .catch((err)=>{
    console.log("failed saveLastSearch");
    console.error(err);
    return true
  })
}


/*
 * upon retrieving the chord sheet html, 
 * we publish to gcloud topic: projects/attentiongame/topics/castaway    
 * to notify the subscriber (which will be listening inside our chromecast sender app) the html is ready
 * to fetch from where we stored it
 *
 */
function song(path){
  if ( path.substr(0,4)=="http" ){
    path = path.replace("https://tabs.ultimate-guitar.com/","");
  } 
  var key = datastore.key([ DS_KIND, path ]);
  //console.log('key',key);
  return datastore.get(key)
  .then((entities)=>{

    var existingPath = _.get( entities,'0.path',false);  

    /** CASE: A**/
    if (existingPath){ 
      //we already have the html, we just need to update the metadata field so storage pubsub event fires
      console.log("we already have the html, we just need to update the metadata field so storage pubsub event fires");
      return {
        success: true,
        statements: [ 'Got it' ]
      }
    }

    /** CASE: B **/
    //fetch the html from ultimate guitar
    var rc = {
      url:path,
      method: 'get',
      httpsAgent: S.agentHttps
    }
    
    var pathToTmp = "/tmp/"+path.replace(/\//g,"_")+".html";
    console.log("fetching pre_html stored at " + path);
    return S.Song.request(rc)
    .then((res)=>{
      var nn = $("pre.js-tab-content.js-copy-content.js-tab-controls-item",res.data);
      //console.log(nn); console.log(nn.length);
      if(nn.length===0){
        throw new Error("Failed to fetch chord sheet");
      }

      var pre_html = nn.eq(0).html();
      console.log('len of pre_html',pre_html.length);

      /*
       * got the html we want
       * 1. store it in storage bucket song-chords/path/to/chordsheet
       * 2. update datastore record to indicate we have the html
       */
      console.log("writing to ", pathToTmp);
      return write(pathToTmp,pre_html)
    })
    .then(( )=>{
      console.log("write to tmp ok");
      var opts = { resumable: true, gzip: true, predefinedAcl:'publicRead', destination: path };
      return S.songBkt.upload(pathToTmp,opts);
    }) 
    .then(( )=>{
      console.log("upload ok to " + path);
      var r = {
        path: path
      }
      return datastore.get(key)
    })
    .then((entities)=>{
      console.log("got datastore entities" , entities.length);
      entities[0].path = path;
      return datastore.update({ key: key, data: entities[0] })
    })
    .then((datastoreUpdateResult)=>{
      return {
        success: true,
        statements: [ 'Got It' ]
      }
    })
    .catch((err) =>{
      var statusCode = _.get(err,'response.status',-1);
      switch(statusCode){
        case -1:
          return {
            statements: [ "Something went wrong parsing the chord sheet." ],
            success: false,
            err: err
          }
        case 404: 
          return {
            statements: [ "The chord is no longer available at Ultimate Guitar" ],
            success: false,
          }
        default: 
          return {
            statements: [ "Something went wrong with fetching the chord from Ultimate Guitar." ],
            success: false,
            err: err.response.statusText
          }
          break;
      }
    })

  })
  .then((pkg)=>{
    if ( !pkg.success ) {
      console.log("pkg.success failed", pkg);
      return pkg; //failed
    }


    //update meta so chromecast sender app Express erver get's gets notified (via storage pub/sub)
    //which will notify chromecast sender client (on chrome browser) via socket.io
    var pubnubPayload = {
      kind: "chords", pathToChords: path.replace("https://tabs.ultimate-guitar.com/","")
    }
    return publishToPubNubCastawayChannel(pubnubPayload)
    .then((r)=>{
      console.log('publishToPubNubResult',r);
      return pkg;
    })
    .catch((errB)=>{ 
      console.log('errB');
      console.error(errB);
      throw errB; 
    })
  })
  .catch((err)=>{
    return { //failed
      statements: [ "Something went wrong with fetching the chord sheet." ],
      success: false,
      err: err.response.statusText
    }
  })
}

function publishToPubNubCastawayChannel(payload){
  var rc = {
    url: [ "publish", PUBNUB_PUB_KEY, PUBNUB_SUB_KEY, "0", "castaway", "0" ].join("/"),
    method: 'post',
    headers: {
      "Content-Type": "application/json; charset=UTF-8"
    },
    httpsAgent: S.agentHttp,
    data:payload 
  }
  console.log("pubnub endpoint is ", rc.url);
  console.log("payload is " , payload );
  return S.PubNub.request(rc)
  .then((res)=>{
    
  })
  .catch((err)=>{  
    console.error("pubnub publish err");
    console.error(err.response);
    throw err; 
  })
}

function updateMeta(path){
  let fileInBucket = S.songBkt.file(path);
  var val = [
    new Date().toString().replace(/ /g,"_"),
    Math.random()*1000,
    "rie" 
  ].join("-")

  return fileInBucket.setMetadata({
    metadata:{
      castaway: val
    }
  })
  .then((d)=>{
    //console.log(d); 
    return true;
  })
  .catch((err)=>{
    console.error('caught err in updateMeta');
    console.log(err);
    return false;
    //return res.status(500).send(err);
  })
}

function sortByRating(a,b){
  if ( a.fmt<b.fmt) 
    return 1; 
  else if ( a.fmt>b.fmt ) 
    return -1; 
  else {
    if ( a.rating>b.rating ) return 1 ; 
    else return -1; 
  } 
}

function buildStatements(recs){
  let counts = _.groupBy(recs, "fmt" );
  var statements = ["I found"];
  var c = [];
  for(var k in counts){
    switch(k){
      case 'tab':
        c.push(counts[k].length + " " + k + "s");
        break;
      case 'chords':
        c.push(counts[k].length + " " + k);
        break;
    }
  }
  statements.push(c.join(" and "));
  return statements;
}

function search(artist,title,n){
  artist = artist.toLowerCase();
  title = title.toLowerCase();

  return searchDatastore(artist,title)
  .then(( recs )=>{

    if (recs.length>0){
      recs.sort(sortByRating);
      recs.reverse();
      var st = buildStatements(recs);
      st.push("in our database.");
      var returnPkg = {
        statements: st, 
        rec: recs[ n ]
      }
      console.log("done sorting datastore results");
      return returnPkg;
    }

    return searchUG(artist,title);
  })
  .catch((err)=>{
    //console.error(err);
    throw err;
  })
}

function searchDatastore(artist,title){
  var q = datastore
  .createQuery('Song')
  .filter('artist','=',artist)
  .filter('title','=',title);

  return datastore.runQuery(q)
  .then(( rr ) => {
    console.log('datastore runQuery result')
    console.log(rr);
    if (rr.length===0 ) throw new Error("Failed query");
    return rr[0];
  })
  .catch((err)=>{
    //console.error(err);
    throw err;
  })
}

function saveChords(returnPkg){
  console.log("begin saving chord links");
  return Promise.mapSeries( returnPkg.recs, (r)=>{ 
    console.log(r);
    var ug_path = r.url.replace("https://tabs.ultimate-guitar.com/","");
    console.log(ug_path);
    var key = datastore.key([ DS_KIND, ug_path ]);
    return datastore.upsert({ key: key, data:r })
    .then(()=>{
      //console.log('inserted');
      return true;
    })
    .catch((err)=>{
      console.log("failed insert");
      console.error(err);
      return true
    })
  })
  .then((insertResults)=>{
    console.log("Inserted " + insertResults.length);
    return returnPkg;
  })
  .catch((err)=>{
    console.log("failed insert");
  })
}

function searchUG(artist,title){
  var _artist = encodeURIComponent(artist);
  var _title = encodeURIComponent(title);
  var returnPkg = { };
  var path = `search.php?search_type=title&order=&value=${_artist}+${_title}`;
  var rc = {
    url:path,
    method: 'get',
    httpsAgent: S.agentHttps
  }
  
  console.log("running UG search:", rc.url);
  return S.Search.request(rc)
  .then((res)=>{
    console.log("got response form UG search");
    var tt  = $("div.content table",res.data);
    
    //console.log(tt.length);
    if ( tt.length=== 0 ){
      throw new Error("UG content not found");
    }

    var tbl = tt.eq(0)
    var links = $( "a.song.result-link", tbl );
    var recs = [];

    if ( links.length=== 0 ){
      return {
        statements: [ `Sorry I did not find any chords matching ${title} by ${artist}` ],
        rec:false
      }
    }

    console.log("begin processing ug links");
    links.each(function(idx,atag){

      //console.log($(atag).attr("href"));
      var url = $(atag).attr("href");
      var tr = $(atag).parents("tr").eq(0);

      if ( !tr ){ 
      
      }
      else{

        //console.log("tds:", $("td",tr).length);
        var tds = $("td",tr);

        if ( tds.length < 4 ) throw new Error("Error parsing UG sr cant find tds");

        var rating = $(".ratdig",tds.eq(2)).text();
        var fmt = tds.eq(3).children().eq(0).text();

        //console.log(url, rating,fmt);
        //returnPkg.urls.push(url);
        rating = parseInt(rating);
        rating = (isNaN(rating))?0:rating;

        recs.push({ url: url, rating: rating, fmt:  fmt , artist: artist, title:title });
        return;
      }
    })

    if ( recs.length=== 0 ){
      return {
        statements: [ `Sorry, I could not parse the results from Ultimate Guitar` ],
        rec:false
      }
    }

    recs = recs.filter(function(r){ 
      return r.fmt=="chords" || r.fmt=="tab";
    })

    if (recs.length===0){
      return {
        statements: [ `I didn\'t find any chords or tabs on Ultimate Guitar` ],
        rec:false
      }
    }
    console.log("end processing ug links");
    recs.sort(sortByRating);
    var st = buildStatements(recs);
    st.push("on Ultimate Guitar.");
    var returnPkg = {
      statements: st, 
      recs: recs
    }

    return returnPkg;
  })
  .then(saveChords)
  .then((returnPkg)=>{
    returnPkg.rec = returnPkg.recs.pop();
    delete returnPkg.recs;
    return returnPkg;
  })
  .catch((err)=>{
    var statusCode = _.get(err,'response.status',-1);
    switch(statusCode){
      case -1:
        return {
          statements: [ "Something went wrong with our search" ],
          rec: false,
          err: err
        }
      case 404: 
        return {
          statements: [ "No matching chords were found" ],
          rec: false
        }
      default: 
        return {
          statements: [ "Something went wrong with our search" ],
          rec: false,
          err: err.response.statusText
        }
        break;
    }
  })
}

exports.search = function(req,res){
  let artist = _.get(req.body,'artist',false).toLowerCase();
  let title = _.get(req.body,'title',false).toLowerCase();
  let userId = _.get(req.body,'userId','no-user-id-provided');
  console.log(userId,artist,title);
  if (!artist) return res.status(500).send({msg:"Missing artist"});
  if (!title) return res.status(500).send({msg:"Missing title"});

  let pkg = { artist: artist, title:title };
  //console.log(pkg);
  return search(artist,title,0)
  .then((rPkg)=>{
    console.log(pkg);
    console.log(rPkg);
    _.merge(pkg,rPkg);
    return saveLastSearch(userId,artist,title)
    .then(( )=>{
      return res.send(pkg);
    })
    .catch((err)=>{ throw err; })
  })
  .catch((err)=>{

    return res.status(500).send(err);
  })
}

exports.song = function(req,res){
  let ug_url = _.get(req.body,'ug_url',false);
  console.log(ug_url);
  if (!ug_url) return res.status(500).send({msg:"Missing ug url"});

  return song(ug_url)
  .then(( pkg )=>{
    console.log("final pkg from song");
    console.log(pkg);
    return res.send(pkg);
  })
  .catch((err)=>{
    console.error('caught err in exports.song');
    console.log(err);
    return res.status(500).send(err);
  })
}

exports.get_version = function(req,res){
  let verNum = _.get(req.body,'verNum','next');
  let userId = _.get(req.body,'userId','no-user-id-provided');
  if(verNum !=="next"){
    verNum = ( isNaN(verNum) ) ? "next" : parseInt(verNum,10);
  }

  //console.log('userId',userId);
  console.log('verNum',verNum);
  var key = datastore.key([ "LastSearch", userId ]);
  var lastSearch = false;

  console.log('key',key);

  return datastore.get(key)
  .then((entities)=>{
    lastSearch = _.get( entities,'0',false);  
    console.log('lastSearch is:');
    console.log(lastSearch);
    if (false===lastSearch) throw new Error("Last search record not found")
    return searchDatastore(lastSearch.artist.toLowerCase(), lastSearch.title.toLowerCase())
  })
  .then(( recs )=>{
    if (recs.length===0) throw new Error("corrupt datastore");

    recs.sort(sortByRating);
    recs.reverse();
    if ( verNum === "next" ){
      var n = lastSearch.cursor+1;
      if ( lastSearch.cursor > recs.length ){
        n = 0;
      }
    }
    else if (verNum <= recs.length){
      var n = recs[verNum-1];
    }
    else{
      var n = 0;
    }

    console.log("n is " + n);
    console.log(recs[n]);
    return saveLastSearch(userId,lastSearch.artist,lastSearch.title,n)
    .then(( )=>{
      return res.send(recs[n]);
    })
    .catch((err) => {
      throw err;
    })
  })
  .catch((err)=>{
    console.error('caught err in exports.get_version');
    console.log(err);
    return res.status(500).send(err);
  })
}

//search(process.argv[2], process.argv[3],0)
//saveLastSearch('rie-test','coldplay','fix you')
/*
get_version('rie-test','10')
.then((rPkg)=>{
  console.log(rPkg);
})
.catch((err)=>{
  console.log(err);
})
*/
