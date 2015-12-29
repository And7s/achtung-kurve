var Actor = function(obj) {
  this.x = 0;
  this.y = 0;
  this.rot = 0;
  this.id = obj.id;
  this.size = 2;
  this.time = obj.time;
  this.speed = 2E-4;
  this.rotSpeed = 4E-3;
  this.isInvert = false;
  this.isInvincible = false;
  this.isNoControl = false;
  this.is90Deg = false;

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

  this.drawHead = function() {
    // which color should you be drawn

    // console.log('draw HEAD');
    var color = '#FFF'; // default color
    var size = 3;
    if (this.isInvert)  { color = '#00F'; size++; }
    if (this.isInvincible) { color = '#0F0'; size++; }
    if (this.isNoControl) { color = '#F00'; size++; }

    App.ctx.fillStyle = color;
    if (App.time <= 2000) { // spawning
      size = Ease.spawningSelf(App.time, 3, 9, 2000);
    }
    App.ctx.beginPath();
    if (!this.is90Deg) {
      App.ctx.arc(
        this.x * Field.size + Field.offset_x,
        this.y * Field.size + Field.offset_y,
        size * App.scale,
        0,
        2 * Math.PI
      );
    } else {
      size += 2;
      App.ctx.fillRect(
        this.x * Field.size + Field.offset_x - size * App.scale / 2,
        this.y * Field.size + Field.offset_y - size * App.scale / 2,
        size * App.scale,
        size * App.scale
      );
    }

    App.ctx.fill();
    App.ctx.closePath();
  };
};
