module.exports = (function(){
  "use strict";

  var _ = require('stackq');
  var plug = require('plugd');

  var utils = plug.Rack.make('rackStore');

  utils.registerPlug('json.stringify',function(){

    this.newTask('conf',this.makeName('conf')).on(this.$bind(function(p){
      this.config(p.body);
    }));

    this.tasks().on(this.$bind(function(p){
      var res,data = [],b = p.body, stream = p.stream(), indent = this.getConfigAttr('indent') || b.indent || 5;
      stream.on(function(f){ data.push(f); });
      stream.afterEvent('dataEnd',function(){
        try{
          res = JSON.stringify(data.join(''),null,indent);
        }catch(e){
          return this.Reply.from(p,'json.stringify.error',e);
        }
        var f = this.Reply.from(p,'json.stringified');
        f.emit(res);f.end();
      });
    }));
  });

  utils.registerPlug('json.parse',function(){

    this.newTask('conf',this.makeName('conf')).on(this.$bind(function(p){
      this.config(p.body);
    }));

    this.tasks().on(this.$bind(function(p){
      var res,data = [],b = p.body, stream = p.stream(), indent = this.getConfigAttr('indent') || b.indent || 5;
      stream.on(function(f){ data.push(f); });
      stream.afterEvent('dataEnd',function(){
        try{
          res = JSON.parse(data.join(''),null,indent);
        }catch(e){
          return this.Reply.from(p,'json.parse.error',e);
        }
        var f = this.Reply.from(p,'json.parsed');
        f.emit(res); f.end();
      });
    }));
  });

  utils.registerPlug('node.require',function(){
    this.tasks().on(this.$bind(function(p){
    }));
  });

  utils.registerPlug('model.storage',function(){
    this.config({ m: _.Storage.make('model-store') });

    var mem = this.getConfigAttr('m');

    this.newTask('get',this.makeName('get'));

    this.tasks('get').pause();

    this.tasks().on(this.$bind(function(p){
      if(_.valids.not.contains(p.body,'model') && _.valids.not.contains(p.peekConfig(),'model')){
        return this.Reply.from(p,new Error('invalid packet,no "model" key in task meta'))
      }
      var body = p.body, model = body.model || p.getConfigAttr('model'),stream = p.stream();
      if(_.valids.not.exists(model)) return;
      _.CollectStream(stream,this.$bind(function(d){
        mem.add(model,d);
        this.tasks('get').resume();
      }));
    }));

    this.tasks('get').on(this.$bind(function(p){
      if(_.valids.not.contains(p.body,'model')) return;
      var model = p.body.model;
      if(mem.has(model)){
        var data = mem.get(model);
        var f = this.Reply.from(p);
        f.emit(data); f.end();
      }else{
        this.Reply.from(p,this.makeName('error'));
      }
    }));

  });

  return utils;

})();
