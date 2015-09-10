var module = module || { exports: {} };

module.exports.Core = (function(toolstack){
		
    var Core = {},appr = /^app:/,
    //path = mod.path,
    ts = toolstack,
    helpers = toolstack.Helpers.HashMaps,
    util = ts.Util,
    Promise = ts.Promise,
    eutil = ts.Errors;

    ts.ASColors();

    module.exports.Core = Core;

    Core.gpid = util.guid();
    Core.moduleDir = "./modules/";
    Core.appDir = "./apps/";
    Core.Errors = {
      AppError: eutil.createError('AppError'),
      AppRegisterError: eutil.createError('AppRegisterError'),
      ChannelNotifyError: eutil.createError('ChannelNotifyError'),
    };


    Core.Sandbox = function(moduledir,appdir,perms){
            var box = function(){
              this.apps = {};
              this.loaded = {};
              this.gpid = Core.gpid;
              this.pid = util.guid();
              this.up = false;
              this.permissions = Core.Permissions(perms);

              Core.Facade(this);

              //aliases
              this.fc = this.facade;
              this.pm = this.permissions;
            };

            box.fn = box.prototype;
            box.fn.channels = toolstack.MessageAPI(false,100);
            // box.fn.services = toolstack.MessageAPI(false,100);
            box.fn.events = toolstack.Events();
          
            box.fn.moduleDir = moduledir || Core.moduledir;
            box.fn.appDir = appdir || Core.appDir;

            // box.fn.authorizeBox = function(box,perms){
            //   if(!util.isObject(box) || !util.isObject(perms)) return false;

            //   var key = util.guid();
            //   box.coreKey = key;
            //   util.each(perms,function(e,i,o){
            //     this.pm.push(i,key,e);
            //   },this);
            // };

            box.fn.registerApp = function(app,config){
                if(!util.isFunction(app)) throw new Error("Your App must be a function to be called!");
                if(!util.isString(config.name) || this.apps[config.name]) return false;
                
                var self = this,name = config.name,appd;

                if(!util.has(config,'autoboot')) config.autoboot = true;

                this.apps[name] = config;
                //initialize the app with arguments supplied and check for proper methods

                try{

                  // appd = app.apply(null,config.args || []);

                  var key = this.apps[name];
                  key.name = config.name;
                  key.channel = name;
                  key.id = util.guid();

                  this.channels.addChannel(name);
                  // this.services.addChannel(name);
                  
                  key.app = app(key.channel,this.facade);
                  
                  //test the app if 
                  var test = this.channels.getChannel(name);
                  if(!test.exists('bootup') || !test.exists('reboot') || !test.exists('shutdown')) throw new Core.Errors.AppError("App lacks valid channels: { bootup, reboot, shutdown}!",this);

                  //setup permissions,directory and set app as registed
                  if(config.main) key.root = Core.appDir.concat(config.main);
                  // key.permissions = permissions || {};
                  // if(permissions) this.permissions.push(name,permissions);
                  key.registered = true;

      
                  key.statebox = {
                    name: key.name, 
                    key: key.channel, 
                    running: false, 
                    bootargs: (config.bootargs ? (util.isArray(config.bootargs) ? config.bootargs : [config.bootargs]) : []),
                  };

                  this.events.set(name.concat(':bootup'));
                  this.events.set(name.concat(':shutdown'));

                  // this.channels.getChannel(key.channel).add('bootup',function(){
                  //     key.app.bootup.apply(key.app,arguments);
                  // });
                  // this.channels.getChannel(key.channel).add('reboot',function(){
                  //     key.app.reboot.apply(key.app,arguments);
                  // });
                  // this.channels.getChannel(key.channel).add('shutdown',function(){
                  //     key.app.shutdown.apply(key.app,arguments);
                  // });

                  if(config.beforeBoot && util.isFunction(config.beforeBoot))  config.beforeBoot({ 
                    key: key.key,
                    name: key.name,
                    root: key.root, 
                    notify:function(channel,command){
                      var args = util.arranize(arguments);
                      return self.facade.notify.apply(self,[key.name].concat(args));
                    } 
                  });

                }catch(e){
                  //remove the app from the cache
                  delete this.apps[name];
                  //throw error to ensure they know whats wrong
                  // throw e;
                  throw new Core.Errors.AppRegisterError("App does not confirm to core specification, please review \n\t" + e.message);
                  return false;
                };
                
                
                return true;
            };

            box.fn.unregisterApp = function(name){
              if(!util.isString(name) || !this.apps[name]) return false;
              var app,self = this;

              // if(!appr.test(name)) name = 'app:'.concat(name);
              if(this.loaded[name]) delete this.loaded[name];

              this.deBoot(name,function(){
                delete self.apps[name];
                delete self.loaded[name];
                self.channels.removeChannel(name);
                // delete self.permissions[name];
              });

            };


            box.fn.boot = function(onComplete){
              util.eachAsync(this.apps,function(e,i,o,fn){
                  if(!e) return;
                  try{ if(e.autoboot) this.bootApp(i); }catch(e){ fn(e); }
                  fn(false)
              },function(err){
                if(err) throw err;
                this.up = true;
                this.channels.resume();
                if(onComplete) onComplete(this);
              },this);
            };

            box.fn.deBoot = function(onComplete){
              util.eachAsync(this.apps,function(e,i,o,fn){
                  if(!e) return;
                  try{ this.deBootApp(i); }catch(e){ fn(e); }
                  fn(false)
              },function(err){
                if(err) throw err;
                this.up = false;
                this.channels.pause();
                this.channels.flush();
                if(onComplete) onComplete(this);
              },this);
            };

            box.fn.bootApp = function(channel,onComplete){
              // if(!appr.test(channel)) channel = 'app:'.concat(channel);

              var app = helpers.fetch.call(this.apps,channel),
              loadd = helpers.fetch.call(this.loaded,channel);
              //check exisitng and state of app


              if(!app) return false;
              if(!loadd){
                helpers.add.call(this.loaded,channel,app.statebox);
                loadd = helpers.fetch.call(this.loaded,channel);
              }

              if(loadd && loadd.running) return false;


              loadd.running = true;

              console.log('Booting:'.grey.bold,channel.toString().green);
              this.channels.notify.apply(this.channels,[channel,'bootup'].concat(loadd.bootargs));
              this.events.emit(channel.concat(':bootup'));

              if(onComplete && util.isFunction(onComplete)) onComplete.call(null);

              return true;
            };

            box.fn.deBootApp= function(channel,onComplete){
              // if(!appr.test(name)) channel = 'app:'.concat(channel);

              //check exisitng and state of app
              if(!helpers.exists.call(this.apps,channel) || !helpers.exists.call(this.loaded,channel)) return false;

              var app = helpers.fetch.call(this.loaded,channel);
              if(!app.running) return false;

              app.running = false;
              this.channels.notify(channel,'shutdown');
              this.emit(channel.concat(':shutdown'));

              if(onComplete && util.isFunction(onComplete)) onComplete.call(null);

              return true;
            };

            return new box;
    };
      
    Core.createAppShell = function(channel,facade){
      var app  = { 
        key: channel, 
        facade: facade,
        channel: facade.getChannel(channel),
        // services: facade.getService(channel),
      };

      return app;
    };

    //provides a nice facaded for access by modules and apps
    Core.Facade = function(core){
      if(!core || !core.gpid || (core.gpid !== Core.gpid) || (core.facade && core.facade.isCreated)) return false;

      var facade = {};
      util.createProperty(facade,'isCreated',{
          get: function(){ return true },
          set: function(val){ }
      });

      facade.on = util.proxy(core.channels.on,core.channels);
      facade.off = util.proxy(core.channels.off,core.channels);
      facade.registerApp = util.proxy(core.registerApp,core);
      facade.modules = function(){ return Core.Modules; };
      facade.getChannel = util.proxy(core.channels.getChannel,core.channels);

      facade.notify = function(caller,channel,command){
          //verify if it begins with 'app:'
        var args = util.arranize(arguments), 
            caller = args.shift(),
            app = args.shift(), 
            command = args.shift(),
            promise = Promise.create();

          // if(!appr.test(caller)) caller = 'app:'.concat(caller);
          // if(!appr.test(channel)) channel = 'app:'.concat(channel);

          //verify if channel does exists;
          if(!helpers.exists.call(core.apps,channel) || !helpers.exists.call(core.apps,caller)) {
            promise.reject({ err: new Error('Channel or Requester Not in Registery!')});
            return promise.promise();
          }
          
          if(!core.pm.get(app,cable)){ 
            promise.reject({ err: new Error('Permission Not Found!')});
            return promise.promise(); 
          }

          //if permission has no global in it then it will not be accessible to outside
          // in global ,specific channels must be set to true to be usable also,else no
          //request is made in messagepool
          if(!core.pm.get(app,cable,command)){
            promise.reject({ err:new Error('Access Not Allowed!')});
            return promise.promise();
          }


          args.push(promise);

          core.channels.notify.apply(core.channels,[channel,command].concat(args));
          
          if(core.up) core.channels.resume();

          return promise.promise();
      };

      //allows outside controlled by permissions,access to request app state or service
      facade.request = function(){
        var args = util.arranize(arguments), 
            cable = 'global',
            app = args.shift(), 
            command = args.shift(),
            promise = Promise.create();

        if(!helpers.exists.call(core.apps,app)) return false;
        // if(!helpers.exists.call(core.loaded,channel)) return false;

        if(!core.pm.get(app,cable)){ promise.reject({ err: new Error('Permission Not Found!')}); return promise.promise(); }

        //if permission has no global in it then it will not be accessible to outside
        // in global ,specific channels must be set to true to be usable also,else no
        //request is made in messagepool
        if(!core.pm.get(app,cable,command)){ promise.reject({ err:new Error('Access Not Allowed!')}); return promise.promise(); }
        

        args.push(promise);

        core.channels.notify.apply(core.channels,[app,command].concat(args));
        
        if(core.up && core.loaded[app].running) core.channels.resume();

        return promise.promise();

      };

 
      core.facade = facade;
      return true;
    };


    Core.Permissions = function(perm){
        if(perm && !util.isObject(perm)) return;

        var validate_rule = function ruleValidator(o){
          if(!o || !util.isObject(o)) return null;
          var stat = true;
          util.each(o,function(){},null,function(e,i,o){
            if(stat && !util.isBoolean(e)){ stat = false; return true; }
            return false;
          });
          return stat;
        };

        var permissions = { rules: {} };

        permissions.push = function pushPerm(app,perms){
          if(!util.isObject(perms)) return null;
          util.each(perms,function(e,i,o){
            if(!util.isObject(e)) return;
            this.add(app,i,e);
          },this);
        };

        permissions.add = function addPerm(app,target,perms){
          if(perm && !util.isObject(perm)) return false;
          if(!helpers.exists.call(this.rules,app)) helpers.add.call(this.rules,app,{});
          var o = helpers.fetch.call(this.rules,app);
          if(target && perms){
            if(validate_rule(perms)) helpers.add.call(o,target,perms);
          }
        };

        permissions.get = function getPerm(app,target,event){
          var o = helpers.fetch.call(this.rules,app);
          if(!target) return o;
          if(!event) return helpers.fetch.call(o,target);
          return helpers.fetch.call(helpers.fetch.call(o,target),event);
        };

        permissions.approve = function modPerm(app,target,event){
          return this.manage(app,target,event,true);
        };

        permissions.revoke = function revokePerm(app,target,event){
          return this.manage(app,target,event,false);
        };

        permissions.remove = function removePerm(app,target){
          if(!app) return;
          if(!target) return helpers.remove.call(this.rules,app);
          if(target) return helpers.remove.call(helpers.fetch.call(this.rules,app),target);
        };

        permissions.manage = function(app,target,event,state){
          if(!app || !target || !util.isBoolean(state)) return null;
          var o = helpers.fetch.call(this.rules,app);
          if(!o) return null;
          if(!event) return (util.each(helpers.fetch.call(o,target),function(e,i,o){ o[i] = state; },this));
          if(event) return (helpers.fetch.call(o,target)[event] = state);
          return;
        };

        if(perm) permissions.rules = perm;
        return permissions;
    };
      
    Core.Modules = {};

    return Core;
});

