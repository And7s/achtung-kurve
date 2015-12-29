
App.mask = new Uint8Array(App.maskRes * App.maskRes);

// on match start

var Match = {
  next_pickup: 0,

  restart: function() {
    console.log('restart');
    // inform the user
    Server.restart();
    Pickups.arr = [];
    Match.next_pickup = Math.random() * 200; //2000 + Math.random() * 4000;

    App.clearField();

    var num_users = Object.keys(App.actors).length;
    //console.log("num user", num_users);
    var count = Math.random() * num_users;  // rotation where to start

    for (var it in App.actors) {
      //var x = Math.random() - 0.5;
      //var y = Math.random() - 0.5;
      var x = Math.sin(2 * Math.PI / num_users * count) * 0.5;
      var y = Math.cos(2 * Math.PI / num_users * count) * 0.5;
      x *= Math.random() * 0.9;
      y *= Math.random() * 0.9;

      count++;

      var angle = Math.atan(y / x);
      if (x < 0 ) {
        angle = Math.PI + angle;
      }
      angle += Math.PI; // direct angle TO the center
      //angle += Math.random() * Math.PI / 2 - Math.PI / 4;   // max. 45^jitter
      var user = App.actors[it];

      user.x = x + 0.5;
      user.y = y + 0.5;
      user.rot = angle;
      user.isInvert = false;
      user.isInvincible = DEBUG;
      user.isNoControl = false;
      user.is90Deg = DEBUG;
      user.isInvisible = false;
      user.speed = 2E-4;
      user.state = ACTOR_SPAWNING;

      // take care of scope (user reused in next loop iteration)
      setTimeout(function(user) {
        console.log('user is now playing');
        user.state = ACTOR_PLAYING;
      }, 2000, user);

      user.broadcast();
    }
  },

  reconsider: function() {
    console.log('reconsider');
    Match.restart();
  },

  update: function() {
    Server.updateTime();

    // gaps
    if (Match.next_pickup <= Server.now && Match.state != 0) {
      Match.addPickup();
    }
  },

  addPickup: function() {

    // determine which pickup i should choose
    console.log("new pickup");

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
    var obj = {
      x: Math.random(),
      y: Math.random(),
      num: pick_item.num,
      apply: pick_item.apply,
      id: Pickups.getNextId()
    };

    Pickups.add(obj);
    Server.broadcast(Structure.pack(obj, 4));
    Match.next_pickup = Server.now + Math.random() * 5000;
  }
};

setInterval(function() {
  Match.update()
}, 66);