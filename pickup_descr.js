// this file describes which pickups exist and how often they spawn, 
// the effect itself is determined by pickup.js
var PICKUP = [
  {
    prop: [0, 0, 1],
    descr: 'delete all lines',
    dur: 0
  }, {
    prop: [0.5, 1, 1],
    descr: 'turn in 90deg angles only',
    dur: 2000
  }, {
    prop: [1, 1, 1],
    descr: 'you become invisible (no gap)',
    dur: 2000
  }, {
    prop: [1, 1, 1],
    descr: 'affected players lose control',
    dur: 1500
  }, {
    prop: [0, 0, 1],
    descr: 'walls become passable',
    dur: 6000
  }, {
    prop: [1, 1, 1],
    descr: 'affected players become invincible',
    dur: 2500
  }
];