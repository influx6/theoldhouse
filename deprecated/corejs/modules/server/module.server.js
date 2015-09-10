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
