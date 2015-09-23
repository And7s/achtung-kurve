var App = {};
var Field = {};

var DEBUG = false;

App.canvas = document.getElementById('c');
App.ctx = App.canvas.getContext('2d');
App.actors = {};
App.scores = {};

App.init = function(images) {
  console.log(images);
  App.maskRes = 500;
  App.state = 0;  // 0: before game, 1: awaking, 2: playing
  App.last_win = -1;
  App.resize();
  Key = new Key();
  Touch = new Touch();
  Client.initialize();
  App.img = images[0];

  App.mask = new Uint8Array(App.maskRes * App.maskRes);
  window.requestAnimationFrame(App.render);

};

App.resize = function() {
  var w = $(window).width(),
      h = $(window).height();

  App.width = w;
  App.height = h;

  Field.size = Math.min(w, h) - 10;

  App.canvas.width = w;
  App.canvas.height = h;
  App.scale = Field.size / App.maskRes;  // everything gets scaled according to this

  Field.canvas = document.createElement('canvas');
  Field.canvas.width = Field.size;  // needs to be set bot for canvas as well as ctx
  Field.canvas.height = Field.size;
  Field.ctx = Field.canvas.getContext('2d');

  Field.offset_x = 5,
  Field.offset_y = (h - Field.size) / 2;
};


App.render = function() {


  for(var i = 0; i < 256; i++) {
    if(Key.down(i)) {
      //console.log("down ", i);
    }
  }



  // clear
  App.ctx.clearRect(0, 0, App.width, App.height);

  // time
  if(App.time != null) {
    var t = Math.round((App.time - 2000) / 100) / 10;
    t = t.toFixed(1);
    text(t, 50, 80, 50, '#fff');
    text("pid: "+Client.p_id, 250, 80, 20, '#fff');
  }
  Client.update();
  Pickups.draw();

  App.ctx.drawImage(Field.canvas, Field.offset_x, Field.offset_y);

  // draw the border
  App.ctx.beginPath();
  App.ctx.lineWidth = 5;
  if(Field.trans) {
    App.ctx.strokeStyle = "#0F0";
  }else {
    App.ctx.strokeStyle = "#F00";
  }


  App.ctx.rect(Field.offset_x - 2.5, Field.offset_y -2.5, Field.size+5 , Field.size+5 );
  App.ctx.stroke();
  App.ctx.closePath();


  // draw head
  var size = 3;
  if(App.state == 1) {
    size += Math.sin(App.time / 100) * 2 + 1;
  }

  for(var it in App.actors) {
    if(it == Client.getId())
    App.ctx.fillStyle="#FFFFFF";
    App.ctx.beginPath();
    App.ctx.arc(
      App.actors[it].getX() * Field.size + Field.offset_x,
      App.actors[it].getY() * Field.size + Field.offset_y,
      size * App.scale * (it == Client.getId() && App.state == 1 ? 3:1),
      0,
      2 * Math.PI
    );
    App.ctx.fill();
    App.ctx.closePath();
  }

  App.drawHighScore();

  // draw mask
  if(DEBUG) {
    App.ctx.fillStyle="#0F0";
    for(var i = 0; i < App.maskRes; i++) {
      for(var j = 0; j < App.maskRes; j++) {
        if(App.mask[j* App.maskRes + i]) {
          App.ctx.fillRect(App.width - App.maskRes + i, App.height - App.maskRes + j, 1, 1 );
        }
      }
    }
  }

  //window.requestAnimationFrame(App.render);
  setTimeout(App.render, 16)
};

App.dispatchEvent = function(obj) {
  //App.time = obj.time;
  for(var it in App.actors) {
    App.actors[it].dispatchEvent(obj);
  }
};

App.restartMatch = function() {
  Field.ctx.clearRect(0, 0, Field.size, Field.size);  // clear context
  Field.trans = false;

  App.actors = {};
  Pickups.arr = [];
  App.state = 1;

  // reset mask
  var L = App.maskRes * App.maskRes;
  for(var i = 0; i < L; i++) {
    App.mask[i] = 0;
  }
};

App.setActor = function(obj) {
  if(!App.actors[obj.id]) {
    console.log("create new actor");
    App.actors[obj.id] = new Actor(obj.id);
  }
  App.actors[obj.id].respawn(obj);

};


App.drawHighScore = function() {
  var c = 1;
  for(var it in App.actors) {
    text(NAMES[it % NAMES.length], App.width - 200, 50 * c, 30, COLORS[it % COLORS.length]);
    text(App.scores[it] ||0, App.width - 50, 50 * c, 30, COLORS[it % COLORS.length]);
    c++;
  }

  if(App.state == 0 && App.last_win >= 0) {
    text(NAMES[App.last_win % NAMES.length] + " wins!", Field.size / 2, Field.size / 2, 40, '#FFF');
  }
}


var COLORS = [
  '#f00',
  '#0f0',
  '#00f',
  '#ff0',
  '#0ff',
  '#fff',
  '#BF5FFF',
  '#FF69B4'
];
var NAMES = [
  'Fred',
  'Greenlee',
  'Bluebell',
  'Willem',
  'Cynic',
  'Walter',
  'Lilly',
  'Pinky'
];

function text(text, x,y, size, color) {

  size = size || 16;
  color = color || '#AAA';
  App.ctx.fillStyle = color;
  //ctx.font = 'thin 16px Arial serif';
  App.ctx.font = '400 '+size+"px Open Sans";
  App.ctx.textBaseline = 'bottom';
  App.ctx.fillText(text, x, y);

}



var getTime = function() {
  return new Date().getTime();
}

function loadImages(sources, callback) {
  var images = {};
  var loadedImages = 0;
  var numImages = 0;
  // get num of sources
  for(var src in sources) {
    numImages++;
  }
  for(var src in sources) {
    images[src] = new Image();
    images[src].onload = function() {

      if(++loadedImages >= numImages) {
        callback(images);
      }
    };
    images[src].src = sources[src];
  }
}

$(loadImages(['power.png'], App.init));
