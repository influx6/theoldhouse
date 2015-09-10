var stacks = require('../stacks');
var core = stacks.core;

core.JzGroup('Class specifications',function(_){

  var fruit = core.Class({
    squeeze: function(){ return true; }
  });

  var berry = fruit.extends({
    squeeze: function(){
      return fruit.prototype.squeeze.apply(this,arguments);
    }
  });

  var whiteBerry = berry.extends({
    isWhite: function(){ return true; },
    squeeze: function(){
      return false;
    }
  });

  _('can i create a fruit',function($){
    $.sync(function(m){
      var ft = new m();
      core.Expects.isFunction(m);
      core.Expects.isObject(ft);
      core.Expects.isTrue(ft.squeeze());
    });
  }).use(fruit);

  _('can i create a berry fruit',function($){
    $.sync(function(m){
      var ft = new m();
      core.Expects.isFunction(m);
      core.Expects.isObject(ft);
      core.Expects.isTrue(ft.squeeze());
    });
  }).use(berry);

  _('can i extend a berryfuit',function($){
    $.sync(function(m){
      var ft = new m();
      core.Expects.isFunction(m);
      core.Expects.isObject(ft);
      core.Expects.isFalse(ft.squeeze());
    });
  }).use(whiteBerry);

});
