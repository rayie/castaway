/*
 * lambda implementation of app.js
 */
const APP = require("./app.js");
exports.handler = (event, context, callback) => {
    // TODO implement
    console.log('artist',event.artist);
    console.log('artist',event.songTitle);
    callback(null, 'Hello from Lambda');
};

