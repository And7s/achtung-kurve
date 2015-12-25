//websocket server
var fs = require('fs');

var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
eval(fs.readFileSync('../structure.js', 'utf8'));
eval(fs.readFileSync('match.js', 'utf8'));
eval(fs.readFileSync('user.js', 'utf8'));
eval(fs.readFileSync('../pickup_descr.js', 'utf8'));
var WebSocketServer = require('ws').Server;

var Server = {
  wss: new WebSocketServer({port: 8080}),
  all_user: {},
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
    for (var it in Server.all_user) {
      Server.all_user[it].send(obj);
    }
  }
};

Server.wss.on('connection', function(ws) {
  var user = new User(ws, Server.connections);// create a new User
  Server.all_user[Server.connections] = user;
  Server.connections++;
});


var Hist = [];


function getTime() {
  return new Date().getTime();
}
