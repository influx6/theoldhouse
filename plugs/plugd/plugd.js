"use strict";

var stacks = require("stackq");
var AllTrue = stacks.funcs.always(true);
var ema = [];
var PSMeta = { task: true, reply: true};
var MessagePicker = function(n){
  return n['message'];
};
var inNext = function(n,e){ return n(); };


var Packets = exports.Packets = stacks.Persisto.extends({
    init: function(id,body,uuid){
      stacks.Asserted(stacks.valids.exists(id),"id is required (id)");
      stacks.Asserted(stacks.valids.exists(body),"body is required (body)");
      this.$super();
      this.message = id;
      this.traces = [];
      this.body = body || {};
      this.uuid = uuid || stacks.Util.guid();
      this.type = 'packet';

      var lock = false, plug, plate;

      this.$secure('locked',function(){ return !!lock; });

      this.$secure('lock',function(){ lock = !lock; });

      this.$secure('fromPlug',function(p){
        if(!Plug.isInstance(p) || plug){ return; }
        plug = p;
      });

      this.$secure('fromPlate',function(p){
        if(!Plate.isInstance(p) || plate){ return; }
        plate = p;
      });

      this.$secure('plug',function(){
        return plug;
      });

      this.$secure('plate',function(){
        return plate;
      });

    },
    toString: function(){
      return [this.message,this.uuid,this.type].join(':');
    }
  },{
    isPacket: function(p){
      return Packets.instanceBelongs(p);
    },
    isTask: function(p){
      return TaskPackets.isInstance(p);
    },
    isReply: function(p){
      return ReplyPackets.isInstance(p);
    },
}).muxin({});

var TaskPackets = exports.TaskPackets = Packets.extends({
    init: function(){
      this.$super.apply(this,arguments);
      this.type ='task';
    }
  },{
  from: function(p,m,b,u){
    if(!Packets.isReply(p)){ return;}
    var pp = TaskPackets.make(m || p.message,b || p.body,u || p.uuid);
    var puid = (p.body.puid || (p.Meta && p.Meta.b ? p.Meta.b.puid : null));
    pp.Meta = { m: p.message, b: p.body, puid: puid  };
    if(p.Meta) pp.Meta.Meta = p.Meta;
    pp.config(p.peekConfig());
    return pp;
  },
  clone: function(p,m,b,u){
    if(!Packets.isTask(p)){ return; }
    var tc = TaskPackets.make(m,b || p.body,u || p.uuid);
    var puid = (p.body.puid || (p.Meta && p.Meta.b ? p.Meta.b.puid : null));
    tc.Meta = { m: p.message, b: p.body, puid: puid };
    if(p.Meta) tc.Meta.Meta = p.Meta;
    tc.config(p.peekConfig());
    p.link(tc);
    return tc;
  },
  proxy: function(fx){
    return {
      make: function(){
        var f = TaskPackets.make.apply(TaskPackets,arguments);
        if(stacks.valids.Function(fx)) fx.call(f,f);
        return f;
      },
      clone: function(){
        var f = TaskPackets.clone.apply(TaskPackets,arguments);
        if(stacks.valids.Function(fx)) fx.call(f,f);
        return f;
      },
      from: function(){
        var f = TaskPackets.from.apply(TaskPackets,arguments);
        if(stacks.valids.Function(fx)) fx.call(f,f);
        return f;
      }
    };
  }
});

var ReplyPackets = exports.ReplyPackets = Packets.extends({
    init: function(){
      this.$super.apply(this,arguments);
      this.type ='reply';
    }
  },{
  from: function(p,m,b,u){
    if(!Packets.isTask(p)){ return;}
    var pp = ReplyPackets.make(m || p.uuid,b || p.body,u);
    var puid = (p.body.puid || (p.Meta && p.Meta.b ? p.Meta.b.puid : null));
    pp.Meta = { m: p.message, b: p.body, puid: puid  };
    if(p.Meta) pp.Meta.Meta = p.Meta;
    pp.config(p.peekConfig());
    return pp;
  },
  clone: function(p,m,b,u){
    if(!Packets.isReply(p)){ return; }
    var tc = ReplyPackets.make(m,b || p.body,u || p.uuid);
    var puid = (p.body.puid || (p.Meta && p.Meta.b ? p.Meta.b.puid : null));
    tc.Meta = { m: p.message, b: p.body, puid: puid };
    if(p.Meta) tc.Meta.Meta = p.Meta;
    tc.config(p.peekConfig());
    p.link(tc);
    return tc;
  },
  proxy: function(fx){
    return {
      make: function(){
        var f = ReplyPackets.make.apply(ReplyPackets,arguments);
        if(stacks.valids.Function(fx)) fx.call(f,f);
        return f;
      },
      clone: function(){
        var f = ReplyPackets.clone.apply(ReplyPackets,arguments);
        if(stacks.valids.Function(fx)) fx.call(f,f);
        return f;
      },
      from: function(){
        var f = ReplyPackets.from.apply(ReplyPackets,arguments);
        if(stacks.valids.Function(fx)) fx.call(f,f);
        return f;
      }
    };
  }
});

var Store = exports.Store = stacks.Store;

var SelectedChannel = exports.SelectedChannel = stacks.FilteredChannel.extends({
  init: function(id,picker,fx){
    this.$super(id,picker || MessagePicker);
    this.lockTasks = stacks.Switch();
    this.lockSwitch = stacks.Proxy(this.$bind(function(f,next,end){
      if(!Packets.isPacket(f)) return;
      f.lock();
      return next();
    }));
    this.lockproxy = stacks.Proxy(this.$bind(function(f,next,end){
      if(!Packets.isPacket(f)){ return; };
      if(this.taskLocking() && f.locked()){ return; };
      return next();
    }));

    this.mutts.add(function(f,next,end){
      if(!Packets.isPacket(f)) return;
      return next();
    });

    if(stacks.valids.Function(fx)) fx.call(this);

    this.mutts.add(this.lockproxy.proxy);

    // var bindings = {};
    //
    // this.bindOut = this.$bind(function(chan){
    //   if(!SelectedChannel.instanceBelongs(chan) || stacks.valids.contains(bindings,chan.GUUID)) return;
    //
    //   bindings[chan.GUUID] = {
    //      out: this.stream(chan),
    //      in: { unstream: function(){}}
    //   };
    // });
    //
    // this.bindIn = this.$bind(function(chan){
    //   if(!SelectedChannel.instanceBelongs(chan) || stacks.valids.contains(bindings,chan.GUUID)) return;
    //   bindings[chan.GUUID] = {
    //      in: chan.stream(this),
    //      out: { unstream: function(){}}
    //   };
    // });
    //
    // this.unbind = this.$bind(function(chan){
    //   if(!SelectedChannel.instanceBelongs(chan) || stacks.valids.not.contains(bindings,chan.GUUID)) return;
    //   var p = this.bindings[chan.GUUID];
    //   p.in.unstream(); p.out.unstream();
    // });
    //
    // this.unbindAllChannel = this.$bind(function(chan){
    //   stacks.enums.each(bindings,function(e,i,o,fn){
    //     if(chan && i === chan.GUUID) return fn(null);
    //     e.in.unstream(); e.out.unstream();
    //     return fn(null);
    //   });
    // });
  },
  enableLocking: function(){
    this.mutate(this.lockSwitch.proxy);
  },
  disableLocking: function(){
    this.unmutate(this.lockSwitch.proxy);
  },
  enlock: function(){ this.lockTasks.on(); },
  dislock: function(){ this.lockTasks.off(); },
  taskLocking: function(){ return this.lockTasks.isOn(); },
  mutate: function(fn){
    this.mutts.add(fn);
  },
  unmutate: function(fn){
    this.mutts.remove(fn);
  },
});

var TaskChannel = exports.TaskChannel = SelectedChannel.extends({
  init: function(id,picker){
    this.$super(id,picker || MessagePicker,function(){
      this.mutts.add(function(f,next,end){
        if(!Packets.isTask(f)) return;
        return next();
      });
    });
    // this.enableLocking();
  },
});

var ReplyChannel = exports.ReplyChannel = SelectedChannel.extends({
  init: function(id,picker){
    this.$super(id,picker || MessagePicker,function(){
      this.mutts.add(function(f,next,end){
        if(!Packets.isReply(f)) return;
        return next();
      });
    });
  }
});

var ChannelStore = exports.ChannelStore = stacks.Configurable.extends({
  init: function(id){
    this.$super();
    this.id = id;
    this.taskStore = Store.make('taskStorage');
    this.replyStore = Store.make('replyStorage');
  },
  task: function(id){
    return this.taskStore.get(id);
  },
  reply: function(id){
    return this.replyStore.get(id);
  },
}).muxin({
  newTask: function(id,tag,picker){
    stacks.Asserted(arguments.length  > 0,'please supply the id, tag for the channel');
    if(arguments.length === 1){
      stacks.Asserted(stacks.valids.isString(id),'key for the channel must be a string')
    }
    if(arguments.length == 1 && stacks.valids.isString(id)){ tag = id; }
    var task = TaskChannel.make(tag,picker);
    this.taskStore.add(id,task);
    return function(fn){
      if(stacks.valids.Function(fn)) fn.call(task,task);
      return task;
    };
  },
  newReply: function(id,tag,picker){
    stacks.Asserted(arguments.length  > 0,'please supply the id, tag for the channel');
    if(arguments.length === 1){
      stacks.Asserted(stacks.valids.isString(id),'key for the channel must be a string')
    }
    if(arguments.length == 1 && stacks.valids.isString(id)){ tag = id; }
    var reply = ReplyChannel.make(tag,picker);
    this.replyStore.add(id,reply);
    return function(fn){
      if(stacks.valids.Function(fn)) fn.call(reply,reply);
      return reply;
    };
  },
  tweakReplies: function(fc,fcc){
    return this.replyStore.each(function(e,i,o,fx){
      if(stacks.valids.Function(fc)) fc.call(e,e,i);
      fx(null);
    },fcc)
  },
  tweakTasks: function(fc,fcc){
    return this.taskStore.each(function(e,i,o,fx){
      if(stacks.valids.Function(fc)) fc.call(e,e,i);
      fx(null);
    },fcc)
  },
  pauseTask: function(id){
    var t = this.task(id);
    if(t) t.pause();
  },
  resumeTask: function(id){
    var t = this.task(id);
    if(t) t.resume();
  },
  pauseReply: function(id){
    var t = this.reply(id);
    if(t) t.pause();
  },
  resumeReply: function(id){
    var t = this.reply(id);
    if(t) t.resume();
  },
  resumeAllTasks: function(fx){
    this.tweakTasks(function resumer(f){ f.resume(); },fx);
  },
  pauseAllTasks: function(fx){
    this.tweakTasks(function pauser(f){ f.pause(); },fx);
  },
  resumeAllReplies: function(fx){
    this.tweakReplies(function resumer(f){ f.resume(); },fx);
  },
  pauseAllReplies: function(fx){
    this.tweakReplies(function pauser(f){ f.pause(); },fx);
  },
});

var Plug = exports.Plug = stacks.Configurable.extends({
  init: function(id,conf,fn){
    stacks.Asserted(stacks.valids.String(id),'first argument be a stringed "id" for the plug');
    this.$super();

    if(stacks.valids.String(conf)) conf = { filter: conf };
    this.config(conf);

    var self = this,bindings = [],network,plate,plateNetwork;
    var filter = this.getConfigAttr('filter');

    this.id = id
    this.gid = this.getConfigAttr('gid') || this.id;

    this.idProxy = stacks.Proxy(this.$bind(function(d,n,e){
      if(Packets.isPacket(d)){
        d.traces.push(this.GUUID);
      }
      return n();
    }));
    this.leaked = stacks.Switch();
    this.points = Store.make('points',stacks.funcs.identity);
    this.channelStore = ChannelStore.make(this.gid || this.id);

    this.makeName = this.$bind(function(sn){
      if(stacks.valids.not.String(sn)){ return; }
      var m;
      if(stacks.valids.String(this.id)) m = this.id;
      else m = this.gid;
      return [m,sn].join('.');
    });

    this.pub('boot');
    this.pub('networkAttached');
    this.pub('networkDetached');
    this.pub('attachPlate');
    this.pub('detachPlate');
    this.pub('release');

    this.Reply = ReplyPackets.proxy(function(){
      self.emitPacket(this);
    });
    this.Task = TaskPackets.proxy(function(){
      self.emitPacket(this);
    });

    this.store = this.$bind(function(){ return this.channelStore; });
    this.isAttached = this.$closure(function(){
      return plate != null;
    });

    this.hasNetwork = this.$closure(function(){
      return network != null;
    });

    this.attachPlate = this.$closure(function(pl,net){
      if(this.isAttached() || !Plate.isInstance(pl)) return;
      plate = pl;
      plateNetwork = net;
      this.emit('attachPlate',pl,net);
    });

    this.detachPlate = this.$closure(function(){
      this.emit('detachPlate',plate,net);
      this.destoryBindings();
      plate = plateNetwork = null;
    });

    this.$secure('dispatch',function (t) {
      if(!this.isAttached() || !Packets.isPacket(t)) return;
      t.fromPlug(t);
      plate.dispatch(t);
    });

    this.$secure('dispatchReply',function (t) {
      if(!Packets.isPacket(t)) return;
      t.fromPlug(t);
      this.replyChannel.emit(t);
    });

    this.afterPlate = this.$closure(function(fn){
      if(!this.isAttached()){
        return this.afterOnce('attachPlate',this.$bind(function(f){
            return fn.call(this,plate,plateNetwork);
        }));
      }
      return (stacks.valids.isFunction(fn) ? fn.call(this,plate,plateNetwork) : null);
    });

    this.destoryBindings = this.$bind(function(){
      stacks.enums.each(bindings,function(e,i,o,fn){
        e.unstream();
        fn(null);
      },function(){
        bindings.length = 0;
      });
    });

    this.newTask = this.$bind(function(id,tag,picker){
      return this.channelStore.newTask(id,tag,picker)(this.$bind(function(tk){
        this.afterPlate(function(pl){
          var br = pl.channel.stream(tk);
          bindings.push(br);
          tk.mutate(this.idProxy.proxy);
          tk.enlock();
        });
      }));
    });

    this.newSrcReply = this.$bind(function(id,tag,picker){
      return this.channelStore.newReply(id,tag,picker)(this.$bind(function(tk){
        this.afterPlate(function(pl){
          var br = pl.channel.stream(tk);
          // var br = tk.stream(pl.channel);
          bindings.push(br);
          tk.mutate(this.idProxy.proxy);
        });
      }));
    });

    this.newReply = this.$bind(function(id,tag,picker){
      return this.channelStore.newReply(id,tag,picker)(this.$bind(function(tk){
        this.afterPlate(function(pl){
          var br = tk.stream(pl.channel);
          bindings.push(br);
          tk.mutate(this.idProxy.proxy);
        });
      }));
    });

    this.attachNetwork = this.$bind(function(net){
      if(!Network.isInstance(net) || this.hasNetwork()) return;
      network = net;
      this.emit('networkAttached',net);
      this.withNetwork(this.tasks(),this.replies());

    });

    this.networkAttached = this.$bind(function(){
      return network !== null;
    });

    this.detachNetwork = this.$bind(function(){
      if(!this.hasNetwork()) return;
      this.tasks().unbind(network.plate.channel);
      network = null;
      this.emit('networkDetached',net);
    });

    this.networkOut = this.$bind(function(chan){
      if(!SelectedChannel.instanceBelongs(chan)) return;
      this.afterOnce('networkAttached',function(net){
        if(network){
          network.bindOut(chan);
        }
      });
      this.afterOnce('networkDetached',function(net){
        if(network){
          network.unbind(chan);
        }
      });
    });

    this.networkIn = this.$bind(function(chan){
      if(!SelectedChannel.instanceBelongs(chan)) return;

      this.afterOnce('networkAttached',function(net){
        if(network){
          network.bindIn(chan);
        }
      });
      this.afterOnce('networkDetached',function(net){
        if(network){
          network.unbind(chan);
        }
      });
    });

    this.withNetwork = this.$bind(function(chan,xchan){
      this.networkIn(chan);
      this.networkOut(xchan);
    });

    this.exposeNetwork = this.$bind(function(fx){
      if(stacks.valids.Function(fx)) fx.call(network);
      return network;
    });

    this.leakNetworkOp = this.$bind(function(fn,fnx){
      return this.afterPlate(function(){
        this.afterOnce('networkAttached',this.$bind(function(){
          return (stacks.valids.Function(fn) ? fn.call(this) : null);
        }));
        this.afterOnce('networkDetached',this.$bind(function(){
          return (stacks.valids.Function(fnx) ? fnx.call(this) : null);
        }));
      });
    });

    this.leakNetwork = this.$bind(function(){
      this.afterPlate(function(){
        this.leakNetworkTo(plateNetwork);
      });
    });

    this.unleakNetwork = this.$bind(function(){
      this.afterPlate(function(){
        this.unleakNetworkTo(plateNetwork);
      });
    });

    this.isLeaked = this.$bind(function(){
      return this.leaked.isOn();
    });

    this.leakNetworkTo = this.$bind(function(net){
      if(!Network.instanceBelongs(net)) return;
      this.leakNetworkOp(function(){
        this.leaked.on();
        this.exposeNetwork().flux.connect(net);
      },function(){
        if(this.exposeNetwork().flux().size <= 0) this.leaked.off();
        this.exposeNetwork().flux.disconnect(net);
      });
    });

    this.unleakNetworkTo = this.$bind(function(net){
      if(!Network.instanceBelongs(net)) return;
      this.leakNetworkOp(function(){
        this.exposeNetwork().flux.disconnect(net);
      });
    });


    //instance variables
    this.channel = this.newTask('core',filter || this.id);
    this.replyChannel = this.newReply('core',stacks.funcs.always(true));

    // this.channel.enableLocking();
    this.channel.enlock();

    this.$rack(fn);
  },
  changeContract: function(n){
    this.channel.changeContract(n);
  },
  replies: function(f){
    f = stacks.valids.isString(f) ? f : 'core';
    return this.channelStore.reply(f);
  },
  tasks: function(f){
    f = stacks.valids.isString(f) ? f : 'core';
    return this.channelStore.task(f);
  },
  point: function(alias){
    return this.points.Q(alias);
  },
  attachPoint: function(fn,filter,alias,rp,picker){
    stacks.Asserted(stacks.valids.String(alias),'please supply a id for tagging');
    if(this.points.has(alias)) return;
    var pt = Point(fn,filter,picker)(this);
    pt.feed(this.replies(rp));
    this.points.add(alias,pt);
    return pt;
  },
  detachPoint: function(item){
    if(stacks.valids.isString(item) && this.points.has(item)){
      var pt = this.points.Q(item);
      if(stacks.valids.isFunction(pt.close)) pt.close();
      this.points.remove(item);
      return pt;
    };
    if(stacks.valids.isObject(item)){
      var self = this;
      this.points.each(function(f,i,o,fn){
        if(f == item){
          if(stacks.valids.isFunction(f.close)) f.close();
          self.points.remove(i);
          return fn(true);
        }
      });
      return item;
    }
  },
  detachAllPoint: function(){
    this.points.each(function(f,i,o,fn){
      if(stacks.valids.isFunction(f.close)) f.close();
      return fn(true);
    });
  },
  attachPlug: function(plug,transform,filter){
    if(!Plug.instanceBelongs(plug)) return;
    var transfilter;
    if(stacks.valids.String(transform)){
      transfilter = Point.Reply2Task(transform,plug);
    }
    if(stacks.valids.Function(transform)){
      transfilter = transform;
    }
    var point = this.attachPoint(transfilter,filter,plug.GUUID);
    point.plug(plug);
    return point;
  },
  detachPlug: function(plug){
    if(Plug.instanceBelongs(plug)){
      return this.detachPoint(plug.GUUID);
    }
    if(stacks.valids.String(plug)){
      return this.detachPoint(plug);
    }
  },
  release: function(){
    this.detachPlate();
    this.emit('release',this);
  },
  close: function(){
    this.$super();
    this.emit('close',this);
    this.release();
    this.detachAllPoint();
  },
  emitPacket: function (p){
    if(Packets.isTask(p)) this.dispatch(p);
    if(Packets.isReply(p)) this.dispatchReply(p);
    return p;
  },
});

var Plate = exports.Plate = stacks.Configurable.extends({
  init: function(id) {
    var self = this;
    this.$super();
    this.id = id;
    this.configs.add('id',id);

    this.points = Store.make('points',stacks.funcs.identity);

    this.proxy = stacks.Proxy(function(){
      return true;
    });

    this.proxyBlock = stacks.Proxy(this.$bind(function(p,next,end){
      if(!Packets.isPacket(p)) return;
      if(p.locked() && p.plate() !== this) return;
      if(p.traces.indexOf(this.GUUID) !== -1) return;
      p.traces.push(this.GUUID);
      return next();
    }));

    this.channel = SelectedChannel.make(this.proxy.proxy);
    this.channel.mutate(this.proxyBlock.proxy);

    this.bindIn = stacks.funcs.bind(this.channel.bindIn,this.channel);
    this.bindOut = stacks.funcs.bind(this.channel.bindOut,this.channel);
    this.unbind = stacks.funcs.bind(this.channel.unbind,this.channel);

    this.pub('boot');
    this.pub('shutdown');

    var self = this;
    this.Reply = ReplyPackets.proxy(function(){
      self.emitPacket(this);
    });

    this.Task = TaskPackets.proxy(function(){
      self.emitPacket(this);
    });

    this.makeName = this.$bind(function(sn){
      if(stacks.valids.not.String(sn)){ return; }
      return [this.id,sn].join('.');
    });

    this.$secure('dispatch',function(f){
      if(!Packets.isPacket(f)) return;
      f.fromPlate(this);
      this.channel.emit(f);
    });
  },
  changeContract: function(n){
    this.channel.changeContract(n);
  },
  share: function(plate){
    if(!Plate.isInstance(plate)) return;
    this.channel.bindIn(plate.channel);
  },
  unshare: function(plate){
    if(!Plate.isInstance(plate)) return;
    this.channel.unbind(plate.channel);
  },
  plug: function(id,gid,fn){
    return new Plug(id,gid,fn)
  },
  tasks: function(){ return this.channel; },
  hookproxy: function(c){
    c.watch = stacks.funcs.bind(this.watch,this);
    c.emitWatch = stacks.funcs.bind(this.emitWatch,this);
    c.emitPacket = stacks.funcs.bind(this.emitPacket,this);
    c.makeName = stacks.funcs.bind(this.makeName,this);
    c.changeContract = stacks.funcs.bind(this.switchFilter,this);
    c.plugQueue = stacks.funcs.bind(this.plugQueue,this);
    c.tasks = stacks.funcs.bind(this.tasks,this);
    c.dispatch = stacks.funcs.bind(this.dispatch,this);
    c.bindIn = stacks.funcs.bind(this.bindIn,this);
    c.bindOut = stacks.funcs.bind(this.bindOut,this);
    c.unbind = stacks.funcs.bind(this.unbind,this);
    c.share = stacks.funcs.bind(this.share,this);
    c.unshare = stacks.funcs.bind(this.unshare,this);
  },
  point: function(alias){
    return this.points.Q(alias);
  },
  attachPoint: function(fn,filter,alias,k){
    stacks.Asserted(stacks.valids.String(alias),'please supply a id for tagging');
    if(this.points.has(alias)) return;
    var pt = Point(fn,filter,k)(this);
    pt.feed(this.tasks());
    this.points.add(alias,pt);
    return pt;
  },
  detachPoint: function(item){
    if(stacks.valids.isString(item) && this.points.has(item)){
      var pt = this.points.Q(item);
      if(stacks.valids.isFunction(pt.close)) pt.close();
      this.points.remove(item);
      return pt;
    };
    if(stacks.valids.isObject(item)){
      var self = this;
      this.points.each(function(f,i,o,fn){
        if(f == item){
          if(stacks.valids.isFunction(f.close)) f.close();
          self.points.remove(i);
          return fn(true);
        }
      });
      return item;
    }
  },
  plugQueue: function(){
    return new PlugQueue(this);
  },
  watch: function(uuid,mp){
    var channel = SelectedChannel.make(uuid,mp);
    this.channel.subscriber = this.channel.stream(channel);
    return channel;
  },
  emitPacket: function (p){
    this.dispatch(p);
    return p;
  },
  emitWatch: function(t){
    if(!Packets.isTask(t)) return;
    var mw = this.watch(t.uuid);
    mw.task = t;
    this.emitPacket(t);
    return mw;
  },
});

var PlugQueue = exports.PlugQueue = stacks.Class({
  init: function(pl){
    stacks.Asserted(stacks.valids.isInstanceOf(pl,Plate),"argument must be an instance of plate");
    this.plate = pl;
    this.typeList = {};
    this.wq = stacks.WorkQueue();
    this.active = stacks.Switch();

    this.onDone = stacks.funcs.bind(this.wq.done.add,this.wq.done);
    this.onDoneOnce = stacks.funcs.bind(this.wq.done.addOnce,this.wq.done);
    this.offDone = stacks.funcs.bind(this.wq.done.add,this.wq.done);
  },
  peek: function(fn){
    this.wq.queue(fn);
  },
  queue: function(name,uuid){
    var self = this,
    guid = uuid || [name,stacks.Util.guid()].join(':'),
    chan = this.plate.watch(guid);
    chan.__guid = guid;

    if(this.typeList[guid]) return guid;

    this.typeList[guid] = ({
      'plug':name,
      'uuid': guid,
      'index': this.typeList.length,
      'watch':chan,
      'fn': stacks.funcs.bind(function(f){
        return this.plate.dispatchMessage(name,guid,f);
      },self)
    });

    return chan;
  },
  unqueue: function(pl){
    if(!this.has(pl)) return null;
    this.typeList[pl] = null;
  },
  has: function(n){
    return !!this.typeList[n];
  },
  __pack: function(){
    var self = this,e,m;
    for(m in this.typeList){
      e = this.typeList[m];
      if(stacks.Valids.notExists(e)) return;
      var plug = e['plug'],fn = e['fn'], chan = e['watch'];
      chan.once(function(f){ self.emit(f); });
      self.wq.queue(fn);
    };
    self.wq.queue(function(f){
      self.active.off();
    });
  },
  emit: function(f){
    if(!this.active.isOn()) this.__pack();
    this.active.on();
    return this.wq.emit(f);
  }
});

var Point = exports.Point = function(fx,filter,picker){
  if(!stacks.valids.isFunction(fx)) return;
  return stacks.MutateBy(function(fn,src,dests){
    if(!Plug.instanceBelongs(src) && !Plate.instanceBelongs(src)) return;

    var self = this;
    var stm = stacks.Stream.make();
    var bindings = {};
    var contract = stacks.Contract(filter || "*",picker || MessagePicker);
    var handle = this.bind(function(r){
      return fn.call(this,r);
    });
    var contractHandle = stacks.funcs.bind(function(f){
      return this.interogate(f);
    },contract);

    contract.onPass(handle);

    stacks.enums.each(dests,function(e,i,o,ff){
      if(Plug.instanceBelongs(e)) self.plug(e);
      if(Plate.instanceBelongs(e)) self.plate(e);
      return ff(null);
    });

    this.UUID = stacks.Util.guid();

    this.Reply = ReplyPackets.proxy(function(){
      return stm.emit(this);
    });

    this.Task = TaskPackets.proxy(function(){
      return stm.emit(this);
    });

    this.srcReply = ReplyPackets.proxy(function(){
      return src.emitPacket(this);
    });

    this.srcTask = TaskPackets.proxy(function(){
      return src.emitPacket(this);
    });

    this.secureLock('feed',function(sm){
      if(!stacks.Stream.instanceBelongs(sm)) return;
      sm.on(contractHandle);
    });

    this.secure('close',function(){
      src.replyChannel.off(contractHandle);
      return stm.close();
    });

    this.secureLock('unplug',function(plug){
      if(!Plug.instanceBelongs(plug)) return;
      this.unstream(plug.channel);
    });

    this.secureLock('unplate',function(plate){
      if(!Plate.instanceBelongs(plate)) return;
      this.unstream(plate.channel);
    });

    this.secureLock('plug',function(plug){
      if(!Plug.instanceBelongs(plug)) return;
      this.stream(plug.channel);
    });

    this.secureLock('plate',function(plate){
      if(!Plate.instanceBelongs(plate)) return;
      this.stream(plate.channel);
    });

    this.secure('emit',function(f){
      return stm.emit(n);
    });

    this.secure('stream',function(sm){
      stacks.Asserted(stacks.Streams.instanceBelongs(sm),'pass the streamable first');
      bindings[sm.GUUID] = stm.stream(sm);
    });

    this.secure('unstream',function(sm){
      stacks.Asserted(stacks.Streams.instanceBelongs(sm),'pass the streamable first');
      if(bindings[sm.GUUID]){
        bindings[sm.GUUID].unstream();
        delete bindings[sm.GUUID];
      }
    });

    this.secure('mux',function(fn){
      stm.transformAsync(fn);
    });

    this.secure('tap',function(fn,name){
      if(stacks.valids.isString(name)) return stm.onEvent(name,fn);
      stm.on(fn);
    });

    this.secure('untap',function(fn,name){
      if(stacks.valids.isString(name)) return stm.onEvent(name,fn);
      stm.on(fn);
    });

    // this.lock();
  },fx);
};

Point.Reply2Task = function(key,plug){
 return function(p,sm){
   if(!ReplyPackets.instanceBelongs(p)) return;
   var f = this.Task.from(p,key);
   f.config(p.body);
   p.link(f);
 };
};

var PlugStore = exports.PlugStore = Store.extends({
  init: function(id){
    this.$super(id,function(fn){
      var rest = stacks.enums.rest(arguments);
      var plug = Plug.make.apply(Plug,[fn.sid].concat(rest));
      fn.call(plug);
      return plug;
    });
  }
});

var AdapterStore = exports.AdapterStore = Store.extends({
  init: function(id){
    this.$super(id,function(fn,sid,fx){
      var rest = stacks.enums.rest(arguments);
      var ad = Adapters.apply(null,rest);
      fn.call(ad);
      return ad;
    });
  }
});

var Adapters = exports.Adapters = function(){
  var dist = stacks.Distributors();
  var mux = stacks.Middleware(_.funcs.bind(_.funcs.bind(dist.distribute,dist)));
  var fx = _.funcs.bind(mux.emit,mux);
  var apt = { mux: mux, rack: dist, };

  stacks.funcs.selfReturn(apt,'from',function(chan){
    stacks.Asserted(SelectedChannel.instanceBelongs(chan),'argument must be a channel instance');
    this.channel = chan;
    this.channel.on(fx);
  });

  stacks.funcs.selfReturn(apt,'detach',function(){
    this.channel.off(fx);
    this.channel = null;
  });

  stacks.funcs.selfReturn(apt,'muxate',function(fn){
    mux.add(fn);
  });

  stacks.funcs.selfReturn(apt,'out',function(fn){
    dist.add(fn);
  });

  stacks.funcs.selfReturn(apt,'outOnce',function(fn){
    dist.addOnce(fn);
  });

  stacks.funcs.selfReturn(apt,'unOut',function(fn){
    dist.remove(fn);
  });

  return apt;
};

var Mutators = exports.Mutators = function(fx){
  var channels = [], freed = [];
  return {
    bind: function(chan){
      if(stacks.valids.not.exists(chan)) return;
      if(this.has(chan)) return;
      chan.mutate(fx);
      var free = freed.pop();
      if(free) channels[free] = chan;
      else channels.push(chan);
    },
    unbind: function(chan){
      if(stacks.valids.not.exists(chan)) return;
      if(!this.has(chan)) return;
      chan.unmutate(fx);
      var ind = this.index(chan);
      channels[ind] = null;
      freed.push(ind);
    },
    unbindAll: function(exc){
      stacks.enums.each(channels,function(e){
        if(exc && e === exc) return;
        this.unbind(e);
      },null,this);
    },
    has: function(chan){
      return this.index(chan) !== -1;
    },
    index: function(chan){
      return channels.indexOf(chan);
    }
  }
};

var RackSpace = exports.RackSpace = stacks.Configurable.extends({
  init: function(id){
    stacks.Asserted(stacks.valids.isString(id),'an "id" of string type is required ');
    this.$super();
    this.id = id;
    this.racks = stacks.Storage.make('rackspace');
  },
  has: function(ns){
    return this.racks.has(ns);
  },
  ns: function(ns){
    if(!this.has(ns)) return;
    return this.racks.get(ns);
  },
  new: function(id){
    stacks.Asserted(stacks.valids.isString(id),'first args must be a string');
    if(this.has(id)) return this.ns(id);
    return this.racks.add(id,Rack.make(id));
  },
  rack: function(rack){
    stacks.Asserted(Rack.isInstance(rack),'first args must be a Rack instance');
    if(this.racks.has(rack.id)) return;
    return this.racks.add(rack.id,rack);
  },
  unrack: function(rack){
    if(Rack.isInstance(rack)){
      return this.racks.remove(rack.id)
    }
    if(stack.valids.isString(rack)){
      return this.racks.remove(id);
    }
    return;
  },
  resource: function(addr){
    stacks.Asserted(stacks.valids.isString(addr),'first argument must be a string with format: {rack}/{type}/{id}');
    var rest = stacks.enums.rest(arguments);

    var paths = addr.split('/');
    stacks.Asserted(paths.length >= 3,'address for type and id is incorrect {rack}/{type}/id!');

    var tr = stacks.enums.rest(paths), rack = paths[0];
    stacks.Asserted(tr.length >= 2,'sub-address for type and id is incorrect {type}/{id}!');

    if(!this.has(rack)) return;

    var r = this.ns(rack), cr = r.resource.apply(r,tr.concat(rest));
    if(cr) cr.track = rest;
    return cr;
  },
  getResource: function(addr){
    stacks.Asserted(stacks.valids.isString(addr),'first argument must be a string with format: {rack}/{type}/{id}');
    var rest = stacks.enums.rest(arguments);

    var paths = addr.split('/');
    stacks.Asserted(paths.length >= 3,'address for type and id is incorrect {rack}/{type}/id!');

    var tr = stacks.enums.rest(paths), rack = paths[0];
    stacks.Asserted(tr.length >= 2,'sub-address for type and id is incorrect {type}/{id}!');

    if(!this.has(rack)) return;

    var r = this.ns(rack), cr = r.getResource.apply(r,tr.concat(rest));
    if(cr) cr.track = rest;
    return cr;
  }
});

var Rack = exports.Rack = stacks.Configurable.extends({
  init: function(id){
    stacks.Asserted(stacks.valids.isString(id),'an "id" of string type is required ');
    this.$super();
    this.id = id;
    this.adapters = AdapterStore.make("plugs");
    this.plugs = PlugStore.make("plugs");
    this.points = Store.make("Points",stacks.funcs.identity);
    this.mutators = Store.make("MutatorStore",stacks.funcs.identity);
  },
  resource: function(){
    var res,
        type = stacks.enums.first(arguments),
        name = stacks.enums.second(arguments),
        rest = stacks.enums.nthRest(arguments,2);

    var args = [name].concat(rest);
    switch(type){
      case 'adapters':
        res = this.Adapter.apply(this,args);
        break;
      case 'plugs':
        res = this.Plug.apply(this,args);
        break;
      case 'point':
        res = this.Point.apply(this,args);
        break;
      case 'mutator':
        res = this.Mutator.apply(this,args);
        break;
    }

    return res;
  },
  getResource: function(){
    var res,
        type = stacks.enums.first(arguments),
        name = stacks.enums.second(arguments),
        rest = stacks.enums.nthRest(arguments,2);

    var args = [name].concat(rest);

    switch(type){
      case 'adapters':
        res = this.getAdapter.apply(this,args);
        break;
      case 'plugs':
        res = this.getPlug.apply(this,args);
        break;
      case 'point':
        res = this.getPoint.apply(this,args);
        break;
      case 'mutator':
        res = this.getMutator.apply(this,args);
        break;
    }

    return res;
  },
  hasPlug: function(id){
    return this.plugs.has(id);
  },
  hasMutator: function(id){
    return this.mutators.has(id);
  },
  hasAdapter: function(id){
    return this.adapters.has(id);
  },
  hasPoint: function(id){
    return this.points.has(id);
  },
  Plug: function(id){
    return this.plugs.Q.apply(this.plugs,arguments);
  },
  Adapter: function(id){
    return this.adapters.Q.apply(this.plugs,arguments);
  },
  Mutator: function(id){
    return this.mutators.Q.apply(this.mutators,arguments);
  },
  Point: function(id){
    return this.points.Q.apply(this.points,arguments);
  },
  getPlug: function(id){
    return this.plugs.get.apply(this.plugs,arguments);
  },
  getAdapter: function(id){
    return this.adapters.get.apply(this.plugs,arguments);
  },
  getMutator: function(id){
    return this.mutators.get.apply(this.mutators,arguments);
  },
  getPoint: function(id){
    return this.points.get.apply(this.points,arguments);
  },
  registerPlug: function(){
    return this.plugs.register.apply(this.plugs,arguments);
  },
  registerPoint: function(){
    return this.points.register.apply(this.points,arguments);
  },
  registerAdapter: function(){
    return this.adapters.register.apply(this.adapters,arguments);
  },
  registerMutator: function(id,fn){
    return this.mutators.register(id,Mutators(fn));
  },
});

var Network = exports.Network = stacks.Configurable.extends({
  init: function(id,rs,fn){
    stacks.Asserted(stacks.valids.isString(id),'a string must be supplied as network id');
    if(stacks.valids.exists(rs) && stacks.valids.not.Function(rs)){
      stacks.Asserted(RackSpace.isInstance(rs),'supply a rackspace instance as second argument');
    }
    this.$super();
    this.id = id;
    this.rs = rs;
    this.plate = Plate.make(id);
    this.plugs = stacks.Storage.make();
    this.flux = NetworkFlux(this);

    var splug,lplug;

    var self = this;
    this.Reply = ReplyPackets.proxy(function(){
      self.plate.emitPacket(this);
    });
    this.Task = TaskPackets.proxy(function(){
      self.plate.emitPacket(this);
    });

    this.$secure('toStrictPlug',function(){
      if(Plug.instanceBelongs(splug)) return splug;
      splug = Plug.make(this.id,{ filter: stacks.funcs.always(true) });
      splug.attachNetwork(this);
      splug.withNetwork(splug.tasks(),splug.replies());
      return splug;
    });

    this.$secure('toLeakPlug',function(){
      if(Plug.instanceBelongs(lplug)) return lplug;
      lplug = Plug.make(this.id);
      lplug.attachNetwork(this);
      lplug.leakNetwork();
      return lplug;
    });

    this.$secure('imprint',function(net){
      if(!Network.instanceBelongs(net)) return;
      return fn.call(net);
    });

    this.plate.hookproxy(this);
    this.$rack(rs || fn);
  },
  use: function(plug,gid){
    stacks.Asserted(Plug.isInstance(plug),'first argument is required to be a plug instance');
    if(!this.plugs.has(gid || plug.GUUID)){
      this.plugs.add(gid || plug.GUUID,plug);
      plug.gid = gid;
      plug.attachPlate(this.plate,this);
    }
    return this;
  },
  get: function(gid){
    stacks.Asserted(stacks.valids.isString(gid),'argument is the unique alias for this plug');
    return this.plugs.Q(gid);
  },
  remove: function(gid){
    if(!this.has(gid)) return;
    var pl = this.get(gid);
    pl.release();
    return pl;
  },
  destroy: function(gid){
    var f = this.remove(gid);
    if(f) f.close();
    return f;
  },
  has: function(id){
    return this.plugs.has(id);
  },
},{
  blueprint: function(fx,nt){
    var print =  stacks.funcs.curry(Network.make,fx);
    print.imprint = stacks.funcs.bind(function(net){
      if(!Network.instanceBelongs(net)) return;
      var res = fx.call(net);
      return stacks.valids.exists(res) ? res : net;
    },print)
    return print;
  },
});

var NetworkFlux = exports.NetworkFlux = function(net){
 stacks.Asserted(Network.isInstance(net),'argument must be an instance of plug.Network');
 return stacks.Mask(function(fx){

    var pl = net.plate,channel = pl.channel, nets = [],markers = {};

    var filterGenerator = (function(nz){
      return function(f){
        if(Packets.isPacket(f) && f.plate() === nz.plate) return;
        return nz.plate.channel.emit(f);
      }
    });

    this.secureLock('filterPackets',filterGenerator(net));

    this.unsecure('size',function(net){
      return nets.length;
    });

    this.secure('has',function(net){
      return nets.indexOf(net) !== -1;
    });

    this.secure('connect',function(rn){
      if(!Network.isInstance(rn) || this.has(rn)) return;
      var marker = filterGenerator(rn);
      pl.channel.on(marker);
      rn.plate.channel.on(this.filterPackets);
      nets.push(rn);
      markers[rn] = marker;
    });

    this.secure('disconnect',function(rn){
      if(!Network.isInstance(rn) || !this.has(rn)) return;
      var marker = markers[rn];
      pl.channel.off(marker);
      rn.plate.channel.off(this.filterPackets);
      nets[nets.indexOf(rn)] = null;

      stacks.enums.deferCleanArray(nets);
      delete markers[rn];
    });

  });
};

// var NetworkManager = exports.NetworkManager = stacks.Configurable.extends({
//   init: function(id){
//     this.$super();
//     this.config({id: id});
//     this.id = id;
//     this.central = Network.make('centeral:hub');
//     this.flux = NetworkFlux(this.central);
//     this.networks = stacks.Storage.make('network');
//   },
//   has: function(id){
//     return this.networks.has(id);
//   },
//   get: function(id){
//     return this.networks.get(id);
//   },
//   use: function(net,id){
//     stacks.Asserted(Networks.instanceBelongs(net),'first arg must be a network instance');
//     stacks.Asserted(stacks.valids.String(id),'second arg must be a string as key');
//     if(this.has(id)) return;
//     this.networks.add(id,net);
//     this.flux.connect(net);
//   },
//   unuse: function(id){
//     if(!this.has(id)) return;
//     var net = this.network.remove(id);
//     this.flux.disconnect(net);
//   }
// });
