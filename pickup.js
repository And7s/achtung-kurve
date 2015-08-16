
var Pickups = {
  arr: [],

  collide: function(x,y) {

  },

  draw: function() {
    for(var i = 0; i < this.arr.length; i++) {
      App.ctx.drawImage(
        App.img,
        this.arr[i].type * 39,
        0,
        39,
        39,
        this.arr[i].x * Field.size - 20 * App.scale / 1.5,
        this.arr[i].y * Field.size - 20 * App.scale / 1.5,
        39 * App.scale / 1.5,
        39 * App.scale / 1.5
      );
    }
  },

  add: function(type, x, y) {

    this.arr.push({
      x: x,
      y: y,
      type: type
    });
  }
};

