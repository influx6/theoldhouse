/* Released under the MIT license*
 *
 *  This code is released under the mit license and this should 
 *  alwas be include along with any copy or usage or amending of 
 *  the code
 */
var root = this;

var _ = require('stackq');
// var grid = require('grids');
var domain = require('./domain.js');
var shims = require('./shims.js');

//create inplace holder to allow internal server and client usage
var isBrowser = _.valids.contains(global,'document');

var Magnus = _.Mask(function(){

  var self = this;

  this.Element = _.Immutate.extends({
    init: function(map,component){
      domain.ElementType.is(map,function(s,r){
        _.Asserted(s,_.Util.String(' ',_.Util.toJSON(r),'does not match critera for elem creation'));
      });

      this.$super(map);
      this.tag = map.type;
      this.component = component;
    },
    isElement: function(){
      return true;
    },
  });

  this.unsecure('tagMixer',function(t,fx,joina){
    return this.bind(function(f,v){
      var j = [t,v].join(joina);
      return fx.call(this,j,f);
    });
  });

  this.unsecure('createElement',function(map){
    return this.Element.make(map);
  });

  this.unsecure('renderHTML',function(elem){
    var cache = {},done = [],tag = elem.snapshot('type');
    
    var attr = elem.snapshot('attr',this.bind(function(attr){
      return attr.map(this.tagMixer('',function equa(nt,f){
        if(f.isValueCursor()) return [nt,_.funcs.doubleQuote(f.value())].join('=');
        return f.map(this.tagMixer(nt,equa,'-')).values().join(' ');
      },''));
    }));

    var data = elem.snapshot('data',this.bind(function(data){
      return data.map(this.tagMixer('data',function equa(nt,f){
        if(f.isValueCursor()) return [nt,_.funcs.doubleQuote(f.value())].join('=');
        return f.map(this.tagMixer(nt,equa,'-')).values().join(' ');
      },'-'));
    }));

    var kids = elem.snapshot('children',this.bind(function(kids){
       return kids.map(this.bind(function(f){

         if(_.valids.isPrimitive(f)) return f;

         var isc = _.GhostCursor.instanceBelongs(f);

         if(f.isValueCursor()) return f.value();
         if(f.isObjectCursor()){

           if(this.Element.instanceBelongs(f.owner)){
             if(done.indexOf(f) !== -1) return;
             done.push(f);
             return this.renderHTML(f.owner).markup;
           }

           //if its not an Element when build,cache and render
           var el,map = f.value();
           if(_.valids.contains(cache,map)) return;
             // return this.renderHTML(cache[map]).markup;
           try{
             el = this.createElement(map);
             cache[map] = el;
           }catch(e){
            return;
           }
           if(el) return this.renderHTML(el).markup;
         }
       }));
    }));


    var f = tag.map(function(f){
      var build = ['<',f], props = [], content = [];
      if(attr){ props.push(' '); props.push(attr.values().join(' ')); }
      if(data){ props.push(' '); props.push(data.values().join(' ')); }
      if(kids) content.push(kids.values().join(' '));
      build.push(props.join(''));
      build.push('>');
      build.push('');
      build.push(content.join(' '));
      build.push(['</',f,'>'].join(''))
      return build.join('');
    });
  
    return {
      elemCache: cache,
      markup: f.values().join('')
    };
  });

  // this.unsecure('transformHTMl',function(markup){
  // });


  this.Rendering = _.Configurable.extends({
    init: function(comp){
      _.Asserted(self.Component.instanceBelongs(comp),'only magnus.Component instance allowed')
      this.$super();
      this.component = comp;
      this.hash = null;
      this.cache = null;
      this.pub('render');
    },
    hasChange: function(){
      if(this.component.hash() === this.hash) return false;
      return true;
    },
    render: function(){
      if(!this.hasChange()){
        if(_.valids.exists(this.cache)) return this.cache.markup
        this.cache = self.renderHTML(this.component.element());
        return this.cache.markup;
      }
      this.emit('render');
      this.hash = this.component.hash();
      this.cache = self.renderHTML(this.component.element());
      return this.cache.markup;
    },
    mount: function(node){
      _.Asserted(false,'implement in child');
    },
    unmount: function(){
      _.Asserted(false,'implement in child');
    },
  },{
    select: function(comp){
      if(!!isBrowser) return self.ClientRender.make(comp);
      return self.ServerRender.make(comp);
    }
  });

  this.ServerRender = this.Rendering.extends({
    init: function(comp){
      this.$super(comp);
    },
    unmount: function(node){
      return;
    },
    mountParent: function(node){
      return;
    },
  });

  this.ClientRender = this.Rendering.extends({
    init: function(comp){
      _.Asserted(isBrowser,'only works client sided with an html dom');
      this.$super(comp);
      this.fragment = global.document.createDocumentFragment();
      this.sourceMunch = global.document.createElement('div');
      this.target = null;
      this.parent = null;
      this.pub('plugged');
      this.pub('unplugged');
    },
    mount: function(node){
      if(_.valids.exists(this.parent)){
        this.parent.removeChild(this.target);
      }
      this.parent = node;
      this.render();
      this.emit('plugged');
    },
    render: function(){
      if(!this.hasChange()) return this.cache.markup;
      var s = this.$super();
      if(_.valids.exists(this.parent)){
        if(this.target) this.parent.removeChild(this.target);
        this.sourceMunch.innerHTML = s;
        this.fragment.appendChild(this.sourceMunch.firstChild);
        this.target = this.fragment.firstChild;
        this.target.magnus = 1;
        this.target.hash = this.component.hash();
        this.target.setAttribute('hash',this.target.hash);
        this.parent.appendChild(this.fragment);
      }
      return s;
    },
    unmount: function(){
      if(_.valids.exists(this.parent)){
        this.parent.removeChild(this.target);
        this.emit('unplugged');
      }
    },
  });

  this.RenderTree = _.Configurable.extends({
    init: function(pre){
       this.$super();
       this.heartbeat = _.Switch();
       this.renders = _.Sequence.value([]);
       this.precontent = [pre];
       var cur = null;
       this.$secure('frame',function(f){
         return (cur = this.render(f));
       });
       this.$unsecure('currentRender',function(){
         return cur;
       });
       this.heartbeat.on();
       this.pub('rendered');
    },
    mountRendering: function(rendering){
      _.Asserted(self.Rendering.instanceBelongs(rendering),'only rendering instances allowed!');
      if(this.renders.hasValue(rendering)) return;
      this.renders.push(rendering);
    },
    unmountRendering: function(rendering){
      _.Asserted(self.Rendering.instanceBelongs(rendering),'only rendering instances allowed!');
      this.renders.remove(rendering);
    },
    mount: function(c,p){
      _.Asserted(self.Component.instanceBelongs(c),'only component instances allowed!');
      c.mount(p);
      this.mountRendering(c.context());
    },
    unmount: function(c,p){
      _.Asserted(self.Component.instanceBelongs(c),'only component instances allowed!');
      this.unmountRendering(c.context());
    },
    render: function(f){
      var prd = [].concat(this.precontent)
      var pr = this.renders.map(function(v){ return v.render(f); }).values();
      prd = prd.concat(_.valids.List(pr) ? pr : [pr]);
      this.emit('rendered',prd);
      return prd;
    },
    isRendering: function(){ return this.heartbeat.isOn(); },
  },{
    select: function(pre){
      if(!!isBrowser) return self.ClientTree.make(pre);
      return self.ServerTree.make(pre);
    }
  });

  this.ServerTree = this.RenderTree.extends({});

  this.ClientTree = this.RenderTree.extends({
    init:function(c){
      _.Asserted(isBrowser,'only works client sided with an html dom');
     this.$super(c)
     this.clockFrame = shims.createFrame(this.frame);
    },
    onFrame: function(){
      return this.clockFrame;
    },
  });

  this.Component = _.Configurable.extends({
    init: function(type,map,fn){
      domain.ComponentArg.is(map,function(s,r){
        _.Asserted(s,_.Util.String(' ','map does not match component critera: '+_.Util.toJSON(r)));
      });
      this.$super();
      this.map = map;
      this.type = type;
      this.atom = map.atom;
      
      this.pub('ready');
      this.pub('live');

      var res = {};
      res.type = this.type;
      if(map.attr) res.attr = this.map.attr;
      if(map.data) res.data = this.map.data;

      // if(res.attr){
      //   res.attr.hash = 0
      // }else{
      //   res.attr = { hash: 0 };
      // }
      // if(res.data) res.data.hash = this.atom.hash();
      // else{ res.data = { hash: this.atom.hash() };  };
      
      var kids = fn.call(this,res);
      domain.ResultType.is(res,function(s,r){
        _.Asserted(s,_.Util.String(' ','result is not a map',_.funcs.toJSON(r)));
      });
      
      if(_.valids.exists(kids)){
        if(_.Cursor.instanceBelongs(kids)) res.children = kids;
        else{
          var rep = _.valids.List(kids) ? kids : [kids];
          res.children = _.Sequence.value(rep).mapobj(function(v){
             if(self.Component.instanceBelongs(v)) return v.element();
             return v;
          }).values();
        }
      };

      //adds component meta details
      this.elem = self.createElement(res,this);
      //get the attr ghost
      var attrg = this.elem.ghost('attr');
      //add rendering handler and configuration
      this.rendering = self.Rendering.select(this);

      this.rendering.before('render',this.$bind(function(){
        // console.log('attrg',attrg)
        // attrg.set('hash',this.hash());
      }));

      map.type = type;
      this.emit('ready');
    },
    context: function(){ return this.rendering; },
    element: function(){
      return this.elem;
    },
    hash: function(){
     return this.elem.ghost().sHash();
    },
    data: function(){
      return this.atom;
    },
    render: function(){
      return this.rendering.render();
    },
    mount: function(p){
      return this.rendering.mount(p);
    },
    unmount: function(){
      return this.rendering.unmount();
    }
  });

});


Magnus.ComponentBlueprint = function(type,attr){
  return Magnus.Component.extends({
    init: function(map,fn){
      this.$super(type,map,fn);
    },
  }).mixin(attr);
};

Magnus.Shims = shims;

Magnus.Client = function(id){
  _.Asserted(isBrowser,'only works client sided with an html dom');
  _.Asserted(_.valids.String(id),'first arg* must be a string');

  var co = _.Mask(function(){
  
    this.id = id;
    // var rootdom = n || global.document.body;
    var dom = Magnus.RenderTree.select('');
    var components = _.Sequence.value([]);
    var blueprint = _.Sequence.value({});

    this.secure('include',function(com,fx){
      _.Asserted(Magnus.Component.instanceBelongs(com),'only component instances allowed!');
      if(!this.components().hasValue(com)) this.components().push(com);
      return (_.valids.Function(fx) ? fx.call(this,com) : null);
    });
    
    this.secure('Blueprint',function(n){
      if(blueprint.hasKey(n)) return;
      blueprint.set(n,Magnus.ComponentBlueprint(n));
      //lets shim it so we can get recognized
      delete (global.document.createElement(n));
    });

    this.secure('create',function(n,map,fn,root){
      if(!blueprint.hasKey(n)) return;
      var bp = blueprint.get(n);
      var bpi = bp.make(map,fn);
      if(root) this.render(root,bpi);
      return bpi;
    });

    this.secure('blueprints',function(){
      return blueprint;
    });

    this.secure('dom',function(){
      return dom;
    });
   
    this.secure('components',function(){
      return components;
    });

    this.secure('render',function(root,component){
       return this.include(component,function(){
         return this.dom().mount(component,root);
       });
    });

    this.secure('unrender',function(component){
       return this.include(component,function(){
         return this.dom().unmount(component);
       });
    });

  });

  return co;
};

module.exports = Magnus;
global.Magnus = Magnus;

