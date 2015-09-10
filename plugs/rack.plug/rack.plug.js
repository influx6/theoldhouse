module.exports = (function init(){
"use strict";

  var _ = require('stackq');
  var path = require('path');
  var plug = require('plugd');
  var fs = require('fs.plug');
  var utils = require('utils.plug');

  var rackstore = plug.Rack.make('rackStore');

  rackstore.registerPoint('load.model.transform',function(p){
    var f = this.srcTask.from(p,'rack.model');
    f.config(p.body);
  });

  rackstore.registerPoint('load.fs.transform',function(p){
    var f = this.srcTask.from(p,'io.iocontrol');
    f.config(p.body);
  });

  rackstore.registerPoint('reply.transform',function(p){
    var f = this.srcTask.from(p);
    f.config(p.body);
  });

  rackstore.registerPlug('loadModels',function(){
    var models,uuid = _.Util.guid();
    this.newSrcReply('files',uuid).on(this.$bind(function(p){
      var lists = p.stream();
      lists.on(this.$bind(function(f){
        this.Reply.make('loadModels.model',f);
      }));
    }));

    this.newTask('rload',this.makeName('reload'));

    this.tasks('rload').pause();

    this.tasks('rload').on(function(){
      if(models){
        this.Reply.make('loadModels.fs',{ task: 'dir.read', file: models },uuid);
      }
    });

    this.tasks().on(this.$bind(function(p){
      models = p.body.models;
      this.Reply.make('loadModels.fs',{ task: 'dir.read', file: models },uuid);
      this.tasks('rload').resume();
    }));

  });

  rackstore.registerPlug('loadModelContent',function(){
    var uuid = _.Util.guid();

    this.newSrcReply('data',uuid).on(this.$bind(function(p){
      var name = path.basename(p.body.p);
      var meta = _.Util.extends({ model: name},p.body);
      var f = p.link(this.Reply.from(p,this.makeName('data'),meta));
      f.config({ model:  name, name: name });
    }));

    this.tasks().on(this.$bind(function(p){
      var model = p.body, name = model.id, file = model.file;
      this.Reply.make(this.makeName('fs'),{ task: 'file.read', file: file },uuid);
    }));

  });

  rackstore.registerPlug('loadModelCode',function(){
    var uuid = _.Util.guid();

    this.newSrcReply('data',uuid).on(this.$bind(function(p){
      var name = p.body.id;
      var meta = _.Util.extends({ model: name},p.body);
      var f = p.link(this.Reply.clone(p,this.makeName('data'),meta));
      f.config({ name: name, model: name });
    }));

    this.tasks().on(this.$bind(function(p){
      var ob,model = p.body, name = model.id, file = model.file;
      try{
        ob = require(file);
      }catch(e){
        var f = this.Reply.make(uuid,p.body);
        f.emit(e); f.end();
        return;
      }
      var f = this.Reply.make(uuid,p.body);
      f.emit(ob); f.end();
    }));

  });

  rackstore.rackLoad = plug.Network.blueprint(function rackNet(){

    this.use(fs.Plug('io.iocontrol'),this.makeName('fs'));

    this.use(rackstore.Plug('loadModels'),this.makeName('load.models'));

    this.get(this.makeName('load.models'))
    .attachPoint(rackstore.Point('load.model.transform'),'loadModels.model','model.transformer');

    this.get(this.makeName('load.models'))
    .attachPoint(rackstore.Point('load.fs.transform'),'loadModels.fs','fs.transformer')

  });

  rackstore.registerPlug('require.rack',function rackdbNet(){
    var conf,rack = rackstore.rackLoad('rackdb');

    rack.$dot(function(){

      this.use(utils.Plug('model.storage','loadModelCode.data'),this.makeName('load.store'));
      this.use(rackstore.Plug('loadModelCode'),this.makeName('loadcontent.model'));

      this.get(this.makeName('loadcontent.model')).attachPoint(rackstore.Point('reply.transform'));
      this.get(this.makeName('load.models')).attachPoint(function(p){
        return this.srcTask()
      });
    });

    this.attachNetwork(rack);
    this.networkOut(this.replies());

    this.newTask('get',this.makeName('get'));
    this.newTask('conf',this.makeName('conf'));
    this.newTask('rload',this.makeName('reload'));

    this.tasks('rload').on(this.$bind(function(p){
      rack.Task.make('loadModels.reload',{ models : conf.models });
    }));

    this.tasks('get').on(this.$bind(function(p){
      rack.Task.clone(p,'model.storage.get');
    }));

    this.tasks('conf').on(this.$bind(function(p){
      conf = p.body;
      if(_.valids.not.contains(conf,'base')) return;
      if(_.valids.not.contains(conf,'models')) return;
      rack.Task.make('io.iocontrol.conf',{ base : conf.base });
      rack.Task.make('loadModels',{ models : conf.models });
    }));

  });

  rackstore.registerPlug('source.rack',function rackdbNet(){
    var conf,rack = rackstore.rackLoad('rackdb');

    rack.$dot(function(){
      this.use(utils.Plug('model.storage','loadModelContent.data'),this.makeName('load.store'));
      this.use(rackstore.Plug('loadModelContent'),this.makeName('loadcontent.model'));
      this.get(this.makeName('loadcontent.model'))
      this.get(this.makeName('loadcontent.model')).attachPoint(rackstore.Point('reply.transform'));
    });

    this.attachNetwork(rack);
    this.networkOut(this.replies());

    this.newTask('get',this.makeName('get'));
    this.newTask('conf',this.makeName('conf'));
    this.newTask('rload',this.makeName('reload'));

    this.tasks('rload').on(this.$bind(function(p){
      rack.Task.make('models.reload',{ models : conf.models });
    }));

    this.tasks('get').on(this.$bind(function(p){
      rack.Task.clone(p,'model.storage.get');
    }));

    this.tasks('conf').on(this.$bind(function(p){
      conf = p.body;
      if(_.valids.not.contains(conf,'base')) return;
      if(_.valids.not.contains(conf,'models')) return;
      rack.Task.make('io.iocontrol.conf',{ base : conf.base });
      rack.Task.make('loadModels',{ models : conf.models });
    }));

  });

  rackstore.RackIO = plug.Network.blueprint(function(){
    this.use(rackstore.Plug('rackdb'),this.makeName('rackdb'));
  });

  rackstore.RackJS = plug.Network.blueprint(function(){
    this.use(rackstore.Plug('rackdb.require'),this.makeName('rackdb'));
  });

  return rackstore;

}).call(this);
