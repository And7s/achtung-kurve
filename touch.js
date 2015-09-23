var Touch = function() {


  document.body.addEventListener('touchstart', function(e){
    handleStart(e);
  }, false);

  document.body.addEventListener('touchmove', function(e){
    handleStart(e);
  }, false);

  document.body.addEventListener('touchend', function(e){
      handleEnd(e);
  }, false);

  document.body.addEventListener('touchleave', function(e){
      handleEnd(e);
  }, false);
  document.body.addEventListener('touchcancel', function(e){
      handleEnd(e);
  }, false);


  var handleStart = function(e) {
    console.log("start", e.touches[0].clientX);
    var pos = e.touches[0].clientX;
    var key = (pos / App.width) > 0.5 ? 39 : 37;
    Key.simulate(key);
    // 39 // 37
  };

  var handleEnd = function(e) {
    console.log("end", e);
    Key.reset(39);
    Key.reset(37);
  };

};