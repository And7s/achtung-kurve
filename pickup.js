
var Pickups = {
  arr: [],
  size: 1 / 1.5,

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

  draw: function() {
    for(var i = 0; i < this.arr.length; i++) {
      App.ctx.drawImage(
        App.img,
        this.arr[i].type * 39,
        0,
        39,
        39,
        this.arr[i].x * Field.size - 20 * App.scale * this.size,
        this.arr[i].y * Field.size - 20 * App.scale * this.size,
        39 * App.scale * this.size,
        39 * App.scale * this.size
      );
    }
  },

  add: function(type, x, y) {

    this.arr.push({
      x: x,
      y: y,
      type: type
    });
  },

  effect: function(id, type) {
    console.log("pickup "+ type + "picked up by"+id);
    switch(type) {
      case 0:  // slow down self
        App.actors[id].calcSpeed(0.5);
        setTimeout(function() { App.actors[id].calcSpeed(2); }, 2000);
        break;
        case 1: // slow down others
          for(var it in App.actors) {
            if(it == id) continue;

            App.actors[it].calcSpeed(0.5);
            setTimeout(function() { pp.actors[it].calcSpeed(2); }, 2000);
          }
        break;
        case 2:  // speed up self
          App.actors[id].calcSpeed(2);
          setTimeout(function() { App.actors[id].calcSpeed(0.5); }, 2000);
        break;
        case 3:  // speed up others
          for(var it in App.actors) {
            if(it == id) continue;

            App.actors[it].calcSpeed(2);
            setTimeout(function() { App.actors[it].calcSpeed(0.5); }, 2000);
          }
        break;
        case 4: // others bolder
          for(var it in App.actors) {
            if(it == id) continue;

            App.actors[it].calcSize(2);
            setTimeout(function() { App.actors[it].calcSize(0.5); }, 2000);
          }
        break;


    }
  }
};

