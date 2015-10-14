
var Pickups = {
  arr: [],
  size: 0.5,  // at which factor the pickups are scaled
  real_size: 50, // the size of the images in px

  collide: function(x, y) {
    var sizeSq = Math.pow(39 / App.maskRes * this.size, 2);
    for(var i = 0; i < this.arr.length; i++) {
      var obj = this.arr[i];
      if(obj.state == 2) continue;  // already collected

      var distSq = (obj.x - x) * (obj.x - x) + (obj.y - y) * (obj.y - y);
      if(distSq < sizeSq) { // if i am close enough
        obj.state = 2;    // change the state to remove (animatino)
        obj.time = 0;     
        return obj; // return which one is collided
      }
    }
    return false; // no collision
  },

  draw: function(dt) {
    for(var i = 0; i < this.arr.length; i++) {
      var obj = this.arr[i];
      var scale = this.real_size * App.scale * this.size; // = 1
      if(obj.state == 0) {  // spawning
        obj.time += dt;
        if(obj.time >= 1000) {
          obj.state = 1;
        }else {
          scale *= Ease.easeOutBack(obj.time, 0, 1, 1000);
        }
      }else if( obj.state == 1) { // alive

      }else if( obj.state == 2) { // fade out
        obj.time += dt;
        if(obj.time >= 200) {
          this.arr[i] = this.arr[this.arr.length - 1];  // remove from array and continue
          this.arr.pop();
          i--;
          continue;
        }else {
          scale *= (1 + obj.time / 200)
          App.ctx.globalAlpha = 1 - obj.time / 200;
        }
      }

      // color depends on whom this pickup applies to
      App.ctx.fillStyle = ['#00FF00', '#FF0000', '#0000FF'][obj.apply]; // me, you , all

      App.ctx.beginPath();
      App.ctx.arc(
        this.arr[i].x * Field.size + Field.offset_x,
        this.arr[i].y * Field.size + Field.offset_y,
        scale/1.8, 0, 2 * Math.PI
      );
      App.ctx.fill();

      App.ctx.drawImage(
        App.img_pickup,
        this.real_size * obj.type,
        0,
        this.real_size,
        this.real_size,
        this.arr[i].x * Field.size - 0.5 * scale + Field.offset_x,
        this.arr[i].y * Field.size - 0.5 * scale + Field.offset_y,
        scale,
        scale
      );

      if(obj.state == 2) {
         App.ctx.globalAlpha = 1;
      }
    }
  },

  add: function(type, apply, x, y) {

    this.arr.push({
      x: x,
      y: y,
      type: type,
      apply: apply,
      state: 0,  // state: 0 spawgning state, 1: normal, 2: picked up
      time: 0
    });
  },

  effect: function(id, type, apply) {
    console.log("pickup "+ type + "picked up by"+id+" apply to "+apply);
    for(var it in App.actors) {
      if(apply == 2 ||                 // everyone
        (apply == 1 && it != id) ||    // all but the player
        (apply == 0 && id == it)) {    // only the player
        console.log("apply to "+it);
        switch(type) {
          case 0: // delete lines
            // currently only delete all lines supported
            App.clearField();
            break;
          case 1: // 90 deg
            App.actors[it].set90Deg(true);
            break;
          case 2: // invisible
            App.actors[it].setInvisible(true);
            break;
          case 3: // no control
            App.actors[it].setNoControl(true);
            break;
          case 4: // open walls
             Field.trans = true;
            break;
          case 5: // invincible
            App.actors[it].setInvincible(true);
            break;
        }
      }
    }

  },

  disEffect: function(id, type, apply) {
    console.log("DisEffect pickup "+ type + "picked up by"+id+" apply to "+apply);
    for(var it in App.actors) {
      if(apply == 2 ||                 // everyone
        (apply == 1 && it != id) ||    // all but the player
        (apply == 0 && id == it)) {    // only the player
        console.log("apply to "+it);
        switch(type) {
          case 0: // delete lines
            
            break;
          case 1: // 90 deg
            App.actors[it].set90Deg(false);
            break;
          case 2: // invisible
            App.actors[it].setInvisible(false);
            break;
          case 3: // no control
            App.actors[it].setNoControl(false);
            break;
          case 4: // open walls
             
            break;
          case 5: // invincible
            App.actors[it].setInvincible(false);
            break;
        }
      }
    }
  }
};


// syntax t=currenttime, b=startval, c=endval, d = totaltime
var Ease = {
  easeOutBack: function (t, b, c, d, s) {
    if (s == undefined) s = 1.70158;
    return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
  },

  spawningSelf: function(t, b, c, d) {
    t = t / d;  // normalize
    return Math.pow(Math.sin(t * Math.PI), 2) * (Math.cos(t * 8 * Math.PI) + 1) * (c - b) + b;
  }
}