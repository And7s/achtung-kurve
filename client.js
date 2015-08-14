

var ws;
var HOST = 'localhost';
var PORT = 8080;

var Client = {
  active: false,
  timeout: null,
  id: null,
  rank: null,

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
        var obj = Structure.parse(e.data);
        console.log("recv ", obj)
        switch(obj.type) {
          case 0:
            id = obj.id;
            rank = obj.rank;
          break;
          case 1:
            App.dispatchEvent(obj);
          break;
        }
      }
    };
  },

  sendDir: function(dir) {
    if(ws.readyState !== 1) return;
    console.log("send");
    ws.send(Structure.pack({
      id: this.id,
      dir: dir
    }, 1));
  }
};
