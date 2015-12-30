
function User(ws, id) {
  // create shallow copy of shared actor
  __.extend(this, ActorShared);

  this.id = id;
  this.time = getTime();
  this.last_message = getTime();
  this.next_gap = getTime();
  this.last_dir = 0;

  var that = this;
  console.log('new user conencted');

  for (var i = 0; i < Hist.length; i++) {
    console.log('send hist'+i);
    ws.send(Hist[i]);
  }

  var welcome = Structure.pack({
    id: this.id,
    state: this.state,
    p_id: Server.p_id++,
    time: Server.updateTime()
  }, 0);
  Server.broadcast(welcome);
  ws.send(welcome);  // because the obj is not yet part of all user

  ws.on('message', function(message, flags) {
    var obj = Structure.parse(message);
    // console.log('recv', obj);
    that.update(obj.dir);
    that.broadcast();
  });

  ws.on('close', function() {
    console.log('connection closed to '+  that.id);
    delete App.actors[that.id];
    Match.reconsider();
  });

  this.update = function(dir) {
    var now = getTime();
    if (!this.isGap && now >= this.next_gap) {
      // switch to gap
      this.isGap = true;
      this.next_gap = now + 300 + 700 * Math.random();  // how long th gap will last
    } else if (this.isGap && now >= this.next_gap) {
      this.isGap = false;
      this.next_gap = now + 500 + 1500  * Math.random(); // when the next gap will come
    }

    var dt = now - this.time;
    if (dt <= 0) return; // avoid divide by zero
    this.time = now;

    if (App.state == GAME_SPAWNING || App.state == GAME_PLAYING) {
      if (this.state == ACTOR_PLAYING) {
        this.dispatchInput(dir, dt);
      } else if (this.state == ACTOR_SPAWNING) {
        this.dispatchInput(0, dt / 4);
      } else {
        // do nothing
      }
    }
  };

  // let the user control
  this.dispatchInput = function(dir, dt) {
    var check_col = true;
    if (this.is90Deg) {
      if (this.last_dir != dir && dir != 0) {
        check_col = false;  // cannot properly check for collision->disable
        this.rot += Math.PI * dir / 2;
      }
      this.last_dir = dir;
      dir = 0;  // dont allow any other curves
    } else {
      this.last_dir = dir;  // save for pre recognition, otherwise double changes could be applied
    }
    if (this.isNoControl) {
      dir = 0;
    }
    if (this.isInvert) {
      dir = -dir;
    }
    var col_checks = 0;
    var num = Math.ceil(dt / 10),   // apply change in time slots of 10ms
        dx, dy;
    for (var n = 0; n < num; n++) {
      this.rot += dir * dt * this.rotSpeed / num;
      dx = Math.cos(this.rot) * dt * this.speed / num;
      dy = Math.sin(this.rot) * dt * this.speed / num;

      var collide = false;
      // collision check
      for (var i = -Math.PI; i <= Math.PI; i+= Math.PI / 10) {

        // i set the mask at the inner bounds, the actual size
        var sx =  Math.cos(this.rot + i) * this.size + this.x * App.maskRes ,
            sy =  Math.sin(this.rot + i) * this.size + this.y * App.maskRes ;

        //console.log("set "+sx+" "+sy+" "+ Math.round(sx)+" "+Math.round(sy));
        // dont check the outer angels, causes false in at rotating
        if (i > -Math.PI / 2.1 && i < Math.PI / 2.1) { // check forwards half
          // this calculates where the pixels whould be drawn ont he reference resolution
          // i will check one pixel more than the radius itself
          // add 1.5 more, so it wont get round in the wrong direction twice(negelcted)

           var cx =  Math.cos(this.rot + i) * (this.size + 1.5) + (this.x + dx / dt) * App.maskRes,
               cy =  Math.sin(this.rot + i) * (this.size + 1.5) + (this.y + dy / dt) * App.maskRes;
          // console.log("check "+cx+" "+cy);
          cx = Math.round(cx);
          cy = Math.round(cy);

          if (cx >= 0 && cx < App.maskRes && cy >= 0 && cy < App.maskRes) {  // avoid out of bounds
            if (App.mask[cy * App.maskRes + cx] == 1) {
              console.log("collide");
              collide = true;
            }
          }
          col_checks++;
        } else if ( i < -Math.PI / 2 || i > Math.PI / 2) {  // set behind
          // set the mask, where someone has been
          if (!this.isGap && !this.isInvisible) {
            App.mask[Math.round(sy) * App.maskRes + Math.round(sx)] = 1;
          }
        }
      }

      // if a collision is spotted, that will get handled, abort moving
      if (this.isInvincible || !collide || !check_col) {
        this.x += dx;
        this.y += dy;
        // collision with border
        if (this.x >= 1 || this.x <= 0) {
          if (Field.trans) {
            this.x = (this.x + 1) % 1;
          } else {
            this.x -= dx; // revert move
            this.die();
            console.log('die at '+this.x);
            return;
          }
        }
        if (this.y >= 1 || this.y <= 0) {
          if (Field.trans) {
            this.y = (this.y + 1) % 1;
          } else {
            this.y -= dy; // revert move
            console.log('die at '+this.y);
            this.die();
            return;
          }
        }
      } else {
        break;
      }
    }
    if (!this.isInvincible && collide && check_col) {
      this.die();
    }
    // collide with pickups
    var obj = Pickups.collide(this.x, this.y);
    if (obj != false) {
      obj.state = 2;  // avoid coliding multiple times
      console.log('pickup ', obj);
      // apply effect, remove pickup
      obj.u_id = that.id;
      Server.broadcast(Structure.pack(obj, 5));
      Pickups.effect(obj);

      // disefect
      setTimeout(function(obj) {
        console.log('disefect');
        Pickups.disEffect(obj);
        Server.broadcast(Structure.pack(obj, 7));
      }, PICKUP[obj.num].dur, obj);
    }
  };

  this.broadcast = function() {
    Server.broadcast(Structure.pack({
      x: that.x,
      y: that.y,
      rot: that.rot,
      id: that.id,
      state: that.state,
      p_id: Server.p_id++,
      time: Server.updateTime(),
      isGap: that.isGap
    }, 1));
  };

  this.send = function(ob) {
    // this proxies the output of messages,
    // avoid sending data at higher rates than x-messages/s
    var diffms = 5,
        now = getTime();
    delay = Math.max(this.last_message - now + diffms, 0);
    this.last_message = now + delay;
    setTimeout(function() {
      if(ws.readyState == 1) {
        ws.send(ob);
      }
    }, delay);
  };

  this.die = function() {
    console.log('dying ' + this.state);
    if (this.state == ACTOR_DEAD) return;
    this.state = ACTOR_DEAD;
    // communicate im dead : needed ??
    Match.die(that.id);
    Match.reconsider();
  }
};