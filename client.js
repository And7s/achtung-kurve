

var ws;
var HOST = 'localhost';
var PORT = 8080;

var Client = {
  active: false,
  timeout: null,
  id: null,

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

    var processMessage = function(obj) {

      switch(obj.type) {
        case 0:
          Client.id = obj.id;
          App.state = obj.state;
          break;
        case 1:
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
      }
    }
  },

  getId: function() {
    return this.id;
  },

  sendDir: function(dir) {
    if(ws.readyState !== 1) return;

    ws.send(Structure.pack({
      id: this.id,
      dir: dir
    }, 1));
  },

  sendPickup: function(type) {
    if(ws.readyState !== 1) return;

    ws.send(Structure.pack({
      id: this.id,
      num: type
    }, 5));
  }
};
