library bass;

import 'package:hub/hub.dart';

class Rule{
	String method;
	Function ruleProcessor;

	static create(s,r) => new Rule(s,r);
	Rule(this.method,this.ruleProcessor);

	Map process(dynamic n,BassNS b) => this.ruleProcessor(n,b);
	void destroy(){
            this.method = this.ruleProcessor = null;
	}
}

class RuleSet{
	MapDecorator rules;

	static create() => new RuleSet();

	RuleSet(){
          this.rules = MapDecorator.create();
	}

	bool hasRule(String n) => this.rules.has(n);

	void rule(String n,Function m){
		this.rules.update(n,Rule.create(n,m));
	}

	dynamic get(String n) => this.rules.get(n);

	void remove(String n){
		if(!this.rules.has(n)) return null;
		this.rules(n).destroy();
	}

	void destroy(){
		this.rules.onAll((k,v) => v.destroy());
		this.rules.clear();
	}

        dynamic clone(){
            var a = RuleSet.create();
            a.rules.updateAll(this.rules);
            return a;
        }
}

class Style{
        final Distributor newView = Distributor.create('newView');
	String selector;
	AtomicMap rules;
	AtomicMap view;
	Map maps;

	static create(s,m) => new Style(s,m);
	Style(this.selector,this.maps){
          this.rules = new AtomicMap.use(this.maps);
          this.view = AtomicMap.create();
	}
    
        void updateView(Map m){
          m.forEach((f,k){
              this.view.update(f,k);
          });
          this.newView.emit(this.view.clone);
        }

        dynamic get onAdd => this.view.onAdd;
        dynamic get onRemove => this.view.onRemove;
        dynamic get onUpdate => this.view.onUpdate;
        dynamic get onKeyUpdate => this.view.onKeyUpdate;

        dynamic get onRuleAdd => this.rules.onAdd;
        dynamic get onRuleRemove => this.rules.onRemove;
        dynamic get onRuleUpdate => this.rules.onUpdate;
        dynamic get onRuleKeyUpdate => this.rules.onKeyUpdate;

	void destroy(){
		this.selector = null;
		this.rules.clear();
		this.maps.clear();
	}
}

class StyleSet{
	AtomicMap styles;

	static create() => new StyleSet();

	StyleSet(){
            this.styles = AtomicMap.create();
	}

	void style(String n,Map m){
          if(this.styles.has(n)){
            var fc = this.styles.get(n);
            m.forEach((k,v){
              if(BassUtil.rules.hasMatch(k)){
                var fx = fc.rules.get(k);
                if(Valids.notExist(fx)) return fc.rules.update(k,v);
                var mx = fx.split(',');
                mx.addAll(v.split(','));
                fc.rules.update(k,mx.join(','));
              }else{
                fc.rules.update(k,v);
              }
            });
            return null;
          }
          return this.styles.update(n,Style.create(n,m));
	}


	bool hasStyle(String n) => this.styles.has(n);

	dynamic get(String n) => this.styles.get(n);
	dynamic getMaps(String n) => this.hasStyle(n) ? this.styles.get(n).maps : null;

	void remove(String n){
          if(!this.styles.has(n)) return null;
          this.styles(n).clear();
	}

	void destroy(){
          this.styles.onAll((k,v) => v.destroy());
          this.styles.clear();
	}

        dynamic clone(){
            var a = StyleSet.create();
            a.styles.updateAll(this.styles);
            return a;
        }
}

typedef Map SelectorFn(i,e,m);

class SelectorRule{
	MapDecorator rules;

	static create() => new SelectorRule();
	SelectorRule(){
		this.rules = MapDecorator.create();
	}

	void addRule(String ns,RegExp r,SelectorFn m){
		if(this.rules.has(ns)) return null;
		this.rules.add(ns,{'r':r,'fn':m});
	}

	dynamic rule(String ns) => this.rules.get(ns);

	void removeRule(String ns){
		if(!this.rules.has(ns)) return null;
		this.rules.destroy(ns).clear();
	}

	void process(String data,Function m,Function g){
		Enums.eachAsync(this.rules.core,(e,i,o,fn){
			if(e['r'].hasMatch(data)) return fn(e);
			return fn(null);
		},(_,err){
			if(Valids.exist(err)) return m(err);
			return g(err);
		});
	}

	void destroy(){
		this.rules.onAll((v,k) => k.clear());
		this.rules.clear();
	}

        dynamic clone(){
            var a = SelectorRule.create();
            a.rules.updateAll(this.rules);
            return a;
        }
}

class BassNS{
	Distributor procDist;
	MapDecorator fnMixes;
	MapDecorator varbars;
	MapDecorator scanned;
	SelectorRule seltypes;
	RuleSet extensions;
	StyleSet mixstyles;
	StyleSet styles;
	Switch strictKeys;
	String ns;
        Map _cached;
        bool _dirty = false;

	static create(s,n) => new BassNS(s,n);

	BassNS(this.ns,this.extensions){
		this.strictKeys = Switch.create();
		this.varbars = MapDecorator.create();
		this.fnMixes = MapDecorator.create();
		this.scanned = MapDecorator.create();
		this.styles = StyleSet.create();
		this.seltypes = SelectorRule.create();
		this.mixstyles = StyleSet.create();
		this.procDist = new Distributor('${this.ns}-Distributor');

		this.strictKeys.switchOn();
		
		this.extensions.rule('include',(val,bns){
                  if(!bns.mixstyles.hasStyle(val)) return null;
                  return Enums.flatten(bns.mixstyles.getMaps(val));
		});

		this.extensions.rule('mix',(val,bns){
			var m = val.split(','),mix = {};
			m.forEach((f){
				if(!bns.hasMix(f)) return null;
				mix.addAll(bns.getMix(f));
			});
			return mix;
		});

		this.seltypes.addRule('mixins',new RegExp(r'^@([\w\W]+)'),(s,d,e){
                      var map = {},id = Hub.randomString(4);
                      this.mix(id,e);
                      map[d] = id;
                      return {'sel': s,'map':map };
		});

		this.seltypes.addRule('mixins',new RegExp(r'^@([\w\W]+)'),(s,d,e){
                      return {'sel': s };
		});

		this.seltypes.addRule('state',new RegExp(r'^:\S([\w\W]+)'),(s,d,e){
                      return {'sel': [s,d].join('')};
		});

		this.seltypes.addRule('descendant',new RegExp(r'^>([\w\W]+)'),(s,d,e){
			return { 'sel': [s,'>',d.replaceAll('>','')].join(' ')};
		});

		this.seltypes.addRule('space-descendants',new RegExp(r'^\s?\w+'),(s,d,e){
			return { 'sel':[s,d].join(' ') };
		});

		this.seltypes.addRule('parent-descendant',new RegExp(r'&\s?([\w\W]+)'),(s,d,e){
			return { 'sel': d.replaceAll('&',s) };
		});

	}
        
        void clear() => this.styles.destroy();
        dynamic get rules => this.extensions;
        dynamic get addRule => this.extensions.rule;
        dynamic get addSelector => this.seltypes.addRule;

        bool hasMix(String n) => this.mixstyles.hasStyle(n);
        dynamic getMix(String n) => this.mixstyles.getMaps(n);

	void destroy(){
          this.varbars.clear();
          this.scanned.clear();
          this.strictKeys.close();
          this.procDist.free();
          this.seltypes.destroy();
          this.extensions.destroy();
          this.mixstyles.destroy();
          this.styles.destroy();
          this.ns = null;
	}

	Style retrieveStyle(String selector) => this.styles.get(selector);

	void updateSel(String selector,Map rules){
                this._dirty = true;
		if(!this.styles.hasStyle(selector)) return this.sel(selector,rules);
		var tmp = StyleSet.create();
		this.styleSelector(tmp,selector,rules,(s,c){
                    s.styles.onAll((k,v){
                        /*if(this.styles.hasStyle(k)) */
                        /*	return this.styles.get(k).rules.updateAll(v.rules);*/
                        this.styles.style(k,v.maps);
                    });
                    tmp.destroy();
		});
	}

	void sel(String selector,Map rules) => this.styleSelector(this.styles,selector,rules);

	void styleSelector(StyleSet style,String selector,Map rules,[Function done]){
                this._dirty = true;
		Bass.debug.log('BassNS selMethod',{'selector': selector,'rules':rules});
		var nws,cleand = {};
		Enums.eachAsync(rules,(e,i,o,fn){
			if(this.strictKeys.on() && BassUtil.validkeys.hasMatch(i)) return  fn(null);
			if(e is Map){
				this.seltypes.process(i,(r){
					var res = r['fn'](selector,i,e);
                                        if(res is! Map) throw "All selector rules must return a map";
                                        if(!res.containsKey('map')) res['map'] = e;
					this.sel(res['sel'],res['map']);
				},(r){
                                    this.sel(i,e);
				});
				return fn(null);
			}
                        
			cleand[i] = e;
			return fn(null);
		},(_,err){
			Bass.debug.log('BassNS sel $selector cleaned',cleand);
			style.style(selector,cleand);
			if(Valids.exist(done)) done(style,cleand);
		});
	}


	void mixVar(String id,dynamic n) => this.varbars.update(id,n);
	dynamic vars(String id) => this.varbars.get(id);
	bool hasVars(String id) => this.varbars.has(id);

	void bind(Function n) => this.procDist.on(n);
	void bindOnce(Function n) => this.procDist.once(n);
	void unbind(Function n) => this.procDist.off(n);
	void unbindOnce(Function n) => this.procDist.offOnce(n);
	void bindWhenDone(Function n) => this.procDist.whenDone(n);
	void unbindWhenDone(Function n) => this.procDist.offWhenDone(n);
	void clearListeners() => this.procDist.free();
        
        void _processRules(Map n,Map f,[Function ender]){
            var rule;
            n.forEach((k,v){
              v = v.toString().replaceAll(BassUtil.escapeSeq,' ');
              if(!BassUtil.rules.hasMatch(k)) return f[k] = v;
              rule = BassUtil.rules.firstMatch(k).group(1);
              if(!this.extensions.hasRule(rule)) return null;
              var res = Funcs.switchUnless(this.extensions.get(rule).process(v,this),{});
              if(Valids.exist(ender)) ender(res);
              return  f.addAll(res);
            });
        }
        
        void _checkMixes(Map m,[Function s,Function f]){
          Enums.eachAsync(this.extensions.rules.core,(e,i,o,fn){
              var attach = ['@',i].join('');
              if(m.containsKey(attach)) return fn(attach);
              return fn(null);
          },(_,err){
             if(Valids.exist(err)){
               if(Valids.exist(s)) return s(m,err);
                return null;
             }
             if(Valids.exist(f)) f(m,err);
          });
        }

        void _processMixables(String id,Map m,Function s,Function f,List proc){
          var n = new Map.from(m);
          this._checkMixes(m,(v,a){
             proc.add(v[a]);
             n.remove(a);
             this._processRules(m,n);
             return s(n,a);
          },(v,a){
             proc.add(v[a]);
            return f(v,a);
          });
        }

	void _mixrun(String id,Map m,List g){
          this._processMixables(id,m,(v,a){
              this._checkMixes(v,(b,f){
                 var mixd = f.split('@')[1];
                 if(g.contains(b[f])) 
                    throw "cant recall mixin else endless loop occurs!";
                this._mixrun(id,v,g);
              },(b,f){
                return this.mixstyles.style(id,v);
              });
          },(v,a){
              return this.mixstyles.style(id,v);
          },g);
	}

        void mix(String id,Map m){
          this._mixrun(id,m,[]);
        }
  
        bool get isDirty => !!this._dirty;

	void scan(Function m){
                if(!this._dirty && Valids.exist(this._cached)) return m(new Map.from(this._cached));
		var f,rule;
                var scanned = MapDecorator.create();
                var std = this.styles.clone();
		Enums.eachAsync(std.styles.core,(e,i,o,fn){
                  scanned.update(i,{});
                  f = scanned.get(i);
                  this._processRules(e.maps,f,(res){
                    var styles = this.styles.get(i);
                    if(Valids.notExist(styles)) return null;
                    styles.updateView(res);
                  });
                  fn(null);
		},(_,err){
                    if(Valids.exist(err)) throw err;
                    this._dirty = false;
                    this._cached = new Map.from(scanned.core);
                    this.scanned.clear();
                    this.scanned.addAll(scanned);
                    return m(new Map.from(scanned.core));
		});
	}

	dynamic compile(){
		this.scan((n) => this.procDist.emit(n));
	}

	dynamic fn(String n,[List a,Map m]){
		if(!this.fnMixes.has(n)) return null;
		return Funcs.dartApply(this.fnMixes.get(n),a,m);
	}

	void composeFn(String id,List<String> list,[int x]){
		this.mixFn(id,this._compose(list,x));
	}

	void mixFn(String id,Function m){
		id = id.replaceAll(r'/W+','');
		if(this.fnMixes.has(id)) return null;
		this.fnMixes.add(id,m);
	}
        

        Function _compose(List<String> ops,[int x]){
          var fns = Enums.map(ops,(e,i,o){
    		if(this.fnMixes.has(e)) return this.fnMixes.get(e);
    		return throw "$e does not exist in Mixins!";
		});
		return Funcs.single(fns,x);
	}
}

class BassUtil{

  static Map specialTags = {
    'img':"<img #attr />",
    'hr':"</hr>",
  };

  static RegExp rules = new RegExp(r'^@([\w\W]+)');
  static RegExp varrule = new RegExp(r'^#([\w\W]+)');
  static RegExp escapeSeq = new RegExp(r'([\t|\n]+)');
  static RegExp validkeys = new RegExp(r'^([^\w\d&]+)$|^&$');

  static final RegExp ntag = new RegExp(r'([\w\W]+)#([\d]+)');
  static final RegExp attrReg = new RegExp(r'#attr');
  static final RegExp contentReg = new RegExp(r'#content');
  static final RegExp textReg = new RegExp(r'#textContent');
  static final RegExp singleSpace = new RegExp(r'\s');
  static final RegExp multipleSpace = new RegExp(r'\s+');

  static String makeTag(String t){
    if(BassUtil.specialTags.containsKey(t.toLowerCase())) 
      return BassUtil.specialTags[t.toLoweCase()];
    return "<$t #attr>"+"\n#textContent"+'\n#content'+"\n</$t>";
  }

  static String mapAttr(Map m,[List ex]){
    var buffer = new StringBuffer();
    m.forEach((k,v){
      if(ex.contains(k)) return null;
      buffer.write(' ');
      buffer.write("$k=${Funcs.doubleQuote(v)}");
      buffer.write(' ');
    });
    return buffer.toString();
  }
}

class BassFormatter{
	BassNS ns;
	Distributor chain;
	Function processor,_hidden;

	static create(fn,[b]) => new BassFormatter(fn,b);

	BassFormatter(this.processor,[BassNS n]){
		this.chain = Distributor.create('bassformatter');
                this._hidden = (m){ 
                  var res = this.processor(m,this); 
                  return Valids.exist(res) ? this.chain.emit(res) : null;
                };
                if(Valids.exist(n)) this.use(n);
	}

	void bindBass(){
		this.ns.bind(this._hidden);
	}

	void unbindBass(){
		this.ns.unbind(this._hidden);
	}

        void use(BassNS ns){
          if(Valids.exist(this.ns)) this.unbindBass();
          this.ns = ns;
          this.bindBass();
        }

	void bind(Function n) => this.chain.on(n);
	void bindOnce(Function n) => this.chain.once(n);
	void unbind(Function n) => this.chain.off(n);
	void unbindOnce(Function n) => this.chain.offOnce(n);
	void bindWhenDone(Function n) => this.chain.whenDone(n);
	void unbindWhenDone(Function n) => this.chain.offWhenDone(n);
	void clearListeners() => this.chain.free();
        void destroy(){
          this.clearListeners();
        }

}

class TypeAbstract{
  BassFormatter f;
  BassNS ns;

  TypeAbstract([n]){
    this.ns = Valids.exist(n) ? n : BassNS.create('cssProc',Bass.R.clone());
  }

  dynamic getStyle(String s) => this.ns.retrieveStyle(s);
  void clear() => this.ns.clear();
  void sel(String k,Map m) => this.ns.sel(k,m);
  void update(String k,Map m) => this.ns.updateSel(k,m);
  void compile() => this.ns.compile();
  void bind(Function n) => this.f.bind(n);
  void bindOnce(Function n) => this.f.bindOnce(n);
  void unbind(Function n) => this.f.unbind(n);
  void unbindOnce(Function n) => this.f.unbindOnce(n);
  void bindWhenDone(Function n) => this.f.bindWhenDone(n);
  void unbindWhenDone(Function n) => this.f.unbindWhenDone(n);
  void clearListeners() => this.f.clearListeners();
  void destroy(){
    this.ns.destroy();
    this.clearListeners();
    this.clear();
  }
}

class CSS extends TypeAbstract{
  BassFormatter f;

  static create([n]) => new CSS(n);

  CSS([n]): super(n){
    this.f = BassFormatter.create((m,bf){
      var pretty = Funcs.prettyPrint(m,null,null,'!|').split('!|');
      pretty[0] = '';
      pretty[pretty.length - 1] = '';
      return pretty.join('').replaceAll('",','";')
      .replaceAll('"','').replaceAll('},','}')
      .replaceAll(': {','{');
    },this.ns);

    this.ns.mixFn('identity',Funcs.identity);
    this.ns.mixFn('format',(val,format) => [val,format].join(''));
    this.ns.mixFn('%',(v) => this.ns.fn('format',[v,'%']));
    this.ns.mixFn('px',(v) => this.ns.fn('format',[v,'px']));
    this.ns.mixFn('rem',(v) => this.ns.fn('format',[v,'rem']));
    this.ns.mixFn('em',(v) => this.ns.fn('format',[v,'em']));

    this.ns.mixFn('percentage',(v) => 100*v);
    
    this.ns.composeFn('to%',['%','percentage']);

    this.ns.mix('fullWidth',{ 'width':'100%'});
    this.ns.mix('fullHeight',{ 'height':'100%'});
    this.ns.mix('fullSize',{ '@mix':'fullWidth,fullHeight'});
  }

  void css(String id,Map m){
    this.ns.sel(id,m);
  }
}

class MarkUp extends TypeAbstract{
  BassFormatter f;

  static RegExp firstQuote = new RegExp(r'^"');
  static RegExp endQuote = new RegExp(r'"$');
  static create([n]) => new MarkUp(n);
  MarkUp([ns]):super(ns){

    var tree = MapDecorator.create();
    var build = MapDecorator.create();
    var vals = MapDecorator.create();
    var srcbuffer = new StringBuffer();
    var srcMap = {};

    var makeOutput = (){
        return {
          'markup': srcbuffer.toString(),
          'tree': new Map.from(srcMap)
        };
    };

    var processor = (key,tag,tree,List ex){
        var g,attr,text='';
        if(BassUtil.ntag.hasMatch(tag)){
          g = BassUtil.ntag.allMatches(tag);
          g.forEach((f) => tag = tag.replaceAll(BassUtil.ntag,f.group(1)));
        }

        if(tree.containsKey('text')){
          text = Funcs.prettyPrint(tree['text'])
            .replaceAll(MarkUp.firstQuote,' ')
            .replaceAll(MarkUp.endQuote,' ');
        }

        ex.add('text');
        attr = BassUtil.mapAttr(tree,ex);

        return BassUtil.makeTag(tag).
          replaceAll(BassUtil.textReg,text).
          replaceAll(BassUtil.attrReg,attr).
          replaceAll(BassUtil.contentReg,"#{$key}");
    };

    var patcher = (tree,val,List ex){
        var key = tree.join(' ');
        var child = Enums.yankLast(tree);
        return processor(key,child,val,ex);
    };

    var combinator = (item,trees,done,vals,[List m]){
        m = Funcs.switchUnless(m,[]);
        var spl,child,parent,res;
        spl = item.split(BassUtil.singleSpace);
        child = patcher(spl,trees.get(item),m);
        if(!spl.isEmpty){
          var key = spl.join(' ');
          var data = patcher(spl,trees.get(key),m);
          done.get(key).add(item);
          vals.update(key,data);
        }
        done.add(item,[]);
        vals.update(item,child);
    };

    this.f = BassFormatter.create((m,bf){
      tree.storage = m;
  
      var keys,reverse,sorted;
      keys = m.keys.toList();
      sorted = Enums.heapSort(keys,(m,n) => m.length < n.length);
      reverse = Enums.heapSort(keys,(m,n) => m.length > n.length);

      build.clear();
      vals.clear();
      srcbuffer.clear();
      srcMap.clear();

      Enums.list2Map(m.keys.toList(),(t){

        while(!sorted.isEmpty){
          var cur = Enums.yankFirst(sorted);
          combinator(cur,tree,build,vals);
        }

        while(!reverse.isEmpty){
          var cur = Enums.yankFirst(reverse);
          var val = vals.get(cur);
          var bd = build.get(cur);
          var rv = [''];


          if(bd.isEmpty){
            build.destroy(cur);
            vals.update(cur,vals.get(cur).replaceAll("#{$cur}",rv.join('\n')));
            continue;
          }

          bd.forEach((f){ 
            rv.add(vals.get(f)); 
          });

          var patch = val.replaceAll("#{$cur}",rv.join('\n'));
          vals.update(cur,patch);
          build.destroy(cur);
        }

        t.keys.forEach((v){
          srcMap[v] = vals.get(v);
          srcbuffer.write('\n');
          srcbuffer.write(vals.get(v));
        });

        bf.chain.emit(makeOutput());
      });

    },this.ns);

    this.ns.addRule('ns',(v,d){
      if(!d.hasMix(v)) return null;
      var mn = {},mix = d.getMix(v), 
      key = mix['@key'];
      mix.forEach((k,v){
        if(k == '@key') return;
        mn[[key,':',k].join('')] = v;
      });
      return mn;
    });

  }

}

class SVG extends MarkUp{
  static create([n]) => new SVG(n);
  SVG([ns]): super(ns){
      this.ns.mix('svg',{
          'xmlns':'http://www.w3.org/2000/svg',
          'version': '1.1',
          'preserveAspectRatio': "none",
      });

      this.ns.mixFn('viewbox',(x,y,w,h){
        return {
          "viewBox": "$x $y $w $h"
        };
      });

  }

  void svg(Map m){
    this.ns.sel('svg',{
       "@mix":'svg',
       "@include": vb,
        "width":'100%',
        "height":'100%'
    });
    this.ns.updateSel('svg',m);
  }
}

class HTML extends MarkUp{
  static create([n]) => new HTML(n);
  HTML([ns]): super(ns);
}

class Bass{
	RuleSet rules;
	MapDecorator namespace;

	static Log debug = Log.create(null,null,"BassLog#({tag}):\n\t{res}\n");
	static create() => new Bass();
	static Bass B = Bass.create();
	static RuleSet R = Bass.B.rules;

	static NS(String m) => Bass.B.ns(m);

	Bass([ruleset]){
		this.rules = RuleSet.create();
		this.namespace = MapDecorator.create();
	}

	BassNS ns(String n){
		if(this.namespace.has(n)) return this.namespace.get(n);
		var ng = BassNS.create(n,this.rules);
		this.namespace.add(n,ng);
		return ng;
	}

	void destroy(){
		this.rules.destroy();
		this.namespace.onAll((v,k) => k.destroy());
		this.namespace.clear();
	}
}
