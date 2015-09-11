//websocket server
var fs = require('fs');

eval(fs.readFileSync('structure.js', 'utf8'));
var WebSocketServer = require('ws').Server;

var Server = {
  wss: new WebSocketServer({port: 8080}),
  connections: 1,
  all_user: {},
  time: getTime(), // reference time, when server did start
  now: 0, // time the match is running
  updateTime: function() {
    Server.now = getTime() - Server.time;
    return Server.now;
  },
  broadcast: function (ab, exclude) { // broadcast to anyone, but the sender
    for(var it in all_user) {
      if(Server.all_user[it].getId() == exclude) continue;
      Server.all_user[it].send(ab);
    }
  }
};

var Hist = [];

console.log("server started");
//accept new incomming connections
Server.wss.on('connection', function(ws) {
  var user = new User(ws, Server.connections);// create a new User
  Server.all_user[Server.connections] = user;
  Server.connections++;
  Match.restart();
});


var User = function(ws, id) {
  console.log("create new user id: "+id);
  // construct the user
  var _last_msg = getTime();
  var _user_p_id = 0;
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
    //_this.push();
  });

  var processMessage = function(objs) {
    for(var i = 0; i < objs.length; i++) {
      var obj = objs[i];
      console.log("got msg", obj);

      console.log("history has lengt "+Hist.length);
      _user_p_id = Math.max(obj.p_id, _user_p_id);
      console.log("user is at state ", _user_p_id);
      obj.from = id;
      obj.time = Server.updateTime();
      obj.p_id = Hist.length;
      Hist.push(obj);

      var ab = Structure.pack(obj, obj.type );
    }
  };


   // will remove current user (which has rank _rank) and update other ranks
  this.disconnect = function() {
    delete Server.all_user[_id];
  };

  this.getId = function() {
    return _id;
  };

  this.send = function(obj) {
    console.log("try send to "+_id);
    try {
      _ws.send(obj);
    }catch(e) {
      console.log("error",e);
    }
  };

  this.push = function() {
    console.log("will push data to client");
    console.log("Client is behind"+(Hist.length - _user_p_id));

    // collect events till this time point, go back in time
    var ab = new Buffer(0);
    for(var i = _user_p_id + 1; i < Hist.length; i++) {
      ab = Structure.append(ab, Structure.pack(Hist[i], Hist[i].type));
      console.log("send message " + i + " to " + _id + " time " + Hist[i].time+" p_id"+Hist[i].p_id);

    }
    _this.send(ab);
  };

  // welcome the user
  _this.send(Structure.pack({
    id: _id,
    state: Match.state,
    p_id: 0
  }, 0));


  setInterval(function() {
    _this.push();
  }, 1000);
};

function getTime() {
  return (new Date()).getTime();
}





var Match = {
  state: 0,  // 0: waiting, 1: playing
  actors: {},
  next_pickup: 0,

  restart: function() {
    console.log("will restart game");

    Match.state = 1;  // awakening
    Hist = [];

    Hist.push({
      type: 3,
      time: Server.updateTime()
    }); // start a new game

    Match.next_pickup = 2000 + Math.random() * 4000;

    var num_users = Object.keys(Server.all_user).length;
    console.log("num user", num_users);
    var count = Math.random() * num_users;  // rotation where to start

    for(var it in Server.all_user) {
      //var x = Math.random() - 0.5;
      //var y = Math.random() - 0.5;
      var x = Math.sin(2 * Math.PI / num_users * count) * 0.5;
      var y = Math.cos(2 * Math.PI / num_users * count) * 0.5;
      x *= Math.random() * 0.9;
      y *= Math.random() * 0.9;

      count++;

      var angle = Math.atan(y / x);
      if(x < 0 ) {
        angle = Math.PI + angle;
      }
      angle += Math.PI; // direct angle TO the center
      //angle += Math.random() * Math.PI / 2 - Math.PI / 4;   // max. 45^jitter

      this.actors[it] = {
        type: 2,
        x: x + 0.5,
        y: y + 0.5,
        rot: angle,
        id: Server.all_user[it].getId(),
        gap: 0,
        next_gap: Math.random() * 2000,
      };

      Hist.push(this.actors[it]); // spawn position of actors
    }
    console.log(this.actors);

    setTimeout(function() {
      Match.state = 2;
    }, 2000);

  }
};