var App = {};
var Field = {};

App.canvas = document.getElementById('c');
App.ctx = App.canvas.getContext('2d');
App.actors = {};

App.init = function() {
  App.maskRes = 500;
  App.resize();
  Key = new Key();
  Client.initialize();

  App.mask = new Uint8Array(App.maskRes * App.maskRes);
  //window.setInterval(App.render, 32);
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

  Field.offset_x = 10,
  Field.offset_y = (h - Field.size) / 2;

  //Field.ctx.width = Field.size;
  //Field.ctx.height = Field.size;

  //Field.ctx.globalCompositeOperation = 'destination-atop';
};


App.render = function() {
  for(var it in App.actors) {
    App.actors[it].update(1);
  }


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

  // clear
  App.ctx.clearRect(Field.offset_x, Field.offset_y, Field.size, Field.size);

  // draw the border
  App.ctx.strokeStyle="#FFFFFF";
  App.ctx.rect(Field.offset_x, Field.offset_y, Field.size, Field.size);
  App.ctx.stroke();
  App.ctx.drawImage(Field.canvas, Field.offset_x, Field.offset_y);
  window.requestAnimationFrame(App.render);
};

App.createEvent = function(dir) {
  Client.sendDir(dir)
}

App.dispatchEvent = function(obj) {
  console.log(obj);
  // todo recv from server
  App.actors[obj.id].rotate(obj.dir, 1);
};

App.setActor = function(obj) {
  if(!App.actors[obj.id]) {
    console.log("create new actor");
    App.actors[obj.id] = new Actor();
  }
  App.actors[obj.id].respawn(obj);

};

var Actor = function() {
  var x = 0.5,
      y = 0.5,
      speed = 0.005,
      rot = 0,
      size = 2,
      state = 2;  // 0: waiting (before game start), 1: playing, 2: dead

  this.update = function(dt) {
    if(state == 2) return; // you are dead
    this.move(dt /2);
    this.draw();
    this.move(dt /2);
    this.draw();
  };

  this.die = function() {
    state = 2;
  };

  this.respawn = function(obj) {
    state = 0;
    x = obj.x;
    y = obj.y;
    rot = obj.rot;
  };

  // moves and checks for collision
  this.move = function(dt) {
    var dx = Math.cos(rot) * speed * dt,
        dy = Math.sin(rot) * speed * dt;

    // i iterate over the forwards angles
    for(var i = -Math.PI / 2; i <= Math.PI /2; i+= Math.PI / 10) {

      // i set the mask at the inner bounds, the actual size
      var sx =  Math.cos(rot + i) * size + x * App.maskRes ,
          sy =  Math.sin(rot + i) * size + y * App.maskRes ;

       //console.log("set "+sx+" "+sy+" "+ Math.round(sx)+" "+Math.round(sy));
      // dont check the outer angels, causes false in at rotating
      if(i > -Math.PI / 2.1 && i < Math.PI / 2.1) {
        // this calculates where the pixels whould be drawn ont he reference resolution
        // i will check one pixel more than the radius itself
        // add 1.5 more, so it wont get round in the wrong direction twice(negelcted)
         var cx =  Math.cos(rot + i) * (size + 1.5) + (x + dx) * App.maskRes ,
             cy =  Math.sin(rot + i) * (size + 1.5) + (y + dy) * App.maskRes ;
        // console.log("check "+cx+" "+cy);
        if(App.mask[Math.round(cy) * App.maskRes + Math.round(cx)] == 1) {
          console.log("collide");
          this.die();
        }
      }
      // set the mask, where someone has been
      App.mask[Math.round(sy) * App.maskRes + Math.round(sx)] = 1;
    }

    x += dx;
    y += dy;

    // collision check at borders
    if(x <= 0 || x >= 1 || y <= 0 || y >= 1) {
      console.log("border dead");
      this.die();
    }
  }

  this.rotate = function(dir, dt) {
    rot += dir * dt * 0.05;
  };

  this.draw = function() {
    Field.ctx.fillStyle="#FF0000";
    Field.ctx.beginPath();
    Field.ctx.arc(x * Field.size, y * Field.size, size * App.scale, 0, 2 * Math.PI);
    Field.ctx.fill();
  };

};



$(App.init);