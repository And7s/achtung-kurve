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
  p_id: 2,  // start with 2, bec. 0=no message, 1=fst welcome, from there (2) history kicks in
  stats: {
    c_in: 0,
    c_out: 0,
    t_in: 0,
    t_out: 0,
    last_time: getTime(),
    maxt: 0
  },
  pending_timeouts: {},

  updateTime: function() {
    Server.now = (getTime() - Server.time);
    return Server.now;
  }
};

var Hist = [];

console.log("server started");
//accept new incomming connections
Server.wss.on('connection', function(ws) {
  var user = new User(ws, Server.connections);// create a new User
  Server.all_user[Server.connections] = user;
  console.log('create dummy with', Server.connections);
  Match.createDummy(Server.connections);
  Match.reconsider();
  Server.connections++;
  //Match.restart();
});


var User = function(ws, id) {
  console.log("create new user id: "+id);
  // construct the user
  var _last_msg = getTime();
  var _user_p_id = 0;
  var _assume_p_id = 0; // the pid the client has under the assumption all packages have been recv
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

      _user_p_id = Math.max(obj.p_id, _user_p_id);
      //console.log('user is at '+_user_p_id+' '+Server.p_id);
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
    delete Match.actors[_id];
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

  this.push = function(pessimistic) {
    pessimistic = pessimistic || false;
    // collect events till this time point, go back in time
    var num;
    if (pessimistic) {
      num = Server.p_id - _user_p_id;
    } else {
      num = Server.p_id - _assume_p_id; // one safety package
      _assume_p_id = Server.p_id;
    }


    var start_package = Hist.length - num,
      end_package = Hist.length;
    if (num <= 0) {
      start_package = Hist.length - 1;
      num = 1; // if number is negative, due to package loss, take one message
    }
    if (num > 60) {// limit packages send at once, send the 60 packages, after the last one (so not the current once
      start_package = Math.max(Hist.length - num, 0); // need to avoid negative overflows, during game restart
      end_package = start_package + 60;
    }

    // valid start and end
    start_package = Math.max(start_package, 0);
    end_package = Math.min(end_package, Hist.length);

    Server.stats.packs += num;
    var arr_of_buff = [];
    var start = process.hrtime();
    for(var i = start_package; i < end_package; i++) {
      arr_of_buff.push(Hist[i]);
    }
    ab = Buffer.concat(arr_of_buff);




    //console.log('send '+num);
    _this.send(ab);

    var end = process.hrtime();
    var diff = (end[0] - start[0]) * 1E9 + end[1] - start[1];
    if(diff < 0) {
      console.log(start);
      console.log(end);
      console.log(diff);
    }
    Server.stats.maxt = Math.max(Server.stats.maxt, diff);
     //console.log('packing '+num+' took '+diff);
    Server.stats.tpacking += diff;

  };


  // welcome the user
  _this.send(Structure.pack({
    id: _id,
    state: Match.state,
    p_id: Match.start_p_id,  // so the user knows where p_id is currently
    time: Server.updateTime()
  }, 0));
};

function getTime() {
  return (new Date()).getTime();
}


var Match = {
  state: 0,  // 0: waiting, 1: playing
  actors: {},
  next_pickup: 0,
  start_p_id: 0,  // at which the match started (for new starters)
  restart: function() {
    console.log("will restart game");
    Server.time = getTime();
    Match.state = 1;  // awakening
    Match.start_p_id = Server.p_id - 1; // minus one, so you will get the nex real history package
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
        time: Server.updateTime(),
        state: ACTOR_WAITING
      };

      Hist.push(Structure.pack(this.actors[it], 2)); // spawn position of actors
    }
    //console.log(this.actors);

    setTimeout(function() {
      Match.state = 2;
    }, 2000);
  },

  // consider if i should start a new match
  reconsider: function() {
    var alive = 0;
    for (var it in this.actors) {
      if (this.actors[it].state == ACTOR_WAITING || this.actors[it].state == ACTOR_PLAYING) {
        alive++;
      }
      console.log('state ' + this.actors[it].state);
    }
    console.log('there are '+alive);
    if (alive <= 1) {
      console.log('bec');
      Match.restart();
    }
  },

  createDummy: function(id) {
    // initialize objects that are necessary during waiting phase
    this.actors[id] = {
      type: 2,
      gap: 0,
      next_gap: 0,
      p_id: 0,
      time: 0,
      state: ACTOR_WATCHING
    };
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
      console.log('probability of all pickups is ', pickup_sum);

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
  }
};

setInterval(function() {
  Match.update()
}, 66);

setInterval(function() {
  console.log("Network stats:");
  console.log("====") ;
  console.log("Cin "+Server.stats.c_in +
    " Cout: " + Server.stats.c_out +
    " packs "+Server.stats.packs +
    ' packing took ' + (Server.stats.tpacking / 1E6) + 'ms' +
    ' maxt ' + (Server.stats.maxt / 1E6) + 'ms');
  console.log("traffic in: "+ Server.stats.t_in+" out "+ Server.stats.t_out);

   Server.stats = {
    c_in: 0,
    c_out: 0,
    t_in: 0,
    t_out: 0,
    last_time: getTime(),
    packs: 0,
    tpacking: 0,
    maxt: 0
  };
}, 999);


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