//websocket server
var fs = require('fs');

var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
eval(fs.readFileSync('structure.js', 'utf8'));
eval(fs.readFileSync('pickup_descr.js', 'utf8'));

var WebSocketServer = require('ws').Server;

var Server = {
  wss: new WebSocketServer({port: 8080}),
  connections: 1,
  all_user: {},
  time: getTime(), // reference time, when server did start
  now: 0, // time the match is running
  p_id: 1,
  stats: {
    c_in: 0,
    c_out: 0,
    t_in: 0,
    t_out: 0,
    last_time: getTime()
  },
  pending_timeouts: {},

  updateTime: function() {
    Server.now = (getTime() - Server.time);
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
    Server.stats.c_in++;
    _last_msg = getTime();
    if(flags.binary) {
      Server.stats.t_in += message.length;
      Structure.parse(message, processMessage);
    }else { //non binary message, possibly json?
      console.log(message);
    }
  });

  var processMessage = function(objs) {
    for(var i = 0; i < objs.length; i++) {
      var obj = objs[i];
      //console.log("got msg", obj);

  //    log_file.write("history has lengt "+Hist.length+" user "+_id+" is at state "+_user_p_id+" server state "+Server.p_id+"\n");
      _user_p_id = Math.max(obj.p_id, _user_p_id);
  //    log_file.write("user is at state ", _user_p_id+"\n");
      obj.from = _id;
      if(Match.state != 0) {
        obj.time = Server.updateTime();
      }
      obj.p_id = Server.p_id++;
      switch(obj.type) {
        case 1:
          obj.gap = Match.actors[_id].gap;
          obj.next_gap = Match.actors[_id].next_gap;
          break;
        case 5:
          console.log('RECV A PICKUP EVENT');
          // pickup was collected, create opposite effect
          handlePickup(obj);
          break;
        case 6:
          Match.state = 0;  // pause
          var t = setTimeout(function() {
            delete Server.pending_timeouts[t];
            Match.restart();
          }, 5000);
          Server.pending_timeouts[t] = true;
          break;

      }

      Hist.push(Structure.pack(obj, obj.type));

      //var ab = Structure.pack(obj, obj.type );
    }
    _this.push();
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
      Server.stats.c_out++;
      Server.stats.t_out += obj.length;
    }catch(e) {
      console.log("error",e);
    }
  };

  this.push = function() {
    // collect events till this time point, go back in time
    var num = Server.p_id - _user_p_id;

    if (num < 0) num = 1; // if number is negative, due to package loss, take one message
    if (num > 60) num = 60; // limit packages send at once
    //console.log(_id+" last is at "+Hist[Hist.length - 1].p_id+" user is at "+_user_p_id+" need el "+num+ " Server time "+Server.now);
    //console.log(Hist);

    Server.stats.packs += num;
    var arr_of_buff = [];
    var start = process.hrtime();
    for(var i = Math.max(Hist.length - num, 0); i < Hist.length; i++) {
      arr_of_buff.push(Hist[i]);
    }
    ab = Buffer.concat(arr_of_buff);
    var end = process.hrtime();
    var diff = (end[0] - start[0]) * 1E9 + end[1] - start[1];
    if(diff < 0) {
      console.log(start);
      console.log(end);
      console.log(diff);
    }

    //console.log('packing '+num+' took '+diff);
    Server.stats.tpacking += diff;

    //console.log('send '+num);
    _this.send(ab);

  };


  // welcome the user
  _this.send(Structure.pack({
    id: _id,
    state: Match.state,
    p_id: Server.p_id++,
    time: Server.updateTime()
  }, 0));

  // actually not needed, as answers are sent on recv, but to provide a more fluetn play
  var _interval = setInterval(function() {
    _this.push();
    // bad side effect: after game finished, client doesnt send any linger, package rate drops
  }, 100);
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

    // clear all peding timeouts
    for(var it in Server.pending_timeouts) {
      if(it) {
        clearTimeout(it);
      }
      //delete Server.pending_timeouts[it];
    }
    Server.pending_timeouts = {};

    Hist.push(Structure.pack({
      type: 3,
      time: Server.updateTime(),
      p_id: Server.p_id++
    }, 3)); // start a new game

    Match.next_pickup = Math.random()* 200;//2000 + Math.random() * 4000;

    var num_users = Object.keys(Server.all_user).length;
    //console.log("num user", num_users);
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
        p_id: Server.p_id++,
        time: Server.updateTime()
      };

      Hist.push(Structure.pack(this.actors[it], 2)); // spawn position of actors
    }
    //console.log(this.actors);

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
    // create new pickups
    if (Match.next_pickup <= Server.now && Match.state != 0) {
      // determine which pickup i should choose
      //console.log("new pickup");

      var pickup_sum = 0;
      for (var i = 0; i < PICKUP.length; i++) {
        for (var j = 0; j < PICKUP[i].prop.length; j++) {
          pickup_sum += PICKUP[i].prop[j];
        }
      }
      console.log('propability of all pickups is ', pickup_sum);

      var rand = Math.random() * pickup_sum;


      var pick_item = (function() {
        for (var i = 0; i < PICKUP.length; i++) {
          for (var j = 0; j < PICKUP[i].prop.length; j++) {
            rand -= PICKUP[i].prop[j];
            if (rand <= 0) {
              return {num: i, apply: j};
            }
          }
        }
      })();
      console.log('pick item is ', pick_item);
      


      Hist.push(Structure.pack({
        type: 4,
        p_id: Server.p_id++,
        time: Server.now,
        x: Math.random(),
        y: Math.random(),
        num: pick_item.num,
        apply: pick_item.apply
      }, 4));
      Match.next_pickup = Server.now + Math.random() * 5000;
    }
  },
};

setInterval(function() {
  Match.update()
}, 66);

setInterval(function() {
  console.log("Network stats:");
  console.log("====") ;
  console.log("Cin "+Server.stats.c_in+" Cout: "+Server.stats.c_out+" packs "+Server.stats.packs+' packing took '+(Server.stats.tpacking / 1E6) + 'ms');
  console.log("traffic in: "+ Server.stats.t_in+" out "+ Server.stats.t_out);

   Server.stats = {
    c_in: 0,
    c_out: 0,
    t_in: 0,
    t_out: 0,
    last_time: getTime(),
    packs: 0,
    tpacking: 0
  };
}, 999)


var handlePickup = function(obj) {
  var t = setTimeout(function() {
    delete Server.pending_timeouts[t];
    console.log("append revert");
    obj.type = 7; // diseffect
    obj.time = Server.updateTime();
    obj.p_id = Server.p_id++;
    Hist.push(Structure.pack(obj, obj.type));
  }, PICKUP[obj.num].dur);
  Server.pending_timeouts[t] = true;
}