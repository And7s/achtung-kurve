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
var App = {
  maskRes: 500
};

App.mask = new Uint8Array(App.maskRes * App.maskRes);

// on match start
var L = App.maskRes * App.maskRes;
for(var i = 0; i < L; i++) {
  App.mask[i] = 0;
}


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
    var dt = now - this.time;
    if (dt <= 0) return; // avoid divide by zero
    this.time = now;
    var col_checks = 0;
    var num = Math.ceil(dt / 10),   // apply change in time slots of 10ms
        dx, dy;
    for (var n = 0; n < num; n++) {
      this.rot += dir * dt * this.rotSpeed / num;
      dx = Math.cos(this.rot) * dt * this.speed / num;
      dy = Math.sin(this.rot) * dt * this.speed / num;

      var collide = false;
      // collision check
      for (var i = -Math.PI; i <= Math.PI; i+= Math.PI / 10) {

        // i set the mask at the inner bounds, the actual size
        var sx =  Math.cos(this.rot + i) * this.size + this.x * App.maskRes ,
            sy =  Math.sin(this.rot + i) * this.size + this.y * App.maskRes ;

         //console.log("set "+sx+" "+sy+" "+ Math.round(sx)+" "+Math.round(sy));
        // dont check the outer angels, causes false in at rotating
        if (i > -Math.PI / 2.1 && i < Math.PI / 2.1) { // check forwards half
          // this calculates where the pixels whould be drawn ont he reference resolution
          // i will check one pixel more than the radius itself
          // add 1.5 more, so it wont get round in the wrong direction twice(negelcted)

           var cx =  Math.cos(this.rot + i) * (this.size + 1.5) + (this.x + dx / dt) * App.maskRes,
               cy =  Math.sin(this.rot + i) * (this.size + 1.5) + (this.y + dy / dt) * App.maskRes;
          // console.log("check "+cx+" "+cy);
          cx = Math.round(cx);
          cy = Math.round(cy);

          if (cx >= 0 && cx < App.maskRes && cy >= 0 && cy < App.maskRes) {  // avoid out of bounds
            if (App.mask[cy * App.maskRes + cx] == 1) {
              console.log("collide");
              collide = true;
            }
          }
          col_checks++;
        } else if( i < -Math.PI / 2 || i > Math.PI / 2) {  // set behind
          // set the mask, where someone has been
          App.mask[Math.round(sy) * App.maskRes + Math.round(sx)] = 1;
        }
      }

      if (!collide) {
        this.x += dx;
        this.y += dy;
      }

      this.x = (this.x + 1) % 1;
      this.y = (this.y + 1) % 1;
    }
    console.log('checked '+ col_checks);
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
