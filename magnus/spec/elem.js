var _ = require('stackq'), magnus = require('../magnus.js');

_.Jazz('magnus specifications',function(k){

  var data = _.Immutate.transform({
    label: 'i love her',
    name: 'denis',
    date: Date.now(),
  });

  var atom = magnus.Component.extends({
    init: function(map,fn){
      this.$super('atom',map,fn);
    },
  });

  var list = magnus.Component.extends({
    init: function(map){
      this.$super('li',map,function(){
        return this.atom;
      });
    }
  });


  var denis = list.make({ atom: data.ghost('name') });

  var atomic = atom.make({
    atom: data.ghost('label'),
    attr: { id: data.ghost('name') },
  },function(){
    return [this.atom,denis];
  });



  k('can i create a magnus.component for li',function($){
    $.sync(function(d,g){
      _.Expects.truthy(d);
      _.Expects.truthy(magnus.Component.instanceBelongs(d));
      _.Expects.truthy(list.instanceBelongs(d));
      _.Expects.is(d.type,'li');
    });
  }).use(denis);

  k('can i create a magnus.component for atom',function($){
    $.sync(function(d,g){
      _.Expects.truthy(d);
      _.Expects.truthy(magnus.Component.instanceBelongs(d));
      _.Expects.truthy(atom.instanceBelongs(d));
      _.Expects.is(d.type,'atom');
    });
  }).use(atomic);

  var f = atomic.render();
  var g = denis.render();

  k('can i render atom and cache output using rendering conf',function($){
    $.sync(function(d,g){
      _.Expects.isString(d);
      _.Expects.is(d,f);
    });
  }).use(atomic.render());
 
  k('can i render list and cache output using rendering conf',function($){
    $.sync(function(d,r){
      _.Expects.isString(d);
      _.Expects.is(d,g);
    });
  }).use(denis.render());

  data.get().set('label','i hate you');
  data.get().set('name','winston');

  k('can i update data for atom, re-render and invalidate cache',function($){
    $.sync(function(d,g){
      _.Expects.isString(d);
      _.Expects.isNot(d,f);
    });
  }).use(atomic.render());
 
  k('can i update data list,re-render and invalidate cache',function($){
    $.sync(function(d,r){
      _.Expects.isString(d);
      _.Expects.isNot(d,g);
    });
  }).use(denis.render());

});

