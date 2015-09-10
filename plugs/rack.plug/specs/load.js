var _ = require('stackq');
var plug = require('plugd');
var rack = require('../rack.plug.js');

_.Jazz('rack.plug specification tests',function(n){

  var grid = rack.RackJS('rack.grid');

  grid.Task.make('rackdb.require.conf',{
    base:'../confs',
    models: './models'
  });

  n('can i create a rack network',function(k){

    k.sync(function(d,g){
      _.Expects.truthy(plug.Network.instanceBelongs(d));
    });

    k.for(grid);
  });

  n('can i get a model data network',function(k){

    k.async(function(d,n,g){
      d.on(g(function(f){
        n();
        _.Expects.truthy(plug.Packets.isReply(f));
        _.Expects.is(f.body.model,'shifter.js');
      }));
    });

    var t = plug.TaskPackets.make('rackdb.require.get',{'model': 'shifter.js'});
    var tt = grid.emitWatch(t);

    k.for(tt);
  });
});
