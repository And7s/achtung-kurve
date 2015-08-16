



var Actor = function(id) {
  var x = 0.5,
      y = 0.5,
      speed = 0.001,
      rot = 0,
      size = 2,
      state = 2,  // 0: waiting (before game start), 1: playing, 2: dead
      invert = false;

  this.gap = 0,
  this.next_gap = 0;

  this.update = function(dt) {
    if(state == 2) return; // you are dead
    this.move(dt /2);
    this.draw();
    this.move(dt /2);
    this.draw();


    var type;
    if((type = Pickups.collide(x, y)) !== false) {
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


  this.die = function() {
    state = 2;
  };

  this.respawn = function(obj) {
    console.log(obj);
    state = 0;
    x = obj.x;
    y = obj.y;
    rot = obj.rot;
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
        if(cx >= 0 && cx < App.maskRes && cy >= 0 && cy < App.maskRes) {  // avoid out of bounds
          if(App.mask[Math.round(cy) * App.maskRes + Math.round(cx)] == 1) {
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
    rot += dir * dt * 0.05;
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
