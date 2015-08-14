
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
