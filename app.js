var App = {
  pixelratio : 1.5 // better rendering quality, but also more computation needed
};
var Field = {};

var DEBUG = false;

App.canvas = document.getElementById('c');

App.actors = {};
App.scores = {};
App.stats = {
  fps: {
    cur_fps: 0,
    fps: 0,
    time: getTime()
  },
  msg_recv: 0,  // messages recieved in the last second
  msg_apply: 0, // message aplied (new)
  msg_diff: 0,  // how far behind the messages were (avg)
  msg_max: 0,   // the longest clatch of messages,
  packages_recv: 0  // packages recv (better should be called msg, but already taken)
}

App.init = function(images) {
  console.log(images);
  App.maskRes = 500;
  App.state = 0;  // 0: before game, 1: awaking, 2: playing
  App.last_win = -1;
  Menu.init();
  App.resize();
  Key = new Key();
  Touch = new Touch();
  Client.initialize();
  App.img_pickup = images[0];

  App.mask = new Uint8Array(App.maskRes * App.maskRes);
  window.requestAnimationFrame(App.render);

};

App.resize = function() {

  // this game takes a sqauared playfield and 1/4th menu
  var size = Math.min($(window).width() * 0.75, $(window).height());

  App.width = size;
  App.height = size;

  Field.size = size - 15;

  App.canvas.width = size * App.pixelratio;
  App.canvas.height = size * App.pixelratio;
  App.canvas.style.width = size + 'px';
  App.canvas.style.height = size + 'px';
  App.ctx = App.canvas.getContext('2d');
  App.ctx.scale(App.pixelratio, App.pixelratio);

  App.scale = Field.size / App.maskRes;  // everything gets scaled according to this

  Field.canvas = document.createElement('canvas');
  Field.canvas.width = Field.size ;  // needs to be set bot for canvas as well as ctx
  Field.canvas.height = Field.size;


  Field.ctx = Field.canvas.getContext('2d');
 // Field.ctx.scale(App.pixelratio, App.pixelratio *2);
  Field.offset_x = 7,
  Field.offset_y = (size - Field.size) / 2;

  Menu.resize();
};


App.render = function() {
  // count FPS
  App.stats.fps.cur_fps++;

  var now = getTime();
  if (now > App.stats.fps.time) {
    App.stats.fps.time += 1000;
    App.stats.fps.fps = App.stats.fps.cur_fps;
    App.stats.fps.cur_fps = 0;
    // reset other

    App.stats.show = {
      msg_recv: App.stats.msg_recv,
      msg_max: App.stats.msg_max,
      msg_diff: App.stats.msg_diff,
      msg_apply: App.stats.msg_apply,
      packages_recv: App.stats.packages_recv
    };
    App.stats.msg_recv = 0;
    App.stats.msg_max = 0;
    App.stats.msg_diff = 0;
    App.stats.msg_apply = 0;
    App.stats.packages_recv = 0;

  }

  for(var i = 0; i < 256; i++) {
    if(Key.down(i)) {
      //console.log("down ", i);
    }
  }


  Menu.render();

  // clear
  App.ctx.clearRect(0, 0, App.width, App.height);

  Client.update();
  Pickups.draw(16);
  Particles.render(16);

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

  for(var it in App.actors) {
    // which color should you be drawn
    var color = '#FFF'; // default color
    var size = 3;
    if (App.actors[it].getInvert())  { color = '#00F'; size++; }
    if (App.actors[it].getInvincible()) { color = '#0F0';  size++; }
    if (App.actors[it].getNoControl()) { color = '#F00';  size++; }

    App.ctx.fillStyle = color;
   if(App.state == 1) {
      if(it == Client.getId()) {
        size = Ease.spawningSelf(App.time, 3, 9, 2000);
      }
    }
    App.ctx.beginPath();
    if (!App.actors[it].get90Deg()) {
      App.ctx.arc(
        App.actors[it].getX() * Field.size + Field.offset_x,
        App.actors[it].getY() * Field.size + Field.offset_y,
        size * App.scale,
        0,
        2 * Math.PI
      );
    } else {
      size += 2;
      App.ctx.fillRect(
        App.actors[it].getX() * Field.size + Field.offset_x - size * App.scale / 2,
        App.actors[it].getY() * Field.size + Field.offset_y - size * App.scale / 2,
        size * App.scale,
        size * App.scale
      );
    }

    App.ctx.fill();
    App.ctx.closePath();
  }

  // draw mask
  /*
  if(DEBUG) {
    App.ctx.fillStyle="#0F0";
    for(var i = 0; i < App.maskRes; i++) {
      for(var j = 0; j < App.maskRes; j++) {
        if(App.mask[j* App.maskRes + i]) {
          App.ctx.fillRect(App.width - App.maskRes + i, App.height - App.maskRes + j, 1, 1 );
        }
      }
    }
  }*/

  window.requestAnimationFrame(App.render);
  //setTimeout(App.render, 16)
};

App.dispatchEvent = function(obj) {
  //App.time = obj.time;
  for(var it in App.actors) {
    App.actors[it].dispatchEvent(obj);
  }
};

App.restartMatch = function() {
  Field.trans = DEBUG;
  App.actors = {};
  Pickups.arr = [];
  App.state = 1;
  App.clearField();
};

App.clearField = function() {
  Field.ctx.clearRect(0, 0, Field.size, Field.size);  // clear context
  // reset mask
  var L = App.maskRes * App.maskRes;
  for(var i = 0; i < L; i++) {
    App.mask[i] = 0;
  }
}

App.setActor = function(obj) {
  if(!App.actors[obj.id]) {
    console.log("create new actor");
    App.actors[obj.id] = new Actor(obj.id);
  }
  App.actors[obj.id].respawn(obj);

};

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

function text(text, x,y, size, color, ctx) {
  ctx = ctx || App.ctx;
  size = size || 16;
  color = color || '#AAA';
  ctx.fillStyle = color;
  ctx.font = '400 '+size+"px Open Sans";
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, x, y);
}

function getTime() {
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

$(loadImages(['together2.png' ], App.init));
