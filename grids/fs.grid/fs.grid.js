var _ = require("stackq"),
    fs = require('graceful-fs'),
    path = require('path'),
    grid = require("grids")
    io = module.exports = {};

/*
  Fsplug contains the plug for fs ops and thereby caters for specific fs operations in the plug
  framework
*/


io.misc = {};
io.bp = {};
io.mutators = {};

io.misc.isPathAbsolute = function(file){
 if(_.valids.not.String(file)) return;
 var n = path.normalize(file),
 r = path.resolve(file),
 nr = n.replace(/(.+)([\/|\\])$/,'$1');
 return r === nr;
};

io.misc.profilePath = function(base,file,fz){
  var rf = (io.misc.isPathAbsolute(file) ? file : path.join(base,file)),
    full = fz || path.normalize(path.resolve(base)),
    prf = path.resolve(rf),
    and = prf.replace(full,'&'),
    valid = and.substring(0,1) === '&',
    stat;

    if(valid){
      try{
       stat = fs.statSync(prf);
      }catch(e){
       stat = null;
      }
    };

    return {
       state: valid,
       from: full,
       filePath: file,
       base: base,
       file: prf,
       stat: stat,
    };
};

io.mutators.absoluteValidator = _.ChannelMutators(function(d,next,end){
  if(_.valids.not.contains(d.body,'file')) return;
  d.body.file = d.body.file.replace(/\s+/,'');
  d.body.isAbsolute = io.misc.isPathAbsolute(file);
  return next(d);
});

io.mutators.pathCleaner = _.ChannelMutators(function(d,next,end){
  if(_.valids.not.contains(d.body,'file')) return;
  d.body.file = d.body.file.replace(/\s+/,'');
  return next(d);
});

io.mutators.srcCleaner = _.ChannelMutators(function(d,next,end){
  if(_.valids.not.contains(d.body,'src')) return;
  d.body.file = d.body.src.replace(/\s+/,'');
  return next(d);
});

io.mutators.destCleaner = _.ChannelMutators(function(d,next,end){
  if(_.valids.not.contains(d.body,'dest')) return;
  d.body.file = d.body.dest.replace(/\s+/,'');
  return next(d);
});

io.bp.ioControllable = grid.Blueprint('ioControllable',function(){
  this.newIn('file');
  this.newIn('dir');

  this.newOut('file');
  this.newOut('dir');
});

io.bp.dirRead = grid.Atomic.Blueprint('dir.read',function(){
  io.mutators.pathCleaner.bind(this.in());

  this.in().on(this.$bind(function(p){
    var b = p.body, file = b.file, ps;
    if(_.valids.not.exists(file)) return;
    ps = path.resolve(file);
    if(!fs.existsSync(ps)){
      return this.out('err').Packets.clone(p,new Error(_.Util.String(' ',file,':',ps,' not Found')));
    }

    fs.readdir(ps,this.$bind(function(err,body){
      if(err){ return this.out('err').Packets.clone(p,err);}
      var m = this.out().Packets.make({ f:file, p: ps});
      if(_.valids.List(body)){
        _.enums.each(body,function(e,i,o,fx){
          m.emit({id: e, file: path.resolve(ps,e)}); return fx(null);
        },function(){
          m.end();
        });
      }else{
        m.emit(body);
        m.end();
      }
    }));

  }));
});

io.bp.dirWrite = grid.Atomic.Blueprint('dir.write',function(){
  io.mutators.pathCleaner.bind(this.in());

  this.in().on(this.$bind(function(p){
    var b = p.body, file = b.file, ps;
    if(_.valids.not.exists(file)) return;
    ps = path.resolve(file);
    if(fs.existsSync(ps)){
      return this.out('err').Packets.clone(p,new Error(_.Util.String(' ',file,':',ps,' not Found')));
    }

    fs.mkdir(ps,this.$bind(function(err,body){
      if(err){
        this.out('err').Packets.clone(p,err);
      }
    }));

  }));

});

io.bp.dirDestroy = grid.Atomic.Blueprint('dir.destroy',function(){
  io.mutators.pathCleaner.bind(this.in());

  this.in().on(this.$bind(function(p){
    var b = p.body, file = b.file, ps;
    if(_.valids.not.exists(file)) return;
    ps = path.resolve(file);
    if(!fs.existsSync(ps)){
      return this.out('err').Packets.clone(p,new Error(_.Util.String(' ',file,':',ps,' not Found')));
    }
    fs.rmdir(ps,this.$bind(function(err,body){
      if(err){
        this.out('err').Packets.clone(p,err);
      }
    }));
  }));

});

io.bp.ioProfile = grid.Atomic.Blueprint('io.profile',function(){
  io.mutators.pathCleaner.bind(this.in());
  this.in().on(this.$bind(function(p){
    var b = p.body, file = b.file, ps;
    if(_.valids.not.exists(file)) return;
    ps = path.resolve(file);
    if(!fs.existsSync(ps)){
      return this.out('err').Packets.clone(p,new Error(_.Util.String(' ',file,':',ps,' not Found')));
    }
    fs.exists(ps,this.$bind(function(err,body){
      if(err){
        return this.out('err').Packets.clone(p,err);
      }
      var m = this.out().Packets.make({
        profile: io.misc.profilePath(path.resolve('.',ps)),
        f:file,
        p: ps
      });

      m.end();
    }));

  }));
});

io.bp.ioCheck = grid.Atomic.Blueprint('io.check',function(){
  io.mutators.pathCleaner.bind(this.in());
  this.in().on(this.$bind(function(p){
    var b = p.body, file = b.file, ps;
    if(_.valids.not.exists(file)) return;
    ps = path.resolve(file);
    if(!fs.existsSync(ps)){
      return this.out('err').Packets.clone(p,new Error(_.Util.String(' ',file,':',ps,' not Found')));
    }
    fs.exists(ps,this.$bind(function(err,body){
      if(err){
        return this.out('err').Packets.clone(p,err);
      }
      var m = this.out().Packets.make({ f:file, p: ps});
      m.end();
    }));
  }));
});

io.bp.fileRead = grid.Atomic.Blueprint('file.read',function(){
  io.mutators.pathCleaner.bind(this.in());
  this.in().on(this.$bind(function(p){
    var b = p.body, file = b.file, ps;
    if(_.valids.not.String(file)) return;
    ps = path.resolve(file);

    if(ps === path.resolve('.')){
      return this.out('err').Packets.clone(p,new Error('root directory is not a file'));
    }

    var can = fs.existsSync(file);
    if(can){
      fs.readFile(ps,this.$bind(function(err,body){
        if(err){
          return this.out('err').Packets.clone(p,err);
        }
        var m = this.out().Packets.clone(p);
        m.config({ f: file, p: ps });
        m.emit(body);
        m.end();
      }));
    }else{
      var m = this.out('err').Packets.make(new Error(_.Util.String(' ',file,':',ps,' not Found')));
      m.config({ f: file, p: ps });
    }
  }));
});

io.bp.fileDestroy = grid.Blueprint('file.destroy',function(){
  io.mutators.pathCleaner.bind(this.in());
  this.in().on(this.$bind(function(p){
    var b = p.body, file = b.file, ps;
    if(_.valids.not.String(file)) return;
    ps = path.resolve(file);
    if(ps === path.resolve('.')){
      return this.out('err').Packets.clone(p,new Error('root directory is not a file'));
    }
    if(!fs.existsSync(ps)) {
      return this.out('err').Packets.clone(p,new Error(_.Util.String(' ',file,':',ps,' not Found')));
    }
    fs.unlink(ps,this.$bind(function(err,body){
      if(err){
        return this.out('err').Packets.clone(p,err);
      }
    }));
  }));
});

io.bp.fileWriteNew = grid.Blueprint('file.write.new',function(){
  io.mutators.pathCleaner.bind(this.in());

  this.in().on(this.$bind(function(p){
    var data = [],d = p.body, file = d.file, stream = p.stream();
    if(_.valids.not.String(file)) return;
    var ops = _.funcs.extends({flag:'w'},d.options);
    var ps = path.resolve(file);
    if(ps === path.resolve('.')){
      return this.out('err').Packets.clone(p,new Error('root directory is not a file'));
    }
    stream.on(function(f){
      if(_.valids.isList(f)) data = data.concat(f);
      data.push(f);
    });

    stream.afterEvent('dataEnd',this.$bind(function(){
      fs.writeFile(ps,data.join(''),ops,this.$bind(function(err,d){
        if(err){
          return this.out('err').Packets.clone(p,err);
        }
      }));
    }));

  }));
});

io.bp.fileWriteAppend = grid.Blueprint('file.write.append',function(){
  io.mutators.pathCleaner.bind(this.in());
  this.in().on(this.$bind(function(p){
    var data = [],d = p.body, file = d.file, stream = p.stream();
    if(_.valids.not.String(file)) return;
    var ops = _.funcs.extends({flag:'a'},d.options);
    var ps = path.resolve(file);
    if(ps === path.resolve('.')){
      return this.out('err').Packets.clone(p,new Error('root directory is not a file'));
    }

    stream.on(function(f){
      if(_.valids.isList(f)) data = data.concat(f);
      data.push(f);
    });

    stream.afterEvent('dataEnd',this.$bind(function(){
      fs.appendFile(ps,data.join(''),ops,this.$bind(function(err,d){
        if(err){
          return this.out('err').Packets.clone(p,err);
        }
      }));
    }));

  }));
});

io.bp.ioStat = grid.Blueprint('io.stat',function(){
  io.mutators.pathCleaner.bind(this.in());
  this.in().on(this.$bind(function(p){
    var b = p.body, file = b.file, ps;
    if(_.valids.not.String(file)) return;
    ps = path.resolve(file);
    if(!fs.existsSync(ps)) {
      return this.out('err').Packets.clone(p,new Error(_.Util.String(' ',file,':',ps,' not Found')));
    }
    fs.stat(ps,this.$bind(function(err,body){
      if(err){
        return this.out('err').Packets.clone(p,err);
      }
      var m = this.out().Packets.make({ f:file, p: ps, stat: body});
      m.end();
    }));
  }));
});

io.bp.symlinkRead = grid.Blueprint('symlink.read',function(){
  io.mutators.pathCleaner.bind(this.in());
  this.in().on(this.$bind(function(p){
    var b = p.body, file = b.file, ps;
    if(_.valids.not.String(file)) return;
    ps = path.resolve(file);
    if(!fs.existsSync(ps)) {
      return this.out('err').Packets.clone(p,new Error(_.Util.String(' ',file,':',ps,' not Found')));
    }
    fs.readlink(ps,this.$bind(function(err,body){
      if(err){
        return this.out('err').Packets.clone(p,err);
      }
      var m = this.out().Packets.make({ f:file, p: ps});
      m.emit(body);
      m.end();
    }));
  }));
});

io.bp.symlinkWrite = grid.Blueprint('symlink.write',function(){
  io.mutators.srcCleaner.bind(this.in());
  io.mutators.destCleaner.bind(this.in());
  this.in().on(this.$bind(function(p){
    var b = p.body, src = b.src, dest = b.dest;
    if(_.valids.not.String(src) || _.valids.not.String(dest)) return;
    var ps = path.resolve(src), pd = path.resolve(dest);
    if(!fs.existsSync(ps)) {
      return this.out('err').Packets.clone(p,new Error(_.Util.String(' ',file,':',ps,' not Found')));
    }
    fs.link(ps,pd,this.$bind(function(err,body){
      if(err){
        return this.out('err').Packets.clone(p,err);
      }
      var m = this.out().Packets.make({ f:file, p: ps});
      m.emit(body);
      m.end();
    }));
  }));
});

io.bp.dirControl = grid.Blueprint('dir.control',function(){
    if(!this.hasConfigAttr('base')) this.config({ base: path.resolve('.') });

    var base = this.getConfigAttr('base');
    var nb = path.normalize(base);
    var full = path.resolve(nb);
    this.config({ full: full, nb: nb });


  this.in().on(this.$bind(function(p){
    if(_.valids.not.containsKey(p.body,'file')) return;
    var body = p.body,
        file = body.file,
        profile = io.misc.profilePath(nb,file);

    if(profile.state){
      this.out().Packets.clone(p,profile);
    }
  }));

});

//controllers
io.bp.ioControlReader = io.bp.ioControllable.Blueprint('io.control.reader',function(){
  this.in('dir').on(this.$bind(function(p){
    if(_.valids.not.contains(p.body,'file')) return;
    var f, body = p.body, file = body.file, stat = body.stat;
   
    if(!stat){
      var f = this.out('err').Packets.clone(p,new Error('Unable to profile'+': '+file));
      p.procd = true;
      return;
    }

    if(stat){
      if(stat.isDirectory()){
        f = p.link(this.out('dir').Packets.make({ '$filter': 'dir.read', file: file}));
        f.config(body);
      }
    } 
  }));
  this.in('file').on(this.$bind(function(p){
    if(_.valids.not.contains(p.body,'file')) return;
    var f, body = p.body, file = body.file, stat = body.stat;

    if(!stat && !p.procd){
      var f = this.out('err').Packets.clone(p,new Error('Unable to profile'+': '+file));
      return;
    }

    if(stat){
      if(stat.isFile()){
        f = p.link(this.out('file').Packets.make({ '$filter': 'file.read', file: file }));
        f.config(body);
      }
    } 
  }))
});

io.bp.ioControlWriter = io.bp.ioControllable.Blueprint('io.control.writer',function(){
  this.in('dir').on(this.$bind(function(p){
    if(_.valids.not.contains(p.body,'file')) return;
    var f, body = p.body, file = body.file, stat = body.stat;

    f = p.link(this.out('dir').Packets.make({ '$filter': 'dir.read', file: file}));
    f.config(body);
  }))
  this.in('file').on(this.$bind(function(p){
    if(_.valids.not.contains(p.body,'file')) return;
    var f, body = p.body, file = body.file, stat = body.stat;

    f = p.link(this.out('file').Packets.make({ '$filter': 'file.read', file: file }));
    f.config(body);
  }))
});

io.bp.ioControlAppender = io.bp.ioControllable.Blueprint('io.control.appender',function(){
  this.in('dir').on(this.$bind(function(p){
    if(_.valids.not.contains(p.body,'file')) return;
    var f, body = p.body, file = body.file, stat = body.stat;

    f = p.link(this.out('dir').Packets.make({ '$filter': 'dir.write', file: file}));
    f.config(body);
  }))
  this.in('file').on(this.$bind(function(p){
    if(_.valids.not.contains(p.body,'file')) return;
    var f, body = p.body, file = body.file, stat = body.stat;

    f = p.link(this.out('file').Packets.make({ '$filter': 'file.write.append', file: file }));
    f.config(body);
  }))
});

io.bp.ioControlChecker = io.bp.ioControllable.Blueprint('io.control.checker',function(){
  var proc = function(f){
    return this.$bind(function(p){
      if(_.valids.not.contains(p.body,'file')) return;
      var f, body = p.body, file = body.file, stat = body.stat;

      if(stat){
        if(stat.isDirectory()){
          f = p.link(this.out(f).Packets.make({ '$filter':'io.check', file: file}));
          f.config(body);
        }
      }else{
        this.out('err').Packets.clone(p,new Error('Unable to profile'+': '+file));
      }
    });
  };

  this.in('file').on(proc('file'));
  this.in('dir').on(proc('dir'));
});

io.bp.ioControlProfiler = io.bp.ioControllable.Blueprint('io.control.profiler',function(){
  var proc = function(f){
    return this.$bind(function(p){
      if(_.valids.not.contains(p.body,'file')) return;
      var f, body = p.body, file = body.file, stat = body.stat;

      if(stat){
        if(stat.isDirectory()){
          f = p.link(this.out(f).Packets.make({ '$filter':'io.profile',file: file}));
          f.config(body);
        }
      }else{
        this.out('err').Packets.clone(p,new Error('Unable to profile'+': '+file));
      }
    });
  };

  this.in('file').on(proc('file'));
  this.in('dir').on(proc('dir'));
});

//directors
io.bp.ioCheckDirector = io.bp.ioControllable.Blueprint('ioCheckDirector',function(){
  if(!this.hasConfigAttr('base')) this.config({ 'base': path.resolve('.') });

  var dc = io.bp.dirControl({ base: this.getConfigAttr('base') }),
      rc = io.bp.ioControlChecker({});

  dc.ao(this,'err','err');
  rc.ao(this,'err','err')
  this.ai(dc,null,'file');
  this.ai(dc,null,'dir');

  dc.a(rc,'file');
  dc.a(rc,'dir');

  rc.ao(this,'file','file');
  rc.ao(this,'dir','dir');
});

io.bp.ioProfileDirector = io.bp.ioControllable.Blueprint('ioProfileDirector',function(){
  if(!this.hasConfigAttr('base')) this.config({ 'base': path.resolve('.') });

  var dc = io.bp.dirControl({ base: this.getConfigAttr('base') }),
      rc = io.bp.ioControlProfiler({});

  dc.ao(this,'err','err');
  rc.ao(this,'err','err')
  this.ai(dc,null,'file');
  this.ai(dc,null,'dir');

  dc.a(rc,'file');
  dc.a(rc,'dir');

  rc.ao(this,'file','file');
  rc.ao(this,'dir','dir');
});

io.bp.ioDestroyDirector = io.bp.ioControllable.Blueprint('ioDestroyDirector',function(){
  if(!this.hasConfigAttr('base')) this.config({ 'base': path.resolve('.') });

  var dc = io.bp.dirControl({ base: this.getConfigAttr('base') }),
      rc = io.bp.ioControlDestroyer({});

  dc.ao(this,'err','err');
  rc.ao(this,'err','err')
  this.ai(dc,null,'file');
  this.ai(dc,null,'dir');

  dc.a(rc,'file');
  dc.a(rc,'dir');

  rc.ao(this,'file','file');
  rc.ao(this,'dir','dir');
});

io.bp.ioAppendDirector = io.bp.ioControllable.Blueprint('ioAppendDirector',function(){
  if(!this.hasConfigAttr('base')) this.config({ 'base': path.resolve('.') });

  var dc = io.bp.dirControl({ base: this.getConfigAttr('base') }),
      rc = io.bp.ioControlAppender({});

  this.ai(dc,null,'file');
  this.ai(dc,null,'dir');

  dc.ao(this,'err','err');
  rc.ao(this,'err','err')
  dc.a(rc,'file');
  dc.a(rc,'dir');

  rc.ao(this,'file','file');
  rc.ao(this,'dir','dir');
});

io.bp.ioWriteDirector = io.bp.ioControllable.Blueprint('ioWriteDirector',function(){
  if(!this.hasConfigAttr('base')) this.config({ 'base': path.resolve('.') });

  var dc = io.bp.dirControl({ base: this.getConfigAttr('base') }),
      rc = io.bp.ioControlWriter({});

  dc.ao(this,'err','err');
  rc.ao(this,'err','err')

  this.ai(dc,null,'file');
  this.ai(dc,null,'dir');

  dc.a(rc,'file');
  dc.a(rc,'dir');

  rc.ao(this,'file','file');
  rc.ao(this,'dir','dir');
});

io.bp.ioReadDirector = io.bp.ioControllable.Blueprint('ioReadDirector',function(){
  if(!this.hasConfigAttr('base')) this.config({ 'base': path.resolve('.') });

  var dc = io.bp.dirControl({ base: this.getConfigAttr('base') }),
      rc = io.bp.ioControlReader({});

  dc.ao(this,'err','err');
  rc.ao(this,'err','err')
	
  this.ai(dc,null,'file');
  this.ai(dc,null,'dir');

  dc.a(rc,'file');
  dc.a(rc,'dir');

  rc.ao(this,'file','file');
  rc.ao(this,'dir','dir');
});
