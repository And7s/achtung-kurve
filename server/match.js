var App = {
  maskRes: 500
};

App.mask = new Uint8Array(App.maskRes * App.maskRes);

// on match start

var Match = {

  restart: function() {
    console.log('restart');
    // inform the user

    Server.restart();

    // clear field (mask)
    var L = App.maskRes * App.maskRes;
    for(var i = 0; i < L; i++) {
      App.mask[i] = 0;
    }

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
      var user = Server.all_user[it];

      user.x = x + 0.5;
      user.y = y + 0.5;
      user.rot = angle;
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
  }

};