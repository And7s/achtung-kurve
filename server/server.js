//websocket server
var fs = require('fs');

eval(fs.readFileSync(__dirname + '/../constants.js', 'utf8'));

var App = {
  actors: {},
  maskRes: 500,
  state: GAME_STOP,
  clearField: function() {
    // clear field (mask)
    var L = App.maskRes * App.maskRes;
    for (var i = 0; i < L; i++) {
      App.mask[i] = 0;
    }
  }
};

Field = {
  trans: DEBUG
};

//var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
eval(fs.readFileSync(__dirname + '/../structure.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/match.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/user.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/../pickup.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/../actor.js', 'utf8'));
var WebSocketServer = require('ws').Server;
var __ = require('underscore');

var PORT = process.env.PORT || 8080;
/*
var express = require("express");
var http = require("http");
var app = express();
   app.use(express.static(__dirname + "/"));

var server2 = http.createServer(app);
server2.listen(PORT);*/
    /*
console.log("http server listening on %d", PORT);

*/
console.log('PORT ' + PORT);
var Server = {
  wss: new WebSocketServer({port: PORT}),
  time: getTime(), // reference time, when server did start
  now: 0, // time the match is running
  p_id: 0,
  connections: 0,

  updateTime: function() {
    Server.now = getTime() - Server.time;
    return Server.now;
  },

  broadcast: function(obj) {
    Hist.push(obj);
    for (var it in App.actors) {
      App.actors[it].send(obj);
    }
  },

  restart: function() {
    Hist = [];
    this.time = getTime();
    this.broadcast(Structure.pack({time: this.updateTime()}, 3));
  }
};

Server.wss.on('connection', function(ws) {
  var user = new User(ws, Server.connections);// create a new User
  App.actors[Server.connections] = user;
  Server.connections++;

  Match.reconsider();
});


var Hist = [];


function getTime() {
  return new Date().getTime();
}
