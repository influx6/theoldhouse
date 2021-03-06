/*
  Released under the MIT license
*/

var http = require('http'),
    mx = require('routd'),
    url = require('url'),
    engineio = require('engine.io'),
    stacks = require("stackq"),
    resq = require('resourcedjs'),
    fs = require('fs.plug'),
    plug = require("plugd");

var webRequestID = 0x32FFA5656;
var excom = module.exports = plug.Rack.make('web.plug');

excom.registerPlug('http.server',function(){
  var server = http.createServer(this.$closure(function(req,res){
    req.res = res;
    var p = this.Task.make('http.server.request',req);
    req.on('data',p.$emit);
    req.on('end',p.$end);
  }));

  server.on('error',function(e){
    this.Task.make('http.server.errors',{'e': e});
  });

  var done = false;

  this.tasks().on(this.$closure(function(p){
      if(done || stacks.valids.not.exists(p.body)) return;
      var body = p.body, addr = body.addr, port = body.port, fn = body.fn;
      if(stacks.valids.not.exists(port)) return;
      server.listen.call(server,port,addr || '127.0.0.1',fn);
      this.config({'address': addr, 'port': port});
      this.tasks().lock();
      this.tasks().flush();
      p.lock();
      done = true;
  }));

});

excom.registerPlug('engineio.server',function(){
  var by,self = this;
  var server,hs = http.createServer(this.$closure(function(req,res){
    req.res = res;
    if(req.url.substring(1,3) !== by){
      this.Task.make('engineio.server.request',req);
    }
  }));

  hs.on('error',function(e){
    this.Task.make('engineio.server.errors',{'e': e});
  });

  this.pub('io.Up');
  this.on('io.Up',this.$bind(function(){
    server = engineio.attach(hs,this.getConfigAttr('ops'));
    self.config({ httpServer: hs, ioServer: server });
    server.on('connection',function(socket){
      this.Task.make('engineio.socket.request',socket);
    });
  }));

  var done = false;
  this.tasks().on(this.$closure(function(p){
      if(done || stacks.valids.not.exists(p.body)) return;
      var body = p.body, addr = body.addr, port = body.port, fn = body.fn;
      by = body.by || 'io';
      if(stacks.valids.not.exists(port)) return;
      hs.listen.call(hs,port,addr || '127.0.0.1',fn);
      this.config({'address': addr, 'port': port, by: by, ops: body.ops });
      this.tasks().lock();
      this.tasks().flush();
      p.lock();
      this.emit('io.Up',this);
      done = true;
  }));


});

excom.registerPlug('http.request',function(){
  this.tasks().on(this.$closure(function(p){
    var f = this.Reply.make('http.request',p.body);
    p.link(f);
  }));
});

excom.registerPlug('web.router',function(){
  var px = mx.Router.make();

  var routes = this.newTask('route','web.router.route');
  var unroutes = this.newTask('unroute','web.router.unroute');

  var self = this;
  px.on('404',function(c,m,p){
    var t = self.Task.make('404',{
      'req': p,
      'method':p.method.toLowerCase(),
      'map':c,
      'gid': webRequestID
    });
    if(p.taskPacket){
      p.taskPacket.copy(t);
      delete p.taskPacket;
    }
  });

  routes.on(function(p){
    var body = p.body, url = body.url, method = body.method,conf = body.config;
      if(stacks.valids.not.exists(body) || stacks.valids.not.isString(url)) return;
      px.route(url,method,conf);
      px.on(url,function(c,m,p){
        var t = self.Task.make(url,{
          'req': p,
          'method':p.method.toLowerCase(),
          'map':c,
          'gid': webRequestID
        });
        if(p.taskPacket){
          p.taskPacket.copy(t);
          delete p.taskPacket;
        }
      });
  });

  unroutes.on(function(p){
    var body = p.body, url = body.url;
      if(stacks.valids.not.exists(body) || stacks.valids.not.isString(url)) return;
      px.unroute(url);
  });

  this.tasks().on(this.$closure(function(p){
    var req = p.body;
    if(req && req.res){
      req.taskPacket = p;
      px.analyze(req.url,req.method,req);
    }
  }));

});

excom.registerPlug('web.request',function(){

  this.tasks().on(this.$bind(function(p){
    var body = p.body;
      if(body.gid && body.gid == webRequestID){
        var f = this.Reply.from(p,body.method);
        f.config({ secret: 'web.request.root'});
        // f.secret = 'web.request.root';
      }
  }));

  this.on('close',this.$bind(function(){
    this.Task.make('web.router.unroute',{ url: this.id });
  }));
});

excom.registerMutator('checkAndFixUrl',function(d,next,end){
  var body = d.body, model = body.model, url = body.url;
  if(!stacks.valids.isString(url) && stacks.valids.String(model)){
    model = model.replace(/\s+/,'');
    body.url = ['/',model].join('');
  }
  return next(d);
});

excom.registerPlug('web.resources',function(){
  this.config({
    resources: stacks.Storage.make('web.resources.processor'),
    router: mx.Router.make()
  });

  var resd = this.getConfigAttr('resources');
  var rt = this.getConfigAttr('router');

  this.newTask('res.new','web.resources.new');
  this.newTask('res.rm','web.resources.remove');
  this.newTask('res.upd','web.resources.update');
  this.newTask('res.upc','web.resources.custom');

  excom.Mutator('checkAndFixUrl').bind(this.tasks('res.new'));
  excom.Mutator('checkAndFixUrl').bind(this.tasks('res.rm'));

  this.tasks('res.new').on(this.$bind(function(p){
    var b = p.body, model = b.model, url = b.url, conf = b.conf || {};
    if(resd.has(model)) return;
    var r = resq.make(model,conf);
    r.url = url;
    var ut = rt.route(url,null,stacks.Util.extends(conf,{ exactMatch: false }));
    ut.on('open',function(z,g,h){
      var url = z.url;
      return r.request(url,h,g);
    });
    r.ut = ut;
    resd.add(model,r);
  }));

  this.tasks('res.upd').on(this.$bind(function(p){
    var b = p.body, model = b.model, map = b.map;
    if(!resd.has(model) || stacks.valids.not.Object(map)) return;
    return resd.get(model).use(map);
  }));

  this.tasks('res.upc').on(this.$bind(function(p){
    var b = p.body, model = b.model, map = b.map;
    if(!resd.has(model) || stacks.valids.not.Object(map)) return;
    return resd.get(model).useCustom(map);
  }));

  this.tasks('res.rm').on(this.$bind(function(p){
    var b = p.body, model = b.model;
    if(!resd.has(model)) return;
    var r  = resd.get(model);
    rt.unroute(r.url);
    resd.remove(model);
  }));

  this.tasks().on(this.$bind(function(p){
    //we handle the resource request coming in here
    var body = p.body, url = body.url, method = body.method;
    if(stacks.valids.not.exists(url)) return;
    rt.analyze(url,method,p);
  }));


});

excom.registerPoint('web.console',function(q,sm){
  var req = q.body;
  var head = stacks.Util.String(' ','[WebRequest]'.red,'Method:'.grey,req.method.green,','.grey);
  var body = stacks.Util.String(' ','Url:'.grey,req.url.green);
  console.log(head,body);
});

excom.ioConsole = plug.Network.make('io.Console',function(){
  this.use(excom.Plug('http.request','http.server.request'),'io.req');
  this.get('io.req').attachPoint(excom.Point('web.console'),null,'console');
});

excom.registerPlug('web.console',function(){
  this.attachNetwork(excom.ioConsole);
});

excom.ioBasic = plug.Network.blueprint(function(){

  this.use(excom.Plug('http.server','io.server'),'app');
  this.use(excom.Plug('web.console','http.server.request'),'app.console');
  this.use(excom.Plug('web.router','http.server.request'),'app.router');
  this.use(excom.Plug('web.request','/*'),'app.route./*');
  this.use(excom.Plug('web.request','404'),'app.route.404');

  this.get('app.route./*').attachPoint(function(q,sm){
    var req = q.body.req, res = req.res;
      res.writeHead(200);
      return res.end('welcome to /\n');
  },null,'home.all');

  this.get('app.route.404').attachPoint(function(q,sm){
    var req = q.body.req, res = req.res;
      res.writeHead(200);
      return res.end('Sorry 404 to '+req.url+'\n');
  },null,'home.404');

  this.Task.make('web.router.route',{url:'/*'});

});

excom.registerPlug('web.resource',function(){
  if(!this.hasConfigAttr('model')) this.config({ model: 'model'});
  this.config({ resource: resq.make(this.getConfigAttr('model')) });

  var resd = this.getConfigAttr('resource');

  this.newTask('res.use','web.resource.use');
  this.newTask('res.custom','web.resource.custom');

  this.tasks('res.use').on(this.$bind(function(p){
    var b = p.body, model = b.model, map = b.map;
    if(stacks.valids.not.Object(map)) return;
    return resd.use(map);
  }));

  this.tasks('res.custom').on(this.$bind(function(p){
    var b = p.body, model = b.model, map = b.map;
    if(stacks.valids.not.Object(map)) return;
    return resd.useCustom(map);
  }));

  this.tasks().on(this.$bind(function(p){
    //we handle the resource request coming in here
    var body = p.body, url = body.url, method = body.method;
    if(stacks.valids.not.exists(url)) return;
    rt.request(url,method,p);
  }));


});

excom.ioFlat = plug.Network.blueprint(function(){
  this.use(excom.Plug('http.server','io.server'),'app');
  this.use(excom.Plug('web.console','http.server.request'),'app.console');
  this.use(excom.Plug('web.router','http.server.request'),'app.router');
  this.use(excom.Plug('web.request','404'),'app.route.404');
  this.get('app.route.404').attachPoint(function(q,sm){
    var req = q.body.req, res = req.res;
    var words = stacks.Util.String(' ','Http Request:',req.url,"404'ed!");
    res.writeHead(404,{'Content-Type':'text/plain'});
    return res.end(words);
  },null,'home.404');
});

excom.ioStatic = plug.Network.blueprint(function(){
  this.use(excom.Plug('web.request','/static'),'io.request');
  this.use(fs.Plug('io.iodirect'),'io.direct');
});

excom.registerPlug('web.ioServ',function(){
  var wfs = excom.ioStatic('web.fs.ioServ'),
    reqcode = stacks.Util.guid(),
    methods = ['get','post','patch','delete','head'];

  this.attachNetwork(wfs);
  this.networkOut(this.replies());

  this.newTask('conf',this.makeName('conf'));
  this.newSrcReply('ior',reqcode);

  this.replies('ior').on(this.$bind(function(q){
    console.log('request received!',q.message,q.body,q.peekConfig());

  }));

  this.tasks('conf').on(this.$bind(function(q){
    wfs.Task.clone(q,'io.iodirect.conf');
  }));

  this.tasks().on(this.$bind(function(q){
    wfs.Task.clone(q,'/static');
  }));

  this.exposeNetwork().$dot(function(){

    this.get('io.request').attachPoint(this.$bind(function(p){
      var f = this.Task.from(p,'io.iodirect.profile',{ file: p.body.url },reqcode);
      f.config({ req: p.body });
    }),'head','web.head');

    this.get('io.request').attachPoint(this.$bind(function(p){
      var f = this.Task.from(p,'io.iodirect.read',{ file: p.body.url },reqcode);
      f.config({ req: p.body });
    }),'get','web.get');

    this.get('io.request').attachPoint(this.$bind(function(p){
      var f = this.Task.from(p,'io.iodirect.write',{ file: p.body.url },reqcode);
      f.config({ req: p.body });
    }),'post','web.post');

    this.get('io.request').attachPoint(this.$bind(function(p){
      var f = this.Task.from(p,'io.iodirect.remove',{ file: p.body.url },reqcode);
      f.config({ req: p.body });
    }),'delete','web.delete');

    this.get('io.request').attachPoint(this.$bind(function(p){
      var f = this.Task.from(p,'io.iodirect.append',{ file: p.body.url },reqcode);
      f.config({ req: p.body });
    }),'patch','web.patch');

    this.get('io.request').attachPoint(this.$bind(function(p){
      if(stacks.valids.not.contains(p.body,'req')) return;
      var body = p.body, req = body.req, res = req.res;
      var mesg = stacks.Util.String(' ','REQUEST METHOD',stacks.funcs.doubleQuote(req.method),'NOT IMPLEMENTED!');
      if(methods.indexOf(req.method.toLowerCase()) === -1){
        res.writeHead(504); res.end(mesg);
      }
    }),null,'web.track');

  });


});
