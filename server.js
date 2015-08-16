//websocket server
var fs = require('fs');

var Match = {
  state: 0,  // 0: waiting, 1: playing
  actors: {},
  history: [],
  next_pickup: 0,

  restart: function() {
    console.log("will restart game");
    start_time = getTime(); // match is relative to this time
    Match.state = 1;  // awakening
    Match.history = [];

    var ab = Structure.pack({
      time: 0
    }, 3);

    Match.next_pickup = 2000 + Math.random() * 4000;

    for(var it in all_user) {
      var x = Math.random() - 0.5;
      var y = Math.random() - 0.5;

      var angle = Math.atan(y / x);
      if(x < 0 ) {
        angle = Math.PI + angle;
      }
      angle += Math.PI; // direct angle TO the center
      angle += Math.random() * Math.PI / 2 - Math.PI / 4;   // max. 45^jitter

      this.actors[it] = {
        x: x + 0.5,
        y: y + 0.5,
        rot: angle,
        id: all_user[it].getId(),
        gap: 0,
        next_gap: Math.random() * 2000,
      }

      ab = Structure.append(
        ab,
        Structure.pack(this.actors[it], 2)
      );
    }

    broadcast(ab);

    setTimeout(function() {
      Match.state = 2;
    }, 2000);

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
    var now = getTime() - start_time;
    var ab = Structure.pack(obj, obj.type );
    //console.log("recv ", obj);
    switch(obj.type) {
      case 0:  // not interested in welcome message
        break;
      case 1: // direction update -> broadcast
        var that = Match.actors[_id];
        if(that.gap <= now && that.gap != 0) { // gap changed to over
          that.gap = 0;
          that.next_gap = now + 500 + Math.random() * 1500;
        }
        if(that.gap == 0 && that.next_gap <= now) { // gap changed to active
          that.gap = now + Math.random() * 600 + 100;
        }
        if(Match.state != 0) {
          console.log("get state at time "+ obj.time + "server time "+now+" delay "+ (now - obj.time));
          var till_time = obj.time;
          obj.time = now; // update time
          obj.id = _id;

          Match.history.push(obj); // add to history

          // collect events till this time point, go back in time
          var ab = new Buffer(0);
          for(var i = Match.history.length - 1; i >= 0; i--) {
            if(Match.history[i].time >= till_time ) {
              // this was the last message (dont have to send again)
              if(Match.history[i].time == till_time && Match.history[i].id == _id) break;
              ab = Structure.append(Structure.pack(Match.history[i], 1), ab);
            }else {
              console.log("no more events");
              break;
            }
          }

          console.log("match history length", Match.history.length);

          _this.send(ab);

        }
        break;
      case 5:
        broadcast(Structure.pack({
          id: _id,
          num: obj.num
        }, 5));
      break;
      case 6:
        if(obj.id != Math.pow(2,32) - 1) {  // give someone a score
          console.log(obj.id);
          broadcast(Structure.pack({
            id: _id
          }, 6));
        }
        Match.state = 0;  // pause
        setTimeout(function() {
          Match.restart();
        }, 5000);
      break;
    }


    // general check
    if(Match.next_pickup < now && Match.state != 0) {
      console.log("new pickup");
      broadcast(Structure.pack({
        x: Math.random(),
        y: Math.random(),
        num: Math.floor(Math.random() * 9)
      }, 4));
      Match.next_pickup = now + Math.random() * 5000;
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




