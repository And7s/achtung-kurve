
App.mask = new Uint8Array(App.maskRes * App.maskRes);

// on match start

var Match = {
  next_pickup: 0,

  restart: function() {
    App.state = GAME_SPAWNING;
    console.log('restart');
    // inform the user
    Server.restart();
    Pickups.arr = [];

    App.clearField();
    Field.trans = DEBUG;

    var num_users = Object.keys(App.actors).length;
    //console.log("num user", num_users);
    var count = Math.random() * num_users;  // rotation where to start

    for (var it in App.actors) {
      // restart this user
      var user = App.actors[it];
      if (user.state != ACTOR_WATCHING) {
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
        angle += Math.random() * Math.PI / 2 - Math.PI / 4;   // max. 45^jitter


        user.x = x + 0.5;
        user.y = y + 0.5;
        user.rot = angle;
        user.isInvert = false;
        user.isInvincible = false;
        user.isNoControl = false;
        user.is90Deg = false;
        user.isInvisible = false;
        user.speed = 2E-4;

        user.state = ACTOR_SPAWNING;
      }


      user.broadcast();
    }

    setTimeout(function() {
      Match.afterSpawn();
    }, 2000);
  },

  afterSpawn: function() {
    App.state = GAME_PLAYING;
    Match.next_pickup = Server.now + Math.random() * 2000; //2000 + Math.random() * 4000;
    for (var it in App.actors) {
      if (App.actors[it].state != ACTOR_WATCHING) {
        App.actors[it].state = ACTOR_PLAYING;
      }
    }
  },

  reconsider: function() {
    // TODO: add some checks
    // TODO: some notification to the clients
    // TODO: set states properly
    var alive = 0, total = 0, winner = 0;
    for (var it in App.actors) {
      if (App.actors[it].state != ACTOR_WATCHING) {
        total++;
      }
      if (App.actors[it].state == ACTOR_PLAYING || App.actors[it].state == ACTOR_SPAWNING) {
        alive++;
        winner = it;
      }
    }
    console.log('reconsider ' + alive + '/' + total);
    if (alive == 0 ||                 // noone still alive
       (alive == 1 && total > 1)) {   // there is one winner
      if (alive == 1) {
        console.log('winner is ' + winner);
      }
      console.log('will restart');
      App.state = GAME_OVER;
      setTimeout(function() {
        Match.restart();
      }, 2000);
    }
  },

  // after a user dies, there are points distributed
  die: function(id) {
    console.log('die '+id);
    var alive = 0, total = 0, winner = 0;
    for (var it in App.actors) {
      console.log('state of '+it+' is '+App.actors[it].state)
      if (App.actors[it].state != ACTOR_WATCHING) {
        total++;
      }
      if (App.actors[it].state == ACTOR_PLAYING || App.actors[it].state == ACTOR_SPAWNING) {
        // this user is still alive gets 1 point
        App.actors[it].score++;
        alive++;
        winner = it;
        console.log('send a point to '+id);
        Server.broadcast(Structure.pack({
          id: it,
          amount: 1
        }, 6));
      }
    }
    // the last alive user (winner) gets 5 points
    if (alive == 1 && total > 1) {
      console.log('winner '+winner);
      App.actors[winner].score += 5;
      Server.broadcast(Structure.pack({
        id: winner,
        amount: 5,
        time: Server.updateTime()
      }, 6));
    }
  },

  update: function() {
    Server.updateTime();

    // gaps
    if (Match.next_pickup <= Server.now && App.state == GAME_PLAYING) {
      Match.addPickup();
    }


    // maybe update those palyes that dc'd or didnt send enough packages
    for (var it in App.actors) {
      App.actors[it].backgroundUpdate();
    }
  },

  addPickup: function() {

    // determine which pickup i should choose
    // console.log("new pickup");

    var pickup_sum = 0;
    for (var i = 0; i < PICKUP.length; i++) {
      for (var j = 0; j < PICKUP[i].prop.length; j++) {
        pickup_sum += PICKUP[i].prop[j];
      }
    }
    // console.log('probability of all pickups is ', pickup_sum);

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
      id: Pickups.getNextId(),
      time: Server.updateTime()
    };

    Pickups.add(obj);
    Server.broadcast(Structure.pack(obj, 4));
    Match.next_pickup = Server.now + Math.random() * 5000;
  }
};

setInterval(function() {
  Match.update()
}, 66);