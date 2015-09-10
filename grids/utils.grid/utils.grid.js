module.exports = (function(){
  "use strict";

  var _ = require('stackq');
  var grid = require('grids');
  var utils = { misc:{}, bp:{}, mutators:{} };

 utils.bp.split = grid.Blueprint('packet.split',function(){
    this.in().on(this.$bind(function(p){
      var b = p.body, stream = p.stream();
      stream.on(this.$bind(function(f){
        var r = this.out().$.clone(p);
        r.emit(f);
      }));
    }));
  });

 utils.bp.jsonStringify = grid.Blueprint('json.stringify',function(){
    this.in().on(this.$bind(function(p){
      var res,data = [],b = p.body, stream = p.stream(), indent = this.getConfigAttr('indent') || b.indent || 5;
      stream.on(function(f){ data.push(f); });
      stream.afterEvent('dataEnd',function(){
        try{
          res = JSON.stringify(data.join(''),null,indent);
        }catch(e){
          return this.out('err').Packets.clone(p,{ err: e, 'mesg': 'json.stringify.err'});
        }
        var f = this.out().Packets.from(p,'json.stringified');
        f.emit(res);
        f.end();
      });
    }));
  });

  utils.bp.jsonParse = grid.Blueprint('json.parse',function(){
    if(!this.hasConfigAttr('indent')){ this.config({indent: 5 }); };
    var gindent = this.getConfigAttr('indent');

    this.in().on(this.$bind(function(p){
      var res,data = [],b = p.body, stream = p.stream(), indent = b.indent || gindent;
      stream.on(function(f){ data.push(f); });
      stream.afterEvent('dataEnd',function(){
        try{
          res = JSON.parse(data.join(''),null,indent);
        }catch(e){
          return this.out('err').Packets.clone(p,{ err: e, 'mesg': 'json.parsed.err'});
        }
        var f = this.out().Packets.clone(p,'json.parsed');
        f.emit(res); f.end();
      });
    }));
  });

  utils.bp.nodeRequire = grid.Blueprint('node.require',function(){
    this.in().on(this.$bind(function(p){
      var res,b = p.body, mod = b.mod;
      if(_.valids.not.exists(mod)){
        return this.out('err').p.make({ err: 'no mod attribute in map', map: body });
      }
        try{
          res = require(mod);
        }catch(e){
          return this.out('err').Packets.clone(p,{ err: e, 'mesg': 'require.error.err'});
        }
        var f = this.out().Packets.clone(p,{ mod: res });
    }));
  });

  utils.bp.modelStorage = grid.Blueprint('model.storage',function(){
    this.config({ m: _.Storage.make('model-store') });

    var mem = this.getConfigAttr('m');

    this.newIn('get');

    this.in('get').pause();

    this.in().on(this.$bind(function(p){
      if(_.valids.not.contains(p.body,'model') && _.valids.not.contains(p.peekConfig(),'model')){
        return this.out('err').Packets.clone(p,new Error('invalid packet,no "model" key in task meta'))
      }
      var body = p.body, model = body.model || p.getConfigAttr('model'),stream = p.stream();
      if(_.valids.not.exists(model)) return;
      _.CollectStream(stream,this.$bind(function(d){
        mem.add(model,d);
        this.in('get').resume();
      }));
    }));

    this.in('get').on(this.$bind(function(p){
      if(_.valids.not.contains(p.body,'model')) return;
      var model = p.body.model;
      if(mem.has(model)){
        var data = mem.get(model);
        var f = this.out().$.clone(p);
        f.emit(data); f.end();
      }else{
        this.out('err').Packets.clone(p,{ e: this.makeName('notFound'), model: model });
      }
    }));

  });

  return utils;

})();
