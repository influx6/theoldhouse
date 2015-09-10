///shims for magnus
//

var Shims = {};

Shims.RequestAnimationFrame = (function(){
  return global.requestAnimationFrame ||
      global.webkitRequestAnimationFrame ||
      global.mozRequestAnimationFrame ||
      function(callback){
        global.setTimeout(callback,1000/60);
      };
}());

module.exports = Shims;
  
