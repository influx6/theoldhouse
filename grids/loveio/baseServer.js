module.exports = (function(){

  var _ = require('stackq');
  var q = require('quero');
  var path = require('path');
  var grids = require('grids');
  var db = require('db.grid');
  var web = require('web.grid');
  var fs = require('fs.grid');
  var utils = require('utils.grid');
  var dom = require('./domain.js');

  require('quero/adaptors/buffer.js');
  require('quero/adaptors/mongo.js');
  require('quero/adaptors/redis.js');
  require('quero/adaptors/inmemory.js');
  
  var io = { bp: {}, mutators:{}, misc:{} };

  io.bp.IO = grids.Blueprint('io.Server',function(){
    var conf = this.peekConfig();

    dom.Server(conf,function(s,r){
      _.Asserted(s,'configuration does not match expect for server: '+_.Util.toJSON(r));
    });
    
    var sconf = this.getConfigAttr('stream');
    var fconf = this.getConfigAttr('flat');

    var stream = this.pack(db.bp.streamdb(sconf));
    var flat = this.pack(db.bp.flatdb(fconf));

    //method handlers
    var gets = this.pack(web.bp.requestMethod({'method':'get'}));
    var post = this.pack(web.bp.requestMethod({'method':'post'}));
    var put = this.pack(web.bp.requestMethod({'method':'put'}));
    var del = this.pack(web.bp.requestMethod({'method':'delete'}));

    //replies handling
    var homeReply = this.pack(web.bp.webReply({ fn: function(p){
        var req = p.body, res = req.res, url = req.url;
        res.writeHead(200,{'content-type':'text/plain'});
        res.write('Welcome to LoveIO stream!');
        res.end();
    }}));

    var ioReply = this.pack(web.bp.webReply({fn: function(p){
        var req = p.body, res = req.res, url = req.url;
        res.writeHead(200,{'content-type':'text/plain'});
        res.write('only /io request allowed here ');
        res.write(url);
        res.end();
    }}));

    //routes handling
    var home = this.pack(web.bp.webRequest({ url: '/*' })).a(homeReply);
    var ior = this.pack(web.bp.webRequest({ url: '/io/*' })).a(ioReply).a(home,null,'rej');

    var console = this.pack(web.bp.webConsole({}));
    var io = this.pack(web.bp.httpServer(conf)).a(ior).a(console);

  });


  return io;
})();
