//websocket server
var fs = require('fs');

var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
eval(fs.readFileSync('structure.js', 'utf8'));
eval(fs.readFileSync('pickup_descr.js', 'utf8'));
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
function User(ws, id) {
  this.x = 0.5;
  this.y = 0.5;
  this.id = id;
  this.rot = 0;
  this.speed = 2E-4;
  this.time = getTime();
  this.last_message = getTime();
  this.rotSpeed = 4E-3;
  this.size = 5;
  var that = this;
  console.log('new user conencted');

  for (var i = 0; i < Hist.length; i++) {
    console.log('send hist'+i);
    ws.send(Hist[i]);
  }

  var welcome = Structure.pack({
    id: this.id,
    state: 0,
    p_id: Server.p_id++,
    time: Server.updateTime()
  }, 0);
  Server.broadcast(welcome);
  ws.send(welcome);  // because the obj is not yet part of all user

  ws.on('message', function(message, flags) {
    var obj = Structure.parse(message);
    // console.log('recv', obj);

    that.update(obj.dir);
    that.broadcast();

  });

  ws.on('close', function() {
    console.log('connection closed to '+  that.id);
    delete Server.all_user[that.id];
  });

  this.update = function(dir) {
    var now = getTime();
    var diff = now - this.time;
    if (diff <= 0) return; // avoid divide by zero
    this.time = now;

    var num = Math.ceil(diff / 10);
    for (var i = 0; i < num; i++) {
      this.rot += dir * diff * this.rotSpeed / num;
      this.x += Math.cos(this.rot) * diff * this.speed / num;
      this.y += Math.sin(this.rot) * diff * this.speed / num;

      this.x = (this.x + 1) % 1;
      this.y = (this.y + 1) % 1;
    }
  };

  this.broadcast = function() {
    Server.broadcast(Structure.pack({
      x: that.x,
      y: that.y,
      rot: that.rot,
      id: that.id,
      state: 0,
      p_id: Server.p_id++,
      time: Server.updateTime()
    }, 1));
  };

  this.send = function(ob) {
    // this proxies the output of messages,
    // avoid sending data at higher rates than x-messages/s
    var diffms = 5,
        now = getTime();
    delay = Math.max(this.last_message - now + diffms, 0);
    this.last_message = now + delay;
    setTimeout(function() {
      if(ws.readyState == 1) {
        ws.send(ob);
      }
    }, delay);
  };
};

function getTime() {
  return new Date().getTime();
}
