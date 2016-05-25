var ws;
var HOST = (location.host == 'and7s.github.io') ? 'achtung-kurve.herokuapp.com/' : 'localhost:8080';

var Client = {
  id: null,
  initialize: function() {
    ws = new WebSocket('ws://' + HOST);

    ws.binaryType = 'arraybuffer';
    console.log('connecting to server ' + HOST);

    ws.onopen = function(e) {
      console.log('successfully connected');
    };

    ws.onclose = function(e) {

      setTimeout(function() {
        Client.initialize();
      }, 1000);
    };

    ws.onmessage = function (e, flags) {
      Client.processMessage(Structure.parse(e.data));
    };
  },

  processMessage: function(obj) {
    // console.log(obj);
    if (obj.time < App.time) {
      console.log('smaller time ', obj);
    }
    if (obj.type != 4) {  // pick
      App.time = obj.time;
    }

    switch(obj.type) {
      case 0:   // welcome new user
        console.log('new actor'+obj.id);
        App.actors[obj.id] = new Actor(obj);
        if (obj.isYou) {
          Client.id = obj.id;
        }
      break;
      case 1:   // update position
        if (!App.actors[obj.id]) {
          App.actors[obj.id] = new Actor(obj);
        }
        App.actors[obj.id].dispatchEvent(obj);
      break;
      case 3:   // new Match
        App.restartMatch();
        break;
      case 4: // add pickup
        Pickups.add(obj);
        break;
      case 5:  // collect pickup (effect)
        Pickups.effect(obj);
        break;
      case 6:   // score a point
        App.actors[obj.id].addScore(obj.amount);
        break;
      case 7:   // diseffect (remove pickup)
        Pickups.disEffect(obj);
        break;
    }
  },

  push: function() {  // send data with timestamp to the client inform him abut what has changed
    if(ws.readyState !== 1) {
      //console.log('cant send, no connection');
      return;
    }
    // TODO: push every xms, or whenever sth has changed
    var sendDir = 0;
    if(Key.down(39) || Key.down(68)) {
      sendDir = 1;
    }else if(Key.down(37) || Key.down(65)) {
      sendDir = -1;
    }
    ws.send(Structure.pack({
      dir: sendDir
    }, 2));

  },

  setActive: function(active) {
    if(ws.readyState !== 1) {
      //console.log('cant send, no connection');
      return;
    }
    ws.send(Structure.pack({
      active: active
    }, 8));
  },

  getId: function() {
    return this.id;
  }
};
