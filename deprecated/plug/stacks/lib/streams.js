exports.Streams = (function(){

  var streams = {},
  ds = require('./ds').DS,
  as = require('./core.js').AppStack,
  util = core.Util;

  var stream_guid = util.guid();
  var methodLists = ['paused','resumed','closed','locked'];

  streams.isStreamable = function(stream){
    if(util.exist(stream) && util.isFunction(stream.streamID)){
      return stream.streamID() == stream_guid;
    }
    return false;
  };

  streams.EventSubscriber = function(source,fn){
    if(!streams.isStreamable(source))
	     throw "Source must be a streamable object";

    var subscriber = {};
    subscriber.isEventSubscriber = function(){ return true; };
    subscriber.source = source;
    subscriber.stream = streams.Streamable();

    subscriber.whenClosed = function(fn){ this.stream.whenClosed(fn); }
    subscriber.paused = function(){ this.stream.paused(); }
    subscriber.pause = function(){ this.stream.pause(); }
    subscriber.resumed = function(){ this.stream.resumed(); }
    subscriber.resume = function(){ this.stream.resume(); }

    subscriber.fn = function(){
        var args = util.toArray(arguments);
        subscriber.stream.add.apply(subscriber.stream,args);
    };

    subscriber.off = subscriber.close = function(){
        this.source.director.remove(this.fn);
        this.stream.end();
    };

    subscriber.source.director.add(subscriber.fn);
    if(fn && util.isFunction(fn)) subscriber.stream.director.add(fn);

    subscriber.source.whenClosed(function(){
        subscriber.off();
    });

    return subscriber;
  };

  streams.Streamable = function(fn){

    var core = {};
    var _running = false;
    core.isStream = function(){ return true; }
    core.streamID = function(){ return stream_guid; };
    core.transformer = core.Mutator(fn && util.isFunction(fn) ? fn :  function(n){ return n; });
    core.initd = core.Distributors();
    core.director = core.Distributors();
    core.closer = core.Distributors();
    core.drain = core.Distributors();
    core.lists = core.List();
    core.isActive = function(){ return !!_running; };
    core.states = core.StateManager.Manager(core,methodLists);

    core.states.addState('resume',{
    	'resumed': function(){
    	  return true;
    	},
    	'paused': function(){
    	  return false;
    	},
    	'closed': function(){
    	  return false;
    	},
    	'locked':function(){
    	  return false;
    	}
   });

   core.states.addState('pause',{
    	'resumed': function(){
    	  return false;
    	},
    	'paused': function(){
    	  return true;
    	},
    	'closed': function(){
    	  return false;
    	},
    	'locked':function(){
    	  return false;
    	}
   });

   core.states.addState('locked',{
    	'resumed': function(){
    	  return true;
    	},
    	'paused': function(){
    	  return false;
    	},
    	'closed': function(){
    	  return false;
    	},
    	'locked':function(){
    	  return true;
    	}
   });

   core.states.addState('closed',{
    	'resumed': function(){
    	  return false;
    	},
    	'paused': function(){
    	  return false;
    	},
    	'closed': function(){
    	  return true;
    	},
    	'locked':function(){
    	  return false;
    	}
   });

    core.states.setDefaultState('resume');
    core.transformer.done.add(function(n){
	  core.lists.add(n);
	     if(!core.isActive()) core.push();
    });

    util.extends(core,{
	    add: function(n){
	      if(this.closed() || this.locked()) return;
	      this.initd.distribute(n);
	      this.transformer.fire(n);
	    },
	    emit: function(n){
	      this.add(n);
	    },
	    massEmit: function(n){
	      if(!util.isArray(n)) return;
	      util.each(n,function(e,i){
		this.emit(e);
	      },this);
	    },
	    pending: function(){
	      return this.lists.size() !== 0;
	    },
	    resume: function(){
	      this.states.switchState('resume');
	      this.push();
	    },
	    pause: function(){
	      this.states.switchState('pause');
	    },
	    lock: function(){
	      this.states.switchState('locked');
	    },
	    unlock: function(){
	      if(!this.locked()) return;
	      this.states.switchState('resume');
	    },
	    closed: function(){
	      return this.states.closed();
	    },
	    locked: function(){
	      return this.states.locked();
	    },
	    paused: function(){
	      return this.states.paused();
	    },
	    resumed: function(){
	      return this.states.resumed();
	    },
	    subscribe: function(fn){
	      if(this.closed()) return;
	      var sub = streams.EventSubscriber(this,fn);
	      return sub;
	    },
	    untell: function(fn){
	      if(this.closed()) return;
	      return this.director.remove(fn);
	    },
      untellOnce: function(fn){
        return this.untell(fn);
      },
      tellOnce: function(fn){
	      if(this.closed()) return;
	      var fn = this.director.addOnce(fn);
	      return fn;
      },
	    tell: function(fn){
	      if(this.closed()) return;
	      var fn = this.director.add(fn);
	      return fn;
	    },
	    flush: function(){
	      this.resume();
	      this.push();
	      this.lists.clear();
	    },
	    flushListeners: function(){
	      this.director.removeAll();
	    },
	    end: function(){
	      if(this.closed()) return;
	      this.flush();
	      this.closer.distribute();
	      this.director.close();
	      this.states.switchState('closed');
	      this.closer.close();
	    },
	    whenClosed: function(fn){
	      this.closer.add(fn);
	    },
	    push: function(){
	      if(this.closed() || this.paused() || this.director.isEmpty()) return;
	      while(!this.lists.isEmpty()){
      		_running = true;
      		this.director.distribute(this.lists.removeHead().data);
	      }
	      this.drain.distribute(true);
	      _running = false;
	    },
	    bind: function(stream){
	      if(!streams.isStreamable(stream)) return;
	      var self = this,fn = util.proxy(stream.emit,stream);

	      stream.whenClosed(function(){
		        if(self) self.director.remove(fn);
	      });

	      this.director.add(fn);
	    },
    });

    return core;
  };

  streams.MaxStream = function(max,fn){
    if(util.notExist(max)) throw "first argument must be a number";
    var stream = streams.Streamable(fn);
    stream.maxSpace = max;
    streams.lists = core.List(max);
    return stream;
  };

  streams.EventStreams = function(id){
     if(!util.isString(id)) throw "argument must be a string";

     var core = {};
     core.id = id || "EventStream";
     core.map = core.HashHelpers({});
     core.subsMap = core.HashHelpers({});
     util.extends(core,{
        stream: function(id,len,sxm){
          var st;
          if(st = this.map.get(id)) return st;

          var id = id, rargs = util.toArray(this.arguments,1);
          this.subsMap.add(id,[]);

          var load = ((!!sxm && streams.isStreamable(sxm)) ?
            sxm : ((len && util.isNumber(len)) ?
            streams.MaxStream(len) : streams.Streamable()));

          this.map.add(id,load);

          return this.map.get(id);
        },
        has: function(id){
          return this.map.exists(id);
        },
        haltAll: function(){
          this.map.cascade(function(e){
              e.pause();
          });
        },
        halt: function(id){
          this.get(id).pause();
        },
        resume: function(id){
          this.get(id).resume();
        },
        resumeAll: function(){
          this.map.cascade(function(e){
              e.resume();
          });
        },
        onStream: function(id,fn){
          var self = this,sub = this.stream(id).subscribe(fn), sid = this.subsMap.get(id);
          sub.whenClosed(function(){
            var ind = sid.indexOf(sub);
            if(ind === -1) return;
            delete sid[ind];
            util.normalizeArray(sid);
          });
          this.subsMap.get(id).push(sub);
          return sub;
        },
        offStream: function(id){
          var stream = this.map.get(id), subs = this.subsMap.get(id);
          if(!stream) return;
          stream.end();
          this.map.remove(id);
          util.explode(subs);
        },
        emit: function(id,item){
          this.stream(id).emit(item);
        },
        close: function(){
          this.map.cascade(function(e,i,o){ e.end(); delete o[i]; });
        }
      });

     return core;
  };

  streams.combineUnOrderBy = function(fn,fns){
    return function(){
      var scope =  {},
      sets = util.toArray(arguments),
      combine = streams.Streamable(),
      combineInjector = core.ArrayInjector(function(set){
	  return fn.call(scope,sets,set);
      });

      scope.stream = combine;
      scope.injector = combineInjector;

      combineInjector.on(function(set){
	if(!util.isFunction(fns)) return combine.emit(set);
	return fns.call(scope,set,sets)
      });

      util.each(sets,function(e,i,o){
	e.tell(function(){
	    var args = util.toArray(arguments);
	    combineInjector.push.apply(combineInjector,args);
	});
      });

      return combine;
    };
  };

  streams.combineOrderBy = function(fn){
    return function(){
      var scope =  {},
      sets = util.toArray(arguments),
      combine = streams.Streamable(),
      combineInjector = core.PositionArrayInjector(function(set){
	  return fn.call(scope,sets,this.focus);
      });

      scope.stream = combine;
      scope.injector = combineInjector;

      combineInjector.on(function(set){
	combine.emit(set);
      });

      util.each(sets,function(e,i,o){
	e.tell(function(){
	    var args = util.toArray(arguments);
	    combineInjector.push.apply(combineInjector,[i].concat(args));
	});
      });

      return combine;
    };
  };

  streams.combineOrder = function(){
    return streams.combineOrderBy(function(streams,list){
	if(list.length >= streams.length) return true;
	return false;
    }).apply(this,arguments);
  };

  streams.combine = function(){
    var sets = util.toArray(arguments),
    combine = streams.Streamable();

    util.each(sets,function(e,i,o){
      e.tell(function(){
	  var args = util.toArray(arguments);
	  combine.emit.apply(combine,args);
      });
    });

    return combine;
  };

  streams.reduceOne = function(stream,transform,conditioner){
    var reduced = streams.Streamable(transform),
    reducedInjector = core.ArrayInjector(function(set){
	if(conditioner(stream,this.focus,reduced)) return true;
	return false;
    });

    reducedInjector.on(function(set){
      reduced.emit(set);
    });

    stream.tell(function(){
	var args = util.toArray(arguments);
	reducedInjector.push.apply(reducedInjector,args);
    });

    return reduced;
  };

  streams.reduceOrder = function(){
    return streams.reduceOrderBy(function(streams,recieved){
	if(recieved.length >= streams.length) return true;
	return false;
    }).apply(this,arguments);
  };

  streams.reduceOrderBy = function(fn){
    return function(){
      var sets = util.toArray(arguments),
      scope = {},
      transformer = util.rshift(sets),
      reduced = streams.Streamable(transformer),
      reducedInjector = core.PositionArrayInjector(function(set){
	  return fn.call(scope,sets,this.focus);
      });

      scope.stream = reduced;
      scope.injector = reducedInjector;

      reducedInjector.on(function(set){
	reduced.emit(set);
      });

      util.each(sets,function(e,i,o){
	e.tell(function(){
	    var args = util.toArray(arguments);
	    reducedInjector.push.apply(reducedInjector,[i].concat(args));
	});
      },this);

      return reduced;
    };
  }

  streams.tellStream = function(src,fn){
    if(!streams.isStreamable(src)) throw "first args:source must be streamables";
    return src.tell(fn);
  };

  streams.bindStream = function(src,dest){
    if(!streams.isStreamable(src)) throw "first args:source must be streamables";
    if(!streams.isStreamable(dest)) throw "second args:destination must be streamables";
    return src.bind(dest);
  };

  streams.untellStream = function(src,fn){
    if(!streams.isStreamable(src)) throw "first args:source must be streamables";
    src.untell(fn);
    return null;
  };

  return streams;
}());
