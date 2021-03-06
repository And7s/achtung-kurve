var Menu = {
  init: function() {
    this.canvas = document.getElementById('c-menu');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
  },

  resize: function() {
    var size = Math.min($(window).width() * 0.25, $(window).height());
    this.width = size;
    this.height = $(window).height();
    this.canvas.width = this.width * App.pixelratio;
    this.canvas.height = this.height * App.pixelratio;

    this.canvas.style.height = this.height + 'px';
    this.canvas.style.width = this.width + 'px';

    this.ctx.scale(App.pixelratio, App.pixelratio);
  },

  render: function() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if(App.time != null) {
      var t = Math.round(App.time / 100) / 10;
      t = t.toFixed(1);
      text(t, 0, 80 * App.scale, 50, '#fff', this.ctx);
      text('FPS ' + App.stats.fps.fps, 0, 100 * App.scale, 20, '#fff', this.ctx);
    }

    // draw highscore
    var c = 3;
    for(var it in App.actors) {
      text(NAMES[it % NAMES.length], 0, 50 * c * App.scale, 30, COLORS[it % COLORS.length], this.ctx);
      text(App.actors[it].score, 150 * App.scale, 50 * c * App.scale, 30, COLORS[it % COLORS.length], this.ctx);
      text(this.getStateDescr(App.actors[it].state) +" " + App.actors[it].state, 0, (10 + 50 * c) * App.scale, 10, '#fff', this.ctx);
      c++;
    }

    if(App.state == 0 && App.last_win >= 0) {
      text(NAMES[App.last_win % NAMES.length] + " wins!", 0, 0, 40, '#FFF', this.ctx);
    }
  },

  getStateDescr: function(state) {
    switch(state) {
      case ACTOR_DEAD: return 'dead';
      case ACTOR_PLAYING: return 'playing';
      case ACTOR_SPAWNING: return 'spawning';
      case ACTOR_WATCHING: return 'spectating';
      case ACTOR_WAITING: return 'waiting';
      default: return 'unknown';

    }
  }
};
