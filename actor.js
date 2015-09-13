
var Actor = function(id) {
  var x = 0.5,
      y = 0.5,
      speed = 0.001,
      rot = 0,
      size = 2,
      state = 2,  // 0: waiting (before game start), 1: playing, 2: dead
      invert = false,
      time = 0,
      dir = 0;  // which side is pressed

  this.gap = 0,
  this.next_gap = 0;

  this.update = function(dt) {
    this.move(dt);

    var type;
    if((type = Pickups.collide(x, y)) !== false) {  // check collision with pickups
      if(Client.getId() == id) {
        Client.sendPickup(type);
      }
    }
  };

  this.getX = function() {
    return x;
  };

  this.getY = function() {
    return y;
  };

  this.isAlive = function() {
    return state != 2;
  };

  this.dispatchEvent = function(obj) {

    var delta = obj.time - time;
    time = obj.time;

    if(delta <= 0) {
      return;
    }
    //console.log(id + " delta "+delta+" time "+obj.time+ " "+obj.p_id);

    // apply what happened in the past in 10ms intervals
    var num = Math.ceil(delta / 10);
    for(var i = 0; i < num; i++) {
      var delta_ref = delta / num / 32;   // reference time relative to 32ms
      // console.log("delta ref is ", delta_ref);
      if(this.isAlive()) {
        this.rotate(dir, delta_ref);
        this.update(delta_ref);
        this.draw();
      }
    }
    if(obj.id == id) {  // this is an update for explicit this actor
      dir = obj.dir;  // apply
      this.gap = obj.gap; // rotate depending on old change
      this.next_gap = obj.next_gap;
    }
  };

  this.die = function() {
    if(state == 2) return;  // you are already dead
    state = 2;
    // how many are remaining, am i the last person?
    var rem = 0, last_id = 0;
    for(var it in App.actors) {
      if(App.actors[it].isAlive()) {
       rem++;
       last_id = it;
      }
    }
    console.log("i want a score point");
    // i am the last one, i claim to get a score point
    if(Object.keys(App.actors).length > 1 && rem == 1 && last_id == Client.getId())  // you dont get points for solo play
      Client.sendEnd(last_id);
    if(rem == 0) {  // played solo, no point, but start a new game
      Client.sendEnd(-1);
    }
  };

  this.respawn = function(obj) {
    console.log(obj);
    state = 0;
    x = obj.x;
    y = obj.y;
    rot = obj.rot;
    console.log("respawn and set time to "+App.time);
    time = App.time;
  };

  this.live = function() {
    state = 1;
    speed = 0.005;
  };

  this.calcSpeed = function(factor) {
    speed *= factor;
    console.log("speed now ", speed);
  };

  this.calcSize = function(factor) {
    size *= factor;
    console.log("size now ", size);
  };

  this.invert = function(bool) {
    invert = bool;
  };

  // moves and checks for collision
  this.move = function(dt) {

    var dx = Math.cos(rot) * speed * dt,
        dy = Math.sin(rot) * speed * dt;

    // i iterate over the forwards angles
    for(var i = -Math.PI / 2; i <= Math.PI /2; i+= Math.PI / 10) {

      // i set the mask at the inner bounds, the actual size
      var sx =  Math.cos(rot + i) * size + x * App.maskRes ,
          sy =  Math.sin(rot + i) * size + y * App.maskRes ;

       //console.log("set "+sx+" "+sy+" "+ Math.round(sx)+" "+Math.round(sy));
      // dont check the outer angels, causes false in at rotating
      if(i > -Math.PI / 2.1 && i < Math.PI / 2.1) {
        // this calculates where the pixels whould be drawn ont he reference resolution
        // i will check one pixel more than the radius itself
        // add 1.5 more, so it wont get round in the wrong direction twice(negelcted)
         var cx =  Math.cos(rot + i) * (size + 1.5) + (x + dx) * App.maskRes ,
             cy =  Math.sin(rot + i) * (size + 1.5) + (y + dy) * App.maskRes ;
        // console.log("check "+cx+" "+cy);
        cx = Math.round(cx);
        cy = Math.round(cy);

        if(cx >= 0 && cx < App.maskRes && cy >= 0 && cy < App.maskRes) {  // avoid out of bounds
          if(App.mask[cy * App.maskRes + cx] == 1) {
            console.log("collide");
            this.die();
          }
        }
      }
      // set the mask, where someone has been
      // if there is no gapp currently
      if(this.gap == 0 || this.gap < App.time) {
        App.mask[Math.round(sy) * App.maskRes + Math.round(sx)] = 1;
      }
    }

    x += dx;
    y += dy;

    // collision check at borders
    if(x < 0 || x > 1 || y < 0 || y > 1) {
      // port to other side
      if(Field.trans) { // translucent broders
        x = (x + 1) % 1;  // get in range 0-1
        y = (y + 1) % 1;
      }else {
        console.log("border dead");
        this.die();
      }
    }
  }

  this.rotate = function(dir, dt) {
    if(invert) dir = -dir;
    rot += dir * dt * 0.09;
  };

  this.draw = function() {
    if(this.gap > 0 && this.gap > App.time) {

    }else {
      Field.ctx.fillStyle = COLORS[id % COLORS.length];
      Field.ctx.beginPath();
      Field.ctx.arc(x * Field.size, y * Field.size, size * App.scale, 0, 2 * Math.PI);
      Field.ctx.fill();
    }
  };

};
