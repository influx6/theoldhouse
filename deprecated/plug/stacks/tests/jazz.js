var stacks = require('../stacks');
var core = stacks.core;

core.JzGroup('Jazz specifications',function(_){

  _('can i test jazz',function($){

    $.sync(function(m){
      core.Expects.isString(m);
    });

  }).use(1);

  var statement = "its jazzy";
  _('can i test statements',function($){

    $.sync(function(m){
      core.Expects.isMust(m,statement);
    });

  }).use(statement);

});
