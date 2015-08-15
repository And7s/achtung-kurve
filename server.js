//websocket server
var fs = require('fs');

var Match = {
  state: 0,  // 0: waiting, 1: playing
  actors: {},
  history: [],

  restart: function() {
    console.log("will restart game");
    start_time = getTime(); // match is relative to this time

    var ab = Structure.pack({}, 3);

    for(var it in all_user) {
      this.actors[it] = {
        x: Math.random(),
        y: Math.random(),
        rot: Math.random() * 2 * Math.PI,
        id: all_user[it].getId(),
        gap: 0,
        next_gap: 0
      }

      ab = Structure.append(
        ab,
        Structure.pack(this.actors[it], 2)
      );
    }

    broadcast(ab);

  }
};

eval(fs.readFileSync('structure.js', 'utf8'));
var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer({port: 8080});
console.log("server started");

var connections = 1;
var all_user = {};

var start_time = getTime(); // reference time, when server did start

//accept new incomming connections
wss.on('connection', function(ws) {
  // create a new User
  var user = new User(ws, connections);
  all_user[connections] = user;
  connections++;
  // now hes part of all users, inform others
  //user.distributeUserData();
  Match.restart();
});


//broadcast to anyone, but the sender
var broadcast = function (ab, exclude) {
  for(var it in all_user) {
    if(all_user[it].getId() == exclude) continue;
    all_user[it].send(ab);
  }
};


var User = function(ws, id) {
  console.log("create new user id: "+id);
  // construct the user
  var _last_msg = getTime();
  var _ws = ws;
  var _id = id;
  var _this = this;
  var _name = "noName_"+id;

  _ws.binaryType = 'arraybuffer';

  _ws.on('close', function() {
    console.log("closed this user" + id);
    _this.disconnect();
  });

  _ws.on('message', function(message, flags) {
    _last_msg = getTime();
    //process.stdout.write("m");
    if(flags.binary) {
      Structure.parse(message, processMessage);
    }else { //non binary message, possibly json?
      console.log(message);
    }
  });

  var processMessage = function(obj) {
    obj.from = id;
    var ab = Structure.pack(obj, obj.type );
    //console.log("recv ", obj);
    switch(obj.type) {
      case 0:  // not interested in welcome message
        break;
      case 1: // direction update -> broadcast
        var now = getTime() - start_time;
        var gap = all_user[_id].gap;

        var that = Match.actors[_id];
        if(that.gap <= now && that.gap != 0) { // gap changed to over
          that.gap = 0;
          that.next_gap = now + 500 + Math.random() * 1500;
        }
        if(that.gap == 0 && that.next_gap <= now) { // gap changed to active
          that.gap = now + Math.random() * 400 + 100;
        }
        console.log("gap: "+that.gap+" next "+that.next_gap+"now "+now);

        broadcast(Structure.pack({
          id: _id,
          dir: obj.dir,
          time: now,
          gap: that.gap,
          next_gap: that.next_gap
        }, 1));
        break;
    }

  };


   // will remove current user (which has rank _rank) and update other ranks
  this.disconnect = function() {
    delete all_user[_id];
  };

  this.getId = function() {
    return _id;
  };

  this.send = function(obj) {
    //console.log("try send to "+_id);

    try {
      _ws.send(obj);
    }catch(e) {
      console.log("error",e);
    }
  };

  // welcome the user
  this.send(Structure.pack({
    id: _id,
    state: Match.state
  }, 0));


};





function getTime() {
  return (new Date()).getTime();
}




