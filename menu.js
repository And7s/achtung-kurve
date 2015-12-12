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
      var t = Math.round((App.time - 2000) / 100) / 10;
      t = t.toFixed(1);
      text(t, 0, 80, 50, '#fff', this.ctx);
      if (DEBUG) {
        text("pid: "+Client.p_id, 0, 90, 20, '#FFF', this.ctx);
        text("FPS : "+App.stats.fps.fps, 0, 130, 20, '#FFF', this.ctx);
        text("msg_recv : "+App.stats.show.msg_recv, 0, 150, 20, '#FFF', this.ctx);
        text("msg_apply : "+App.stats.show.msg_apply + ' '+ Math.round(App.stats.show.msg_apply / App.stats.show.msg_recv * 100) + '%',
          0, 170, 20, '#FFF', this.ctx);
        text("avg ping : "+Math.round(App.stats.show.msg_diff / App.stats.show.msg_apply), 0, 190, 20, '#FFF', this.ctx);
        text("max ping : "+Math.round(App.stats.show.msg_max), 0, 210, 20, '#FFF', this.ctx);
        text("packages recv : "+(App.stats.show.packages_recv), 0, 230, 20, '#FFF', this.ctx);

      }

    }

    // draw highscore
    var c = 2;
    for(var it in App.actors) {
      text(NAMES[it % NAMES.length], 0, 150 * c, 30, COLORS[it % COLORS.length], this.ctx);
      text(App.scores[it] ||0, 120, 150 * c, 30, COLORS[it % COLORS.length], this.ctx);
      c++;
    }

    if(App.state == 0 && App.last_win >= 0) {
      text(NAMES[App.last_win % NAMES.length] + " wins!", 0, 0, 40, '#FFF', this.ctx);
    }
  }
};
