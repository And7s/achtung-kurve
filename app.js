var App = {};

App.canvas = document.getElementById('c');
App.ctx = App.canvas.getContext('2d');


App.init = function() {
  App.resize();
  Key = new Key();
  window.setInterval(App.render, 32);
};

App.resize = function() {
  App.width = $(window).width();
  App.height = $(window).height();

  App.canvas.width = App.width;
  App.canvas.height = App.height;
};


App.render = function() {
  Actors[0].update(1);
  Actors[0].draw();

  for(var i = 0; i < 256; i++) {
    if(Key.down(i)) {
      console.log("down ", i);
    }
  }

  if(Key.down(39)) {
    App.createEvent(1);
  }else if(Key.down(37)) {
    App.createEvent(-1);
  }else {
    App.createEvent(0);
  }
};

App.createEvent = function(dir) {
  // todo send
  App.dispatchEvent(dir);
}

App.dispatchEvent = function(dir) {
  // todo recv from server
  Actors[0].rotate(dir, 1);
}


var Actor = function() {
  var x = 50,
      y = 50,
      speed = 1,
      rot = 0;

  this.update = function(dt) {
    x += Math.cos(rot) * speed * dt;
    y += Math.sin(rot) * speed * dt;
  };

  this.rotate = function(dir, dt) {
    rot += dir * dt * 0.05;
  };

  this.draw = function() {
    Lib.drawCircle(x, y, 5);
  };

};

var Actors = [
  new Actor()
];



var Lib = {};

Lib.drawCircle = function(x, y, r) {
  App.ctx.beginPath();
  App.ctx.arc(x, y, r, 0, 2*Math.PI);
  App.ctx.fill();
}


$(App.init);




var Key = function() {
  var down = new Array(256);
  var hit = new Array(256);

  this.initialize = function() {
    var that = this;
    $(document).keydown(function(e) { that.keydown(e);});
    $(document).keyup(function(e) { that.keyup(e);});
  };

  this.reset = function(code) {
    hit[code] = false;
    down[code] = false;
  };

  this.simulate = function(code) {
    this.keydown({charCode: code});
  };

  this.keydown = function(e) {

    var code = e.charCode || e.keyCode;
    code = Math.min(code, 256);
    if(!down[code]) {
      hit[code] = true;
    }else {
      hit[code] = false;
    }
    down[code] = true;
  };

  this.keyup = function(e) {
    var code = e.charCode || e.keyCode;
    code = Math.min(code, 256);
    hit[code] = false;
    down[code] = false;
  };

  this.hit = function(code) {
    var ret = hit[code];
    hit[code] = false;
    return ret;
  };

  this.down = function(code) {
    return down[code];
  };


  this.initialize();
};