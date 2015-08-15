//the commonly used protocol, shared between client and server

//the defined protocol
var PROT = [
  // 0: who am I
  {
   size: 5,
   id: 'Uint32',
   state: 'Uint8'
  },
  // 1: who presses key in which direction
  {
    size: 13,
    id: 'Uint32',
    dir: 'Int8',
    time: 'Uint32',
    gap: 'Uint32'
  },
  // 2: start position of a actor
  {
    size: 16,
    x: 'Float32',
    y: 'Float32',
    rot: 'Float32',
    id: 'Uint32'
  }


];

var Structure = {
  parse: function(ab) {

    if (ab instanceof ArrayBuffer) {
      //is already array buffer

    } else {
      ab = this.toArrayBuffer(ab)
    }

    var dv = new DataView(ab);

    var type = dv.getUint8(0, true);
    if(type < 0 || type >= PROT.length) {
      console.log("unsupported type ", type);
      return;
    }
    var prot = PROT[type];
    var obj = {type: type};
    var ind = 1;
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
    return obj;
  },

  pack: function(obj, type) {
    if(type < 0 || type >= PROT.length) {
      console.log("unsupported type ", type);
      return;
    }

    var prot = PROT[type];
    var ab = new ArrayBuffer(prot.size+1);
    var dv = new DataView(ab);
    dv.setUint8(0, type);
    var ind = 1;

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
          dv.setFloat32(ind, obj[key]);
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