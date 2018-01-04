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
const datastore = Datastore({ projectId: "castaway-191110", keyFilename: "./datastore-writer.keys.json" });
const DS_KIND = "Song";


const axios = require("axios");
const https = require('https');
const S = {
  //https://www.ultimate-guitar.com/search.php?search_type=title&order=&value=kesha+your+love+is+my+drug
  axiosSearch: axios.create({
    baseURL: "https://www.ultimate-guitar.com/",
    timeout: 10000
  }),
  axiosSong: axios.create({
      baseURL: "https://tabs.ultimate-guitar.com/",
      timeout: 10000
    }),
  agent : new https.Agent({ keepAlive: true }),
  songBkt : storage.bucket(SONG_BUCKET_NAME)
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
  console.log('key',key);

  var rc = {
    url:path,
    method: 'get',
    httpsAgent: S.agent
  }
  
  var pathToTmp = "/tmp/"+path.replace(/\//g,"_")+".html";
  console.log("fetching " + path);

  return S.axiosSong.request(rc)
  .then((res)=>{
    var nn = $("pre.js-tab-content.js-copy-content.js-tab-controls-item",res.data);
    //console.log(nn); console.log(nn.length);
    if(nn.length===0){
      throw new Error("Failed to fetch chord sheet");
    }

    var pre_html = nn.eq(0).html()
    console.log('len of pre_html',pre_html.length);

    /*
     * got the html we want
     * 1. store it in storage bucket song-chords/path/to/chordsheet
     * 2. update datastore record to indicate we have the html
     */
    return write(pathToTmp,pre_html)
  })
  .then(( )=>{

    var opts = { resumable: true, gzip: true, predefinedAcl:'publicRead', destination: path };
    return S.songBkt.upload(pathToTmp,opts);
  }) 
  .then(( )=>{
    var r = {
      path: path
    }
    return datastore.get(key)
  })
  .then((entities)=>{

    entities[0].path = path;
    return datastore.update({ key: key, data: entities[0] })
  })
  .then(()=>{

    console.log('updated');
    return true;
  })
  .catch((err)=>{
    throw err;
  })
}

exports.song = function(req,res){
  let ug_url = _.get(req.body,'ug_url',false);
  console.log(ug_url);
  if (!ug_url) return res.status(500).send({msg:"Missing ug url"});

  let pkg = { ug_url: ug_url };
  //console.log(pkg);
  return song(ug_url)
  .then((success)=>{
    //console.log(pkg);
    pkg.success = success;
    return res.send(pkg);
  })
  .catch((err)=>{
    console.error('caught err in exports.song');
    console.log(err);
    return res.status(500).send(err);
  })
}

function search(artist,title){
  artist = encodeURIComponent(artist);
  title = encodeURIComponent(title);
  var returnPkg = {
  };
  var path = `search.php?search_type=title&order=&value=${artist}+${title}`;
  var rc = {
    url:path,
    method: 'get',
    httpsAgent: S.agent
  }
  
  console.log("Fetching search results:", rc.url);
  returnPkg.statements = [];
  return S.axiosSearch.request(rc)
  .then((res)=>{
  //read("./sr.html").then((res)=>{
    //console.log(res.data);
    //var tt  = $("div.content table",res.toString());
    var tt  = $("div.content table",res.data);
    
    //console.log(tt.length);
    if ( tt.length=== 0 ){
      throw new Error("UG content not found");
    }

    var tbl = tt.eq(0)
    var links = $( "a.song.result-link", tbl );
    var recs = [];

    if ( links.length=== 0 ){
      throw new Error("UG result links not found");
    }

    returnPkg.urls = [];
    
    links.each(function(idx,atag){

      //console.log($(atag).attr("href"));
      var url = $(atag).attr("href");
      var tr = $(atag).parents("tr").eq(0);

      if ( !tr ) throw new Error("Error parsing UG sr - cant find trs");

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
    })

    recs = recs.filter(function(r){ 
      return r.fmt=="chords" || r.fmt=="tab";
    })

    returnPkg.counts = _.groupBy(recs, "fmt" );
    returnPkg.statements.push("I found");
    for(var k in  returnPkg.counts){
      returnPkg.statements.push( returnPkg.counts[k].length + " " + k + ",");
    }

    //sort lowest rated to highest so we can pop off
    recs.sort( (a,b) => { 
      if ( a.fmt<b.fmt) 
        return 1; 
      else if ( a.fmt>b.fmt) 
        return -1; 
      else {
        if ( a.rating>b.rating ) return 1 ; 
        else return -1; 
      } 
    });

    //console.log(recs);
    //return write("./sr.html",res.data);
    returnPkg.recs = recs;
    return recs;
  })
  .then((recs)=>{

    return Promise.mapSeries( recs, (r)=>{ 

      var ug_path = r.url.replace("https://tabs.ultimate-guitar.com/","");
      var key = datastore.key([ DS_KIND, ug_path ]);
      return datastore.upsert({ key: key, data:r })
      .then(()=>{
        console.log('inserted');
        return true;
      })
      .catch((err)=>{
        console.log("failed insert");
        console.error(err);
        return err;
      })
    })
 })  
 .then((insertResults)=>{
    console.log(insertResults.length);
    //var hr = recs.pop(); //highest rating
    //return song(hr.url);
    return returnPkg;
  })
  .catch((err)=>{
    //console.error(err);
    return err;
  })
}

exports.search = function(req,res){
  let artist = _.get(req.body,'artist',false);
  let title = _.get(req.body,'title',false);
  console.log(artist,title);
  if (!artist) return res.status(500).send({msg:"Missing artist"});
  if (!title) return res.status(500).send({msg:"Missing title"});

  let pkg = { artist: artist, title:title };
  //console.log(pkg);
  return search(artist,title)
  .then((rPkg)=>{
    //console.log(pkg);
    _.merge(pkg,rPkg);
    return res.send(rPkg);
  })
  .catch((err)=>{
    return res.status(500).send(err);
  })
}

//search('this is me','greatest showman').then((pkg)=>{ console.log(pkg); });
//run("tab/misc_soundtrack/the_greatest_showman_-_this_is_me_chords_2248659");
