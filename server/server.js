//websocket server
var fs = require('fs');

var DEBUG = true;
var App = {
  actors: {},
  maskRes: 500,
  clearField: function() {
    // clear field (mask)
    var L = App.maskRes * App.maskRes;
    for (var i = 0; i < L; i++) {
      App.mask[i] = 0;
    }
  }
};

Field = {
  trans: false
};

var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
eval(fs.readFileSync('../structure.js', 'utf8'));
eval(fs.readFileSync('match.js', 'utf8'));
eval(fs.readFileSync('user.js', 'utf8'));
eval(fs.readFileSync('../pickup_descr.js', 'utf8'));
eval(fs.readFileSync('../pickup.js', 'utf8'));
eval(fs.readFileSync('../actor.js', 'utf8'));
var WebSocketServer = require('ws').Server;
var __ = require('underscore');


var Server = {
  wss: new WebSocketServer({port: 8080}),
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
    this.updateTime();
    this.broadcast(Structure.pack({}, 3));
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
