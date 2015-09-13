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
  p_id: 1,

  updateTime: function() {
    Server.now = (getTime() - Server.time) / 2;
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
      //console.log("got msg", obj);

      console.log("history has lengt "+Hist.length+" user "+_id+" is at state "+_user_p_id+" server state "+Server.p_id);
      _user_p_id = Math.max(obj.p_id, _user_p_id);
      //console.log("user is at state ", _user_p_id);
      obj.from = _id;
      obj.time = Server.updateTime();
      obj.p_id = Server.p_id++;
      switch(obj.type) {
        case 1:
          obj.gap = Match.actors[_id].gap;
          obj.next_gap = Match.actors[_id].next_gap;
          break;
        case 6:
          Match.state = 0;  // pause
          setTimeout(function() {
            Match.restart();
          }, 5000);
          break;

      }

      Hist.push(obj);

      //var ab = Structure.pack(obj, obj.type );
    }
  };


   // will remove current user (which has rank _rank) and update other ranks
  this.disconnect = function() {
    clearInterval(_interval);
    delete Server.all_user[_id];
  };

  this.getId = function() {
    return _id;
  };

  this.send = function(obj) {
    try {
      _ws.send(obj);
    }catch(e) {
      console.log("error",e);
    }
  };

  this.push = function() {
    // collect events till this time point, go back in time
    var ab = new Buffer(0);
    var num = Hist[Hist.length - 1].p_id - _user_p_id;
    console.log("last is at "+Hist[Hist.length - 1].p_id+" user is at "+_user_p_id+" need el "+num+ " Server time "+Server.now);
    //console.log(Hist);
    for(var i = Math.max(Hist.length - num, 0); i < Hist.length; i++) {
      ab = Structure.append(ab, Structure.pack(Hist[i], Hist[i].type));
    }
    _this.send(ab);
  };

  // welcome the user
  _this.send(Structure.pack({
    id: _id,
    state: Match.state,
    p_id: 0
  }, 0));


  var _interval = setInterval(function() {
    _this.push();
  }, 10);
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
    Server.time = getTime();
    Match.state = 1;  // awakening
    Hist = [];

    Hist.push({
      type: 3,
      time: Server.updateTime(),
      p_id: Server.p_id++
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
        p_id: Server.p_id++
      };

      Hist.push(this.actors[it]); // spawn position of actors
    }
    console.log(this.actors);

    setTimeout(function() {
      Match.state = 2;
    }, 2000);

  },

  update: function() {
    Server.updateTime();
    // gaps for users
    for(var it in this.actors) {
      var actor = this.actors[it];
      if(actor.gap <= Server.now && actor.gap != 0) { // set gap changed over
        actor.gap = 0;
        actor.next_gap = Server.now + 500 + Math.random() * 1500;
      }
      if(actor.gap == 0 && actor.next_gap <= Server.now) {  // gap changed to active
        actor.gap = Server.now + Math.random() * 700 + 300;
      }
    }
    // pickups
    if(Match.next_pickup <= Server.now && Match.state != 0) {
      console.log("new pickup");
      Hist.push({
        type: 4,
        p_id: Server.p_id++,
        time: Server.now,
        x: Math.random(),
        y: Math.random(),
        num: Math.floor(Math.random() * 9)
      });
      Match.next_pickup = Server.now + Math.random() * 5000;
    }
  },


};

setInterval(function() {
  Match.update()
}, 66);