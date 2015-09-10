///shims for magnus
//

var _ = require('stackq');
var Shims = {};

Shims.RequestFrame = (function(){
  var map = {};
  var lastTime = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  for(var x = 0; x < vendors.length && !global.requestAnimationFrame; ++x) {
    global.requestAnimationFrame = global[vendors[x]+'RequestAnimationFrame'];
   global.cancelAnimationFrame = global[vendors[x]+'CancelAnimationFrame']
    || global[vendors[x]+'CancelRequestAnimationFrame'];
  }

  if (!global.requestAnimationFrame){
    map.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = global.setTimeout(function() { callback(currTime + timeToCall); },
      timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }else {
    map.requestAnimationFrame = function(){
      return global.requestAnimationFrame.apply(global,arguments);
    };
  }

  if (!global.cancelAnimationFrame){
   map.cancelAnimationFrame = function(id) {
      clearTimeout(id);
   };
 }else{
    map.cancelAnimationFrame = function(){
      return global.cancelAnimationFrame.apply(global,arguments);
    };
 }

 return map;
}());

Shims.createFrame = function(fn){
  if(typeof fn !== 'function') return;

  var dist = _.Distributors();
  var paused = false,res,id, target = function Cycle(f){
    res = fn(f);
    dist.distribute(f);
    id = Shims.RequestFrame.requestAnimationFrame(Cycle);
    return res;
  };
  
  id = Shims.RequestFrame.requestAnimationFrame(target);

  return {
    id: function(){ return id },
    dist: function(){ return dist; },
    cancel: function(){ 
      Shims.RequestFrame.cancelAnimationFrame(id); 
    },
    pause: function(){ 
      if(!!paused) return
      paused = true;
      this.cancel(); 
    },
    resume: function(){
      if(!paused) return
      id = Shims.RequestFrame.requestAnimationFrame(target);
    },
    on: _.funcs.bind(dist.add,dist),
    onEnd: _.funcs.bind(dist.addDone,dist),
    once: _.funcs.bind(dist.addOnce,dist),
    onEndOnce: _.funcs.bind(dist.addDoneOnce,dist),
    off: _.funcs.bind(dist.remove,dist),
    offEnd: _.funcs.bind(dist.removeEnd,dist),
    offAll: _.funcs.bind(dist.removeAll,dist),
    offAllEnd: _.funcs.bind(dist.removeAllDone,dist),
  };
};

module.exports = Shims;
global.Shims = Shims;
