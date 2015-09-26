var Particles = {
  arr: [],

  render: function(dt) {
    for(var i = 0; i < this.arr.length; i++) {
      var part = this.arr[i];
      part.ttl -= dt;
      if(part.ttl <= 0) {
        this.arr[i] = this.arr[this.arr.length - 1];
        this.arr.pop();
        i--;
        console.log("die");
        continue;
      }
      part.x += part.vx * dt / 1000;
      part.y += part.vy * dt / 1000;

      App.ctx.fillStyle="#FFFFFF";
      App.ctx.beginPath();
      App.ctx.arc(
        part.x * Field.size + Field.offset_x,
        part.y * Field.size + Field.offset_y,
        2,
        0,
        2 * Math.PI
      );
      App.ctx.fill();
      App.ctx.closePath();
    }
  },

  add: function(x, y) {
    console.log("add some particles");
    for(var i = 0; i < 30; i++) {
      var angle = Math.random() * 2 * Math.PI
      this.arr.push({
        x: x,
        y: y,
        vx: Math.sin(angle) * (0.3 + Math.random()) / 20,
        vy: Math.cos(angle) * (0.3 + Math.random()) / 20,
        ttl: Math.random() * 500 + 100
      });
    }
  }
};