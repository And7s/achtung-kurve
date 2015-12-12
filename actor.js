
var Actor = function(id) {
  var x = 0.5,
      y = 0.5,
      speed = 0.001,
      rot = 0,
      size = 2,
      state = ACTOR_WATCHING,// 0: waiting (before game start), 1: playing, 2: dead, 3: not participating
      invert = false,
      time = 0,
      dir = 0,  // which side is pressed
      deg_90 = false, // if 90 deg active
      last_dir = null,  // which directin was pressed the last time
      invisible = false,  // if player is invisible
      no_control = false,
      invincible = DEBUG;


  this.gap = 0,
  this.next_gap = 0;

  this.update = function(dt) {
    this.move(dt);

    var obj;
    if ((obj = Pickups.collide(x, y)) !== false) {  // check collision with pickups
      if (Client.getId() == id) {
        Client.sendPickup(obj);
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
    return state != ACTOR_DEAD;
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
        if(deg_90 && !no_control) {
          this.rotate90(dir)
        }else if (!no_control) {
          this.rotate(dir, delta_ref);
        }
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
    if(state == ACTOR_DEAD) return;  // you are already dead
    state = ACTOR_DEAD;
    Particles.add(x, y);
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
    state = ACTOR_WAITING;
    x = obj.x;
    y = obj.y;
    rot = obj.rot;
    invisible = true;
    invincible = DEBUG;
    no_control = false;
    invert = false;
    deg_90 = false;
    console.log("respawn and set time to "+App.time);
    time = App.time;
  };

  this.live = function() {
    state = ACTOR_PLAYING;
    invisible = false;
    invincible = DEBUG;
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

  // moves and checks for collision
  this.move = function(dt) {

    var dx = Math.cos(rot) * speed * dt,
        dy = Math.sin(rot) * speed * dt;

    // i iterate over the forwards angles

if(!DEBUG) {
    for(var i = -Math.PI; i <= Math.PI; i+= Math.PI / 10) {

      // i set the mask at the inner bounds, the actual size
      var sx =  Math.cos(rot + i) * size + x * App.maskRes ,
          sy =  Math.sin(rot + i) * size + y * App.maskRes ;

       //console.log("set "+sx+" "+sy+" "+ Math.round(sx)+" "+Math.round(sy));
      // dont check the outer angels, causes false in at rotating
      if(i > -Math.PI / 2.1 && i < Math.PI / 2.1) { // check forwards half
        // this calculates where the pixels whould be drawn ont he reference resolution
        // i will check one pixel more than the radius itself
        // add 1.5 more, so it wont get round in the wrong direction twice(negelcted)

         var cx =  Math.cos(rot + i) * (size + 1.5) + (x + dx / dt) * App.maskRes ,
             cy =  Math.sin(rot + i) * (size + 1.5) + (y + dy / dt) * App.maskRes ;
        // console.log("check "+cx+" "+cy);
        cx = Math.round(cx);
        cy = Math.round(cy);


        /*if(DEBUG) {
          App.ctx.fillRect(App.width - App.maskRes + cx, App.height - App.maskRes + cy, 1, 1 );
        }*/


        if(cx >= 0 && cx < App.maskRes && cy >= 0 && cy < App.maskRes) {  // avoid out of bounds
          if(App.mask[cy * App.maskRes + cx] == 1) {
            console.log("collide");
            if(!invincible) {
              this.die();
            }
          }
        }
      }else if( i < -Math.PI / 2 || i > Math.PI / 2) {  // set behind
        // set the mask, where someone has been
        // if there is no gapp currently
        if((this.gap == 0 || this.gap < App.time) && !invisible) {
          App.mask[Math.round(sy) * App.maskRes + Math.round(sx)] = 1;
        }
      }
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

  this.rotate90 = function(dir) {
    if(dir == last_dir) return; // only recognize new events
    last_dir = dir;
    if(invert) dir = -dir;
    rot += Math.PI / 2 * dir;
  };

  this.draw = function() {
    if(invisible || (this.gap > 0 && this.gap > App.time)) {

    }else {
      Field.ctx.fillStyle = COLORS[id % COLORS.length];
      Field.ctx.beginPath();
      Field.ctx.arc(x * Field.size, y * Field.size, size * App.scale, 0, 2 * Math.PI);
      Field.ctx.fill();
    }
  };

  this.set90Deg = function(bool) {
    deg_90 = bool;
    last_dir = dir;
  };

  this.setInvisible = function(bool) {
    invisible = bool;
  };

  this.setNoControl = function(bool) {
    no_control = bool;
  };

  this.setInvincible = function(bool) {
    invincible = bool;
  };

  this.setInvert = function(bool) {
    invert = bool;
  };

  // getters
  this.get90Deg = function() {
    return deg_90;
  };

  this.getInvisible = function() {
    return invisible;
  };

  this.getNoControl = function() {
    return no_control;
  };

  this.getInvincible = function() {
    return invincible;
  };

  this.getInvert = function() {
    return invert;
  };
};
