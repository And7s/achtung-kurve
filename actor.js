var Actor = function(obj) {
  this.x = 0;
  this.y = 0;
  this.rot = 0;
  this.id = obj.id;
  this.size = 2;
  this.time = obj.time;
  this.speed = 2E-4;
  this.rotSpeed = 4E-3;
  this.dispatchEvent = function(obj) {
    // render the diff
    var diff = obj.time - this.time;
    this.time = obj.time;
    var rot_diff = obj.rot - this.rot;

    Field.ctx.fillStyle = COLORS[this.id % COLORS.length];

    var num = Math.ceil(diff / 10);

    for (var i = 0; i < num; i++) {
      Field.ctx.beginPath();
      this.rot += rot_diff / num;
      this.x += Math.cos(this.rot) * diff * this.speed / num;
      this.y += Math.sin(this.rot) * diff * this.speed / num;

      this.x = (this.x + 1) % 1;
      this.y = (this.y + 1) % 1;

      Field.ctx.arc(
        this.x * Field.size,
        this.y * Field.size,
        this.size * App.scale,
        0,
        2 * Math.PI
      );
      Field.ctx.fill();
    }

    this.rot = obj.rot;

    this.x = obj.x;
    this.y = obj.y;

  };
};
