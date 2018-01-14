'use strict';
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const Promise = require("bluebird");
const moment = require("moment");
const PORT = process.env.PORT || 8080;

const axios = require("axios");
const https = require('https');
const S = {
  axiosFetchSongChords: axios.create({
    baseURL: "https://www.googleapis.com/",
    timeout: 8000
  }),
  agent : new https.Agent({ keepAlive: true }),
}
const pubsub = require('@google-cloud/pubsub')({
  projectId: "castaway-191110",
  keyFilename: './storage-subscriber.json'
})

//const pubsub = require('@google-cloud/pubsub')();

/*
Example gcp_pub_msg looks like:  (the data field contains a Buffer , it must be toString()'d to  
{

    connectionId: '2055273c-e711-4d1c-8746-da5d549912eb',
    ackId: 'fiowRUFeQBJMIQVESVMrQwsqWBFOBCEhPjA-RVNEUAYWLF1GSFE3GQhoUQ5PXiM_NSAoRRAAIG8MPUJeE2JoXFx1B1ALGSEvY3xsWhAHCEVZfndrOTNpVVR9A1UEHHt-ZHJtXTv096qkjK1vZh89WxJLLD4',
    id: '19884495935777',
    attributes:
     { bucketId: 'song-chords',
       eventType: 'OBJECT_METADATA_UPDATE',
       notificationConfig: 'projects/_/buckets/song-chords/notificationConfigs/1',
       objectGeneration: '1515070953781113',
       objectId: 'tab/onerepublic/apologize_tabs_922010',
       payloadFormat: 'JSON_API_V1' },
    publishTime: 2018-01-06T11:09:34.653Z,
    received: 1515236975141
    data: {
      "kind": "storage#object",
      "id": "song-chords/tab/onerepublic/apologize_tabs_922010/1515070953781113",
      "selfLink": "https://www.googleapis.com/storage/v1/b/song-chords/o/tab%2Fonerepublic%2Fapologize_tabs_922010",
      "name": "tab/onerepublic/apologize_tabs_922010",
      "bucket": "song-chords",
      "generation": "1515070953781113",
      "metageneration": "3",
      "contentType": "text/html; charset=utf-8",
      "timeCreated": "2018-01-04T13:02:33.767Z",
      "updated": "2018-01-06T11:09:34.420Z",
      "storageClass": "STANDARD",
      "timeStorageClassUpdated": "2018-01-04T13:02:33.767Z",
      "size": "127",
      "md5Hash": "uwZhpGr99ROaol2RHvwa/A==",
      "mediaLink": "https://www.googleapis.com/download/storage/v1/b/song-chords/o/tab%2Fonerepublic%2Fapologize_tabs_922010?generation=1515070953781113&alt=media",
      "contentEncoding": "gzip",
      "metadata": {
        "castaway": "1515236973868-rie"
      },
      "crc32c": "rtKlog==",
      "etag": "CPnuiZCvvtgCEAM="
    }
*/

const received_song_chords_msg = (gcp_pub_msg)=>{
  gcp_pub_msg.ack()
  console.log("received song chords msg from metadata change to song-chords bucket");
  //console.log(gcp_pub_msg);
  var data = JSON.parse(gcp_pub_msg.data.toString());
  console.log("----data----");
  //console.log(data);
  //console.log(typeof data);
  //we need to parse this again, because a metadata key can't hold an object, so our castaway google cloud function (named: song) placed it as a JSON string under 1 key
  //var jobDoc = data.metadata;
  var pathToSong = data.mediaLink.replace("https://www.googleapis.com/","");
  var rc = {
    url: pathToSong,
    method: 'get',
    httpsAgent: S.agent
  }

  var path = "/tmp/"+pathToSong.replace(/\//g,"_")+".html";
  console.log("fetching from " + pathToSong);

  return S.axiosFetchSongChords.request(rc)
  .then((res)=>{
    var pre_html = res.data;
    console.log("--START PRE HTML--");
    console.log(res.data);
    console.log("--END PRE HTML--");
    for(var client_id in app.locals.clients){
      if (app.locals.clients[client_id].connected){
        console.log(client_id, " is connceted");
        app.locals.clients[client_id].emit('msg-from-server',{pre_html: pre_html})
      }
      else console.log(client_id, " is NOT connceted");
    }
    console.log("It's " + (new Date()).toString());
  })
}

var subscription_to_song_chords = pubsub.topic('song-chords').subscription('sub-to-song-chords');
subscription_to_song_chords.on('message',received_song_chords_msg);
console.log(subscription_to_song_chords);
app.locals.clients = [];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/sender.html');
});

io.on('connection', function(socket){
  console.log('client socket connected', socket.id);
  //socket.emit('msg-from-server',{msg: "Hello from express app"})
  socket.on('disconnect',( e )=>{
    console.log(e, 'disconnected');
  })
  socket.on('msg-from-client',(data)=>{
    console.log(data);
  })
  
  app.locals.clients[ socket.id ] = socket;
  socket.on('disconnect',(reason)=>{
    console.log(socket.id + " disconnected with reason:" , reason);
    delete app.locals.clients[ socket.id ];
  })

  console.log("\n---socket--\n");
  //console.log(socket); 
  setTimeout(() =>{
    socket.send( "socket connected", (ackRes)=>{ console.log("got ack res", ackRes); });
  }, 3000)
});

http.listen(PORT, function(){
  console.log(`listening on *:${PORT}`);
});
