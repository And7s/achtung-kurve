//the commonly used protocol, shared between client and server

//the defined protocol
var PROT = [
  // 0: who am I
  {
   size: 9,
   id: 'Uint32',
   state: 'Uint8',
   time: 'Uint32'
  },
  // 1: who presses key in which direction
  {
    size: 17,
    id: 'Uint32',
    dir: 'Int8',
    time: 'Uint32',
    gap: 'Uint32',
    next_gap: 'Uint32'
  },
  // 2: start position of a actor
  {
    size: 20,
    x: 'Float32',
    y: 'Float32',
    rot: 'Float32',
    id: 'Uint32',
    time: 'Uint32'
  },
  // 3: single "match will start" flag
  {
    size: 4,
    time: 'Uint32'
  },
  // 4: add a new pickup (pickup spawn)
  {
    size: 13,
    x: 'Float32',
    y: 'Float32',
    num: 'Uint8',
    time: 'Uint32'
  },
  // 5: collect a pickup
  {
    size: 9,
    id: 'Uint32',
    num: 'Uint8',
    time: 'Uint32'
  },
  // 6: score a point
  {
    size: 8,
    id: 'Uint32',
    time: 'Uint32'
  },
  // 7: diseffect (reverts 5)
  {
    size: 9,
    id: 'Uint32',
    num: 'Uint8',
    time: 'Uint32'
  }

];

var Structure = {
  parse: function(ab, callback) {
    if (ab instanceof ArrayBuffer) {
      //is already array buffer
    } else {
      ab = this.toArrayBuffer(ab)
    }

    var dv = new DataView(ab);
    var ret = [];
    var length = ab.byteLength;

    var ind = 0;
    while(ind < length) { // support for multiple messages per package
      var type = dv.getUint8(ind++, true);
      var p_id = dv.getUint32(ind, true);
      ind += 4;
      if(type < 0 || type >= PROT.length) {
        console.log("unsupported type ", type);
        return;
      }

      var prot = PROT[type];
      var obj = {type: type, p_id: p_id};

      for(var key in prot) {  //no prototype assigned
        if(key == 'size') continue;
        var val;
        switch(prot[key]) {
          case 'Uint8':
            val = dv.getUint8(ind++, true);
            break;
          case 'Int8':
            val = dv.getInt8(ind++, true);
            break;
          case 'Uint32':
            val = dv.getUint32(ind, true);
            ind += 4;
            break;
          case 'Float32':
            val = dv.getFloat32(ind, true);
            ind += 4;
            break;
          case 'Str10':   //10 character in 2 bytes each
            var val = "";
            for(var i = 0; i < 10; i++) {
              var code = dv.getUint16(ind);
              ind += 2;
              if(code != 0) {
                val += String.fromCharCode(code);
              }
            }
            break;
          default:
            console.log("unsupported data type");
        }
        obj[key] = val;
      }
      ret.push(obj);
    }
    callback(ret);
  },

  // concatenate two array buffers
  append: function(a, b) {
    // only supported on the server side
    if(typeof(Buffer) != "undefined") {  // server side supports
      return Buffer.concat([a,b]);
    }else {
      var tmp = new Uint8Array(a.byteLength + b.byteLength);
      tmp.set(new Uint8Array(a), 0);
      tmp.set(new Uint8Array(b), a.byteLength);
      return tmp.buffer;
    }
  },


  pack: function(obj, type) {
    if(type < 0 || type >= PROT.length) {
      console.log("unsupported type ", type);
      return;
    }

    var prot = PROT[type];
    var ab = new ArrayBuffer(prot.size + 5);  // per default each package has a type and a p_id
    var dv = new DataView(ab);
    dv.setUint8(0, type);
    dv.setUint32(1, obj.p_id, true);
    var ind = 5;

    for(var key in prot) {  //no prototype assigned
      if(key == 'size') continue;
      var val;
      switch(prot[key]) {
        case 'Uint8':
          dv.setUint8(ind++, obj[key]);
          break;
        case 'Int8':
          dv.setInt8(ind++, obj[key]);
          break;
        case 'Uint32':
          dv.setUint32(ind, obj[key], true);
          ind += 4;
          break;
        case 'Float32':
          dv.setFloat32(ind, obj[key], true);
          ind += 4;
          break;
        case 'Str10':
          for (var i = 0; i < 10; i++) {
            if(i >= obj[key].length) {
              dv.setUint16(ind, 0);
            }else {
              dv.setUint16(ind, obj[key].charCodeAt(i));
            }
            ind += 2;
          }
          break;
        default:
          console.log("unsupported data type");
      }
    }
    return this.toBuffer(ab);
  },

  toBuffer: function(ab) {
    if(typeof Buffer == "function") { //client does not need this conversion
      var buffer = new Buffer( ab.byteLength);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
      }
      return buffer;
    }else {
      return ab;
    }

  },

  toArrayBuffer: function(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
    }
    return ab;
  }
};


//conversion tools from/to araybuffer and strings
function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}
function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}