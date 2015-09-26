
var Pickups = {
  arr: [],
  size: 0.5,  // at which factor the pickups are scaled
  real_size: 50, // the size of the images in px

  collide: function(x, y) {
    var sizeSq = Math.pow(39 / App.maskRes * this.size, 2);
    for(var i = 0; i < this.arr.length; i++) {
      var obj = this.arr[i];

      var distSq = (obj.x - x) * (obj.x - x) + (obj.y - y) * (obj.y - y);
      if(distSq < sizeSq) {
        var type = obj.type
        this.arr[i] = this.arr[this.arr.length - 1];  // remove object
        this.arr.pop();
        return type;
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

      }

      App.ctx.fillStyle = '#00FF00';
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
    }
  },

  add: function(type, x, y) {

    this.arr.push({
      x: x,
      y: y,
      type: type,
      state: 0,  // state: 0 spawgning state, 1: normal, 2: picked up
      time: 0
    });
  },

  effect: function(id, type) {
    console.log("pickup "+ type + "picked up by"+id);
    switch(type) {
      case 0:  // slow down self
        App.actors[id].calcSpeed(0.5);
        break;
      case 1: // slow down others
        for(var it in App.actors) {
          if(it == id) continue;
          App.actors[it].calcSpeed(0.5);
        }
        break;
      case 2:  // speed up self
        App.actors[id].calcSpeed(2);
        break;
      case 3:  // speed up others
        for(var it in App.actors) {
          if(it == id) continue;
          App.actors[it].calcSpeed(2);
        }
        break;
      case 4: // others bolder
        for(var it in App.actors) {
          if(it == id) continue;
          App.actors[it].calcSize(2);
        }
        break;
      case 5: // invert others
        for(var it in App.actors) {
          if(it == id) continue;
          App.actors[it].invert(true);
        }
        break;
      case 6: // borders translucent
        Field.trans = true;
        break;
      case 7: // smaller self
        App.actors[id].calcSize(0.5);
        break;
      case 8: // borders static
        Field.trans = false;
        break;
    }
  },

  disEffect: function(id, type) {
    console.log("DisEffect pickup "+ type + "picked up by"+id);
    switch(type) {
      case 0:  // slow down self
        App.actors[id].calcSpeed(2);
        break;
      case 1: // slow down others
        for(var it in App.actors) {
          if(it == id) continue;
          App.actors[it].calcSpeed(2);
        }
        break;
      case 2:  // speed up self
        App.actors[id].calcSpeed(0.5);
        break;
      case 3:  // speed up others
        for(var it in App.actors) {
          if(it == id) continue;
          App.actors[it].calcSpeed(0.5);
        }
        break;
      case 4: // others bolder
        for(var it in App.actors) {
          if(it == id) continue;
          App.actors[it].calcSize(0.5);
        }
        break;
      case 5: // invert others
        for(var it in App.actors) {
          if(it == id) continue;
          App.actors[it].invert(false);
        }
        break;
      case 6: // borders translucent
        break;
      case 7: // smaller self
        App.actors[id].calcSize(2);
        break;
      case 8: // borders static
        break;
    }
  }
};


// syntax t=currenttime, b=startval, c=endval, d = totaltime
var Ease = {
  easeOutBack: function (t, b, c, d, s) {
    if (s == undefined) s = 1.70158;
    return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
  },
}