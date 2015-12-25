var App = {
  maskRes: 500
};

App.mask = new Uint8Array(App.maskRes * App.maskRes);

// on match start

var Match = {

  restart: function() {
    // clear field (mask)
    var L = App.maskRes * App.maskRes;
    for(var i = 0; i < L; i++) {
      App.mask[i] = 0;
    }
  }

};