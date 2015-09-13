

var ws;
var HOST = (location.host == "and7s.github.io") ? '212.227.97.146' : '192.168.2.100';
//var HOST = 'localhost';
//var HOST = '212.227.97.146';
var PORT = 8080;

var Hist = [];
var Client = {
  active: false,
  timeout: null,
  id: null,
  p_id: 0,
  sendqueue: new ArrayBuffer(0),

  initialize: function() {

    ws = new WebSocket('ws://'+HOST+':'+PORT+'/');

    var that = this;

    ws.binaryType = 'arraybuffer';
    console.log("connecting to server "+HOST);

    ws.onopen = function(e) {
      that.active = true;
      Client.p_id = 0;
      console.log("Connected to "+HOST+":"+PORT);
    };

    ws.onclose = function(e) {
      that.active = false;

      console.log("Connection lost to server", e);
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
      //console.log("message", objs);
      for(var i = 0; i < objs.length; i++) {
        var obj = objs[i];
        //console.log("mypid "+Client.p_id+" vs "+obj.p_id);
        if(Client.p_id == obj.p_id) continue; // already allied this change
        if(Client.p_id > obj.p_id) {  // client already has this patch applied
          //console.log("error wrong pids");
          //console.log(obj);
          //debugger;
          continue;
        }
        if(Client.p_id != obj.p_id -1) {
          //debugger;
        }
        Hist.push(obj);
        //console.log(obj);
        App.time = obj.time;
        Client.p_id = Math.max(obj.p_id, Client.p_id);

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
        case 6:
          App.scores[obj.id] = App.scores[obj.id] + 1 || 1;
          App.state = 0;  // after match;
          App.last_win = obj.id;
        break;
        }

      }
    }
  },

  push: function() {  // send data with timestamp to the client inform him abut what has changed
    //console.log("try send");
    if(ws.readyState !== 1 || this.id === null) return;

    //console.log("continue");
    var sendDir = 0;
    // no pause
    if(App.state == 2) {
      if(Key.down(39) || Key.down(68)) {
        sendDir = 1;
      }else if(Key.down(37) || Key.down(65)) {
        sendDir = -1;
      }
    }

    this.appendQueue({
      type: 1,
      id: this.id,
      dir: sendDir,
      time: App.time,
      p_id: Client.p_id
    });

    //console.log("send ", Client.sendqueue);
    //console.log("length ", Client.sendqueue.byteLength);
    if(Client.sendqueue.byteLength > 0)
      ws.send(Client.sendqueue);
    Client.sendqueue = new ArrayBuffer(0);
  },

  getId: function() {
    return this.id;
  },

  appendQueue: function(obj) {
    Client.sendqueue = Structure.append(
      Client.sendqueue,
      Structure.pack(obj, obj.type)
    );
  },

  sendPickup: function(type) {
    this.appendQueue({
      type: 5,
      p_id: Client.p_id,
      time: App.time,
      id: this.id,
      num: type
    });
  },

  sendEnd: function(id) {
    this.appendQueue({
      type: 6,
      p_id: Client.p_id,
      time: App.time,
      id: id
    });
  }
};


setInterval(function() {
  Client.push()
}, 15);