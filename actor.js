var ActorShared = {
  x: 0.5,
  y: 0.5,
  rot: 0,
  id: 0,
  size: 2,
  time: 0,
  speed: 2E-4,
  rotSpeed: 4E-3,
  isInvert: false,
  isInvincible: false,
  isNoControl: false,
  is90Deg: false,
  isInvisible: false,
  state: ACTOR_WATCHING,
  isGap: false,
  score: 0,

  set90Deg: function(bool) {
    /*deg_90 = bool;
    last_dir = dir;*/
    this.is90Deg = bool;
  },

  setInvisible: function(bool) {
    this.isInvisible = bool;
  },

  setNoControl: function(bool) {
    this.isNoControl = bool;
  },

  setInvincible: function(bool) {
    this.isInvincible = bool;
  },

  setInvert: function(bool) {
    this.isInvert = bool;
  },

  calcSpeed: function(factor) {
    this.speed *= factor;
    console.log("speed now ", this.speed);
  },

  calcSize: function(factor) {
    this.size *= factor;
    console.log("size now ", this.size);
  }
};

var Actor = function(obj) {
  // create shallow copy of shared actor
  __.extend(this, ActorShared);

  this.time = obj.time,
  this.id = obj.id;

  this.dispatchEvent = function(obj) {
    this.isGap = obj.isGap;
    this.score = obj.score;

    var dx = obj.x - this.x,
        dy = obj.y - this.y;

    // overflows (over bounds) take shorter dsitances
    (dx > 0.5) && (dx--);
    (dx < -0.5) && (dx++);
    (dy > 0.5) && (dy--);
    (dy < -0.5) && (dy++);

    if (this.state == ACTOR_PLAYING && obj.state == ACTOR_DEAD) {
      // add explosion
      Particles.add(this.x, this.y);
    }
    this.state = obj.state;
    // render the diff
    var diff = obj.time - this.time;
    this.time = obj.time;
    var rot_diff = obj.rot - this.rot;

    Field.ctx.fillStyle = COLORS[this.id % COLORS.length];

    var num = Math.ceil(diff / 10);

    for (var i = 0; i < num; i++) {
      this.x += dx / num;
      this.y += dy / num;

      this.x = (this.x + 1) % 1;
      this.y = (this.y + 1) % 1;
      if (!this.isGap && !this.isInvisible) {
        Field.ctx.beginPath();
        Field.ctx.arc(
          this.x * Field.size,
          this.y * Field.size,
          this.size * App.scale,
          0,
          2 * Math.PI
        );
        Field.ctx.fill();
      }
    }

    this.rot = obj.rot;
    this.x = obj.x;
    this.y = obj.y;
  };

  this.drawHead = function() {
    // which color should you be drawn
    if (this.state == ACTOR_DEAD || this.state == ACTOR_WATCHING) {
      // dont draw heads of dead player
      return;
    }
    // console.log('draw HEAD');
    var color = '#FFF'; // default color
    var size = 3;
    if (this.isInvert)  { color = '#00F'; size++; }
    if (this.isInvincible) { color = '#0F0'; size++; }
    if (this.isNoControl) { color = '#F00'; size++; }

    App.ctx.fillStyle = color;
    if (App.time <= 2000) { // spawning
      size = Ease.spawningSelf(App.time, 3, 9, 2000);

      if (obj.id == Client.getId()) {
        // draw a ripple around the spawing palyer
        sizerip = Ease.spawningSelf(App.time, 0, 20, 2000);

        App.ctx.lineWidth = 1 * App.scale;
        App.ctx.strokeStyle = '#fff';

        for (var factor = 1; factor <= 2; factor++) {
          App.ctx.beginPath();
          App.ctx.arc(
            this.x * Field.size + Field.offset_x,
            this.y * Field.size + Field.offset_y,
            sizerip / factor * App.scale,
            0,
            2 * Math.PI
          );
          App.ctx.stroke();
        }
      }
      text(NAMES[this.id % NAMES.length], (this.x + 0.01) * Field.size + Field.offset_x, this.y * Field.size + Field.offset_y, 10, '#fff', this.ctx);

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
      size += 4;
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

  this.addScore = function(amount) {
    console.log('scored' + amount);
    this.score += amount;
  }
};
