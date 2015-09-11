

var ws;
var HOST = '192.168.2.100';
//var HOST = 'localhost';
//var HOST = '212.227.97.146';
var PORT = 8080;

var Hist = [];
var Client = {
  active: false,
  timeout: null,
  id: null,
  p_id: 0,

  initialize: function() {

    ws = new WebSocket('ws://'+HOST+':'+PORT+'/');

    var that = this;

    ws.binaryType = 'arraybuffer';
    console.log("connecting to server "+HOST);

    ws.onopen = function(e) {
      that.active = true;
      console.log("Connected to "+HOST+":"+PORT);
    };

    ws.onclose = function(e) {
      that.active = false;

      console.log("Connection lost to server", e);;
      clearTimeout(that.timeout);
      that.timeout = setTimeout(function() {
        that.initialize();
      }, 1000);
    };

    ws.onmessage = function (e, flags) {
      if(typeof(e.data) == "string") {
        console.log("recieve string ", e.data);
      }else { //binary
        Structure.parse(e.data, processMessage);
      }
    };

    var processMessage = function(objs) {

      console.log("message", objs);
      for(var i = 0; i < objs.length; i++) {

        var obj = objs[i];
        Hist.push(obj);
        console.log(obj);
        App.time = obj.time;
        Client.p_id = Math.max(obj.p_id, Client.p_id);

        switch(obj.type) {
        case 0:
          Client.id = obj.id;
          App.state = obj.state;
          break;
        /*case 1:
          App.dispatchEvent(obj);
          break;
        case 2:
          App.setActor(obj);
          break;
        case 3:
          App.time = obj.time;
          App.restartMatch();
          break;
        case 4:
          console.log("add pickup in client");
          console.log(obj);
          Pickups.add(obj.num, obj.x, obj.y);
          break;
        case 5:
          Pickups.effect(obj.id, obj.num);
          break;
        case 6:
          App.scores[obj.id] = App.scores[obj.id] + 1 || 1;
          App.state = 0;  // after match;
          App.last_win = obj.id;
        break;*/
        }

      }
    }
  },

  push: function() {  // send data with timestamp to the client inform him abut what has changed
    console.log("try send package to client");
    if(ws.readyState !== 1 || this.id === null) return;
    console.log("send");
    ws.send(Structure.pack({
      id: this.id,
      dir: 1,
      time: App.time,
      p_id: Client.p_id
    }, 1));

  },

  getId: function() {
    return this.id;
  },


  sendDir: function(dir) {
    /*
    if(ws.readyState !== 1 || this.id === null) return;

    ws.send(Structure.pack({
      id: this.id,
      dir: dir,
      time: App.time
    }, 1));*/
  },

  sendPickup: function(type) {
    if(ws.readyState !== 1) return;

    ws.send(Structure.pack({
      id: this.id,
      num: type
    }, 5));
  },

  sendEnd: function(id) {
    ws.send(Structure.pack({
      id: id
    }, 6));
  }
};


setInterval(function() {
  Client.push()
}, 500);