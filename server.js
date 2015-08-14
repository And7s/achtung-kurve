//websocket server
var fs = require('fs');

var Match = {};

eval(fs.readFileSync('structure.js', 'utf8'));
var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer({port: 8080});
console.log("server started");

var connections = 0;
var all_user = [];

//accept new incomming connections
wss.on('connection', function(ws) {
  // create a new User
  var user = new User(ws, connections, all_user.length);
  connections++;
  all_user.push(user);
  // now hes part of all users, inform others
  //user.distributeUserData();

});


var User = function(ws, id, rank) {
  console.log("create new user id: "+id+" rank: "+rank);
  // construct the user
  var _last_msg = getTime();
  var _ws = ws;
  var _rank = rank;
  var _id = id;
  var _this = this;
  var _name = "noName_"+id;

  _ws.binaryType = 'arraybuffer';

  _ws.on('close', function() {
    console.log("closed this user" + id);
  });

  _ws.on('message', function(message, flags) {
    _last_msg = getTime();
    //process.stdout.write("m");
    if(flags.binary) {

      var obj = Structure.parse(message);
      obj.from = id;
      var ab = Structure.pack(obj, obj.type );
      console.log("recv ", obj);
      switch(obj.type) {
        case 0:  // not interested in welcome message
          break;
        case 1: // direction update -> broadcast
          _broadcast(ab);
          break;

      }

    }else { //non binary message, possibly json?
      console.log(message);
    }
  });


  //broadcast to anyone, but the sender
  var _broadcast = function (ab, exclude) {
    for(var i = 0; i < all_user.length; i++) {
      if(i === exclude) continue;
      all_user[i].send(ab);
    }
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
    rank: _rank
  }, 0));


};





function getTime() {
  return (new Date()).getTime();
}




