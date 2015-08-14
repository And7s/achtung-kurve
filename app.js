var App = {};
var Field = {};

App.canvas = document.getElementById('c');
App.ctx = App.canvas.getContext('2d');


App.init = function() {
  App.resize();
  Key = new Key();
  Client.initialize();
  window.setInterval(App.render, 32);

};

App.resize = function() {
  var w = $(window).width(),
      h = $(window).height();

  App.width = w;
  App.height = h;

  Field.size = Math.min(w, h) - 10;

  App.canvas.width = w;
  App.canvas.height = h;
  App.scale = Field.size / 960;  // everything gets scaled according to this

  Field.canvas = document.createElement('canvas');
  Field.ctx = Field.canvas.getContext('2d');

  Field.ctx.width = Field.size;
  Field.ctx.height = Field.size;
};


App.render = function() {
  Actors[0].update(1);
  Actors[0].draw();

  for(var i = 0; i < 256; i++) {
    if(Key.down(i)) {
      //console.log("down ", i);
    }
  }

  if(Key.down(39)) {
    App.createEvent(1);
  }else if(Key.down(37)) {
    App.createEvent(-1);
  }else {
    App.createEvent(0);
  }

  App.ctx.drawImage(Field.canvas, 10, 10);
};

App.createEvent = function(dir) {
  Client.sendDir(dir)
}

App.dispatchEvent = function(obj) {
  // todo recv from server
  Actors[obj.id].rotate(obj.dir, 1);
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
    Field.ctx.fillStyle="#FF0000";
    Field.ctx.beginPath();
    Field.ctx.arc(x, y, 5 * App.scale, 0, 2*Math.PI);
    Field.ctx.fill();
  };

};

var Actors = [
  new Actor()
];


$(App.init);