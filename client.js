var ws;
var HOST = (location.host == "and7s.github.io") ? '212.227.97.146' : '192.168.2.100';
var HOST = 'localhost';
var HOST = '212.227.97.146';
var PORT = 8080;


var tmp_last = 0;
var Client = {
  active: false,
  timeout: null,
  id: null,
  p_id: 0,
  rp_id: 0, // recieved package id, so therer are no unnecessary packages resend, that alreay were recieved
  behind_time: 0,
  messagebuffer: [],
  bufferdelay: 30, // time for buffering messages and getting smoother rendering
  buffertime: 0,
  updatetime: 0,
  sendqueue: new ArrayBuffer(0),

  initialize: function() {

    ws = new WebSocket('ws://' + HOST + ':' + PORT + '/');

    var that = this;

    ws.binaryType = 'arraybuffer';
    console.log("connecting to server "+HOST);

    ws.onopen = function(e) {
      that.active = true;
      Client.p_id = 0;
      Client.rp_id = 0;
      console.log("Connected to " + HOST + ":" + PORT);
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
      App.stats.packages_recv++;
      if(typeof(e.data) == "string") {
        console.log("recieve string ", e.data);
      }else { //binary
        Structure.parse(e.data, function(o) { bufferMessage.call(Client, o); } );
      }
    };

    var bufferMessage = function(objs) {
      Array.prototype.push.apply(this.messagebuffer, objs); // add the new messages to the buffer
      // if messages have been recieved out of order, sort them
      this.messagebuffer.sort(function compare(a, b) {
        return a.p_id - b.p_id;
      });
      this.buffertime = getTime();
      this.apply_time = objs[objs.length - 1].time - this.bufferdelay;

      Client.rp_id = objs[objs.length - 1].p_id;
      App.stats.msg_recv += objs.length;
      var diff = objs[objs.length - 1].time - App.time || 0;  // time difference between server timee and local time
      App.stats.msg_diff += diff;
      App.stats.msg_max = Math.max(App.stats.msg_max, diff);
    };

    // updates the client, applies the latest changes
    this.update = function() {
      var delta = getTime() - this.buffertime;  // delta how much i can apply

      this.buffertime = getTime();

      this.apply_time += delta; // i whould take messages till this point (doesnt mean there are messages till this point)
      for(var i = 0; i < this.messagebuffer.length; i++) {
        // if time is right to apply, or type is 3 (new game)
        if(this.messagebuffer[i].time <= this.apply_time || this.messagebuffer[i].type == 3) {
          var apply = true;
          var remove = true;
          var obj = this.messagebuffer[i];
          if(Client.p_id == obj.p_id) apply = false; // already allied this change
          if (Client.p_id > obj.p_id) {  // client already has this patch applied
            apply = false;
          }
          // new match must be applied aplways, welcome user, too
          if (obj.type == 3 || obj.type == 0) {

          } else {
            if(apply && Client.p_id != obj.p_id - 1) {
              //return;
              apply = false;

              console.log('Client.p_id'+Client.p_id+' '+obj.p_id);
              remove = false;
              console.log(obj);
              //debugger;
            }
          }

          if (apply) processMessage(obj);  // apply this message
          if (remove) {
            this.messagebuffer.shift(); // remove element
            i--;
          }
        }
      }
    };

    // expects a message that is exactly one step further
    var processMessage = function(obj) {

      App.stats.msg_apply++;
      App.time = obj.time;

      if(App.state == 1 && App.time >= 2000) {  // erplaced the original settimeout, casue they might be different locally, take server clock
        App.state = 2;
        for(var it in App.actors) { // awake all actors
          App.actors[it].live();
        }
      }

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
        Pickups.add(obj.num, obj.apply, obj.x, obj.y);
        break;
      case 5:
        Pickups.effect(obj.id, obj.num, obj.apply);
        break;
      case 6:
        App.scores[obj.id] = App.scores[obj.id] + 1 || 1;
        App.state = 0;  // after match;
        App.last_win = obj.id;
        break;
      case 7: // invert pickup
        Pickups.disEffect(obj.id, obj.num, obj.apply);
        break;
      }
    }
  },

  push: function() {  // send data with timestamp to the client inform him abut what has changed
    //console.log("try send"+ this.id+' pid '+Client.p_id);
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
      p_id: Client.rp_id
    });

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

  sendPickup: function(obj) {
    this.appendQueue({
      type: 5,
      p_id: Client.rp_id,
      time: App.time,
      id: this.id,
      num: obj.type,
      apply: obj.apply
    });
  },

  sendEnd: function(id) {
    this.appendQueue({
      type: 6,
      p_id: Client.rp_id,
      time: App.time,
      id: id
    });
  }
};


setInterval(function() {
  Client.push()
}, 15);
