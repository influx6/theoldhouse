require('em')('Promise',function(){

	var Arr = Array.prototype,
	    Obj = Object.prototype,
		typeOf = function(o,type){
			var res = ({}).toString.call(o).replace(/\[object /,'').replace(/\]$/,'').toLowerCase();
			if(type) return (res === type);
			return res;
		},
		Splice = function(arg,b,e){
			return Arr.splice.call(arg,b || 0,e || arg.length);
		},
		getKeys = function(o){
			var keys = [];
			for(var i in o){ keys.push(i); }
			return keys;
		},
		eachSync = function(obj,iterator,complete,scope,breaker){
	          if(!iterator || typeof iterator !== 'function') return false;
	          if(typeof complete !== 'function') complete = function(){};


	          var step = 0, keys = getKeys(obj),fuse;

	          // if(typeof obj === 'string') obj = this.values(obj);

	          if(!keys.length) return false;
	          
	          fuse = function(){
	            var key = keys[step];
	            var item = obj[key];

	            (function(z,a,b,c){
	              if(breaker && (breaker.call(z,a,b,c))){ /*complete.call(z);*/ return; }
	              iterator.call(z,a,b,c,function completer(err){
	                  if(err){
	                    complete.call(z,err);
	                    complete = function(){};
	                  }else{
	                    step += 1;
	                    if(step === keys.length) return complete.call(z);
	                    else return fuse();
	                  }
	              });
	           }((scope || this),item,key,obj));
	          };

	          fuse();
	    },
		Promise = (function(){
			
			var generator = function(fn){

				var fire = function(arr,args,ctx){
					return eachSync(arr,function(e,i,o,c){
						if(e && typeOf(e,'function')) 
							e.apply(ctx,(typeOf(args,'array') ? args : [args]));
						c(false);
					});
				},
				p = { 
					cfg: {
						resolved: false,
						rejected: false,
					},
					state: function(){
						if(this.cfg.resolved && !this.cfg.rejected) return "resolved";
						if(!this.cfg.resolved && this.cfg.rejected) return "rejected";
						if(!this.cfg.resolved && !this.cfg.rejected) return "pending";
					},
					args: [],
					lists:{	done: [],	fail: [],	notify: [] } 
				};

				p.done = function(fn){
					if(this.cfg.resolved && !this.cfg.rejected){ fn.apply(this.args[1],this.args[0]); return this; };
					if(this.lists.done.indexOf(fn) !== -1) return;
					this.lists.done.push(fn);
					return this;
				};

				p.fail = function(fn){
					if(!this.cfg.resolved && this.cfg.rejected){ fn.apply(this.args[1],this.args[0]); return this; };
					if(this.lists.fail.indexOf(fn) !== -1) return;
					this.lists.fail.push(fn);
					return this;
				};

				p.progress = function(fn){
					if(this.cfg.resolved || this.cfg.rejected){ fn.apply(this.args[1],this.args[0]); return this; };
					if(this.lists.notify.indexOf(fn) !== -1) return;
					this.lists.notify.push(fn);
					return this;
				};

				p.then = function(done,fail,notify){
					return this.done(done).fail(fail).progress(notify);
				};

				p.resolveWith = function(args,ctx){
					if(this.cfg.resolved || this.cfg.rejected) return;
					this.cfg.rejected = false;
					this.cfg.resolved = true;
					this.status = "resolved";
					this.args = [args,ctx];
					fire(this.lists.done,args,ctx);
					fire(this.lists.notify,args,ctx);
					return this;
				};

				p.rejectWith = function(args,ctx){
					if(this.cfg.resolved || this.cfg.rejected) return;
					this.cfg.rejected = true;
					this.cfg.resolved = false;
					this.status = "rejected";
					this.args = [args,ctx];
					fire(this.lists.fail,args,ctx);
					fire(this.lists.notify,args,ctx);
					return this;
				};

				p.notifyWith = function(args,ctx){
					if(this.cfg.resolved || this.cfg.rejected) return;
					// this.cfg = "resolved",
					// this.args = [args,ctx];
					fire(this.lists.notify,args,ctx);
					return this;
				};

				p.resolve = function(){
					var args = Arr.splice.call(arguments,0,arguments.length);
					this.resolveWith(args,this);
					return this;
				};
				p.reject = function(){
					var args = Arr.splice.call(arguments,0,arguments.length);
					this.rejectWith(args,this);
					return this;
				};
				p.notify = function(){
					var args = Arr.splice.call(arguments,0,arguments.length);
					this.notifyWith(args,this);
					return this;
				};
				p.isPromise = function(){ return true; };

				if(fn && typeof fn === 'function'){ fn(p); return p; }
				if(fn && typeof fn !== 'function' && fn !== null && fn !== false && fn !== 'undefined') return p.resolve(fn);
				if(typeof fn !== 'function' && fn === false) return p.reject(fn);

				return p;
			};

			return {
				create: function(fn){
					return generator(fn);
				},
				when: function(){
					var args = Arr.splice.call(arguments,0,arguments.length),
					len = args.length,
					counter = 0,
					// set = [],
					argd = [],
					defer = generator();

					eachSync(args,function(e,i,o,c){
						// if(e && typeof e !== 'function') return c(false);
						var a = (e['isPromise'] && e.isPromise()) ? e : generator(e);
						a.then(function(){
							counter += 1;
							if(counter === len) defer.resolve(argd);
						},function(){
							defer.reject(argd);
						},function(){
							var res = Arr.splice.call(arguments,0,arguments.length);
							argd.push(res.length === 1 ? res[0] : res);
						});

						// set.push(a);
						c(false);
					});

					return defer;
				}
			};
		})();

		return Promise;
},this);

