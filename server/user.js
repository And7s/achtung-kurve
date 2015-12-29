
function User(ws, id) {
  // create shallow copy of shared actor
  __.extend(this, ActorShared);

  this.id = id;
  this.time = getTime();
  this.last_message = getTime();

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
    delete Server.all_user[that.id];
  });

  this.update = function(dir) {
    console.log('update');
    var now = getTime();
    var dt = now - this.time;
    if (dt <= 0) return; // avoid divide by zero
    this.time = now;


    if (this.state == ACTOR_PLAYING) {
      this.dispatchInput(dir, dt);
    } else if (this.state == ACTOR_SPAWNING) {
      this.dispatchInput(0, dt / 4);
    } else {
      // do nothing
    }
  };

  // let the user control
  this.dispatchInput = function(dir, dt) {
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
        } else if( i < -Math.PI / 2 || i > Math.PI / 2) {  // set behind
          // set the mask, where someone has been
          App.mask[Math.round(sy) * App.maskRes + Math.round(sx)] = 1;
        }
      }

      if (!collide) {
        this.x += dx;
        this.y += dy;
        this.x = (this.x + 1) % 1;
        this.y = (this.y + 1) % 1

      } else {
        break;
      }
    }
    if (collide) {
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
      time: Server.updateTime()
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
    if (this.state == ACTOR_DEAD) return;
    this.state = ACTOR_DEAD;
    // communicate im dead : needed ??

    Match.reconsider();
  }
};