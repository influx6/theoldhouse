module.exports.FileWatcher = (function(core){

    var ts = require('ts').ToolStack,
        util = ts.Util, 
        path = require('path'), fs = require('fs'),
        helper = ts.Helpers.HashMaps,
        keyGen = function keyGen(size,time){
          return Math.round((size * time)/8000000);
        };
    
    core.Modules.FileWatcher = function FileWatcherSetup(){
      return function FileWatcher(channel,facade){
          var app = core.createAppShell(channel,facade);
          app.watchables = {};
          app.ms = 500;
          app.clock = null;

          //basic checkers for ops
          app.watching = false;
          app.rebooting = false;
          app.up = false;
          
          app.cycle = function Cycle(ms){
              if((!this.watching && !this.up) || this.rebooting ) return;

              if(ms) this.ms = ms;

              var self = this;
              this.clock =  util.delay(function(){

                util.eachAsync(self.watchables,function(e,i,o,fn){
                    var localstat = fs.statSync(e.root),
                    key = keyGen(localstat.size,localstat.mtime);
                    if(e.key !== key){ e.fn(); e.key = key; }
                    fn(false);
                },function(err){
                   if(err) return false;
                   self.cycle(self.ms);
                });

              },this.ms);

              return true;
          };

          app.watch = function Watch(name,file,fn){
            if(!fs.existsSync(file)) return;

            var self = this,
                stat = fs.statSync(file), 
                key = keyGen(stat.size,stat.mtime);

            helper.add.call(this.watchables,name,{ key: key, root: path.normalize(file),fn:fn });
          };

          app.bootup = function Bootup(){
            if(this.rebooting) return;

            this.watching = true;
            this.cycle(this.ms);
            this.up = false;
            return true;
          };

          app.reboot = function Reboot(){
            var self = this;

            this.up = this.watching = false;
            this.rebooting = true;

            console.log(this.clock,'rebooting',this.up,this.watching,this.rebooting);

            clearTimeout(this.clock);
            clock = util.delay(function(){
              self.bootup();
              self.rebooting = false;
            },250);
          };

          app.shutdown = function Shutdown(){
            this.isWatching = false; this.isShutdown = true;
            clearTimeout(this.clock);
          };
          
          app.channel.add('watch',function(name,path,fn){
              app.watch(name,path,fn);
          });
          
          app.channel.add('bootup',function(){
            app.bootup.apply(app,arguments);
          });

          app.channel.add('reboot',function(){
            app.reboot.apply(app,arguments);
          });

          app.channel.add('shutdown',function(){
            app.shutdown.apply(app,arguments);
          });

          return app;
      };
    };

});

module.exports.HttpServer = (function(core){
  
  var ts = require('ts').ToolStack,util = ts.Util, http = require('http');
  
  core.Modules.HttpServer = function HttpServerSetup(routes){


     return function HttpServer(channel,facade){
        
        var app = core.createAppShell(channel,facade);
        app.server = http.createServer();

        //user defined status
        app.up = false;

        app.router = function(fn){
            this.routes = fn;
            fn.call(null,this.server);
            return this;
        };

        app.bootup = function(port,ip){
            if(!port) throw new Error("Please supply a port for connection");
            if(!ip) ip = "127.0.0.1";

            var self = this;
            this.server.listen(port,ip,function(){
                self.up = true;
            });
            this.router(this.routes);
            return this;
        };

        app.reboot = function(callback){
            if(!this.up) this.bootup();

            var cb = util.proxy(function(){
                this.bootup();
            },this)
            return this.shutdown(cb);
        };

        app.shutdown = function(callback){
            if(!this.up) return;

            this.server.on('close',callback);
            this.server.removeAllListeners('request');
            this.server.close();
            this.up = false;
            return true;
        };

        app.channel.add('bootup',function(){
            app.bootup.apply(app,arguments);
        });

        app.channel.add('reboot',function(){
            app.reboot.apply(app,arguments);
        });

        app.channel.add('shutdown',function(){
            app.shutdown.apply(app,arguments);
        });

        //initaite app with the routes;
        app.router(routes);

        return app;
    };
  };


});
