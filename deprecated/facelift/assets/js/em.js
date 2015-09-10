var patch = function(n){ return require(n); }
var global = (typeof module != 'undefined' ? module : this);

var isNode = (function(){ 
    var inNode = (typeof global['exports'] !== 'undefined') ? true : false;
    return function(){ return inNode; }
})();


(function(_){ 
  
  var keys = function(o){
    var k = [];
    for(var i in o) k.push(i);
    return k.length;
  };

  var shell = function(name,fn,path){
      var mo =  {
          fn: fn,
          name: name,
          path: path,
          module: { exports: null } 
      };
      return mo;
  };

  var nodeLib = function(name,fn){
      var rpath = name.match(/^\.|^\//ig) ?  require('path').resolve(name) : name;
      var mo = shell(name,fn,rpath);
      if(!fn) mo.module.exports = patch(mo.path);
      return mo;
  };

  var browserLib = function(name,fn){
      var mo = shell(name,fn,name);
      return mo;
  };

  var requirefix = function(scope){
      //require fix
      if(typeof scope['require'] !== ('undefined' || null)) return;
      scope.require = function(name){ return em(name); };
  };

  var exportModules  = { modules:{}};

  var em = function EM(name,fn,env){
    if(!name) throw "name or address of the library must be supplied";


    var mods = exportModules;

    if(typeof fn !== 'function'){
      
      var sub = null;
      if(arguments.length >= 2){
        if(typeof fn === 'string' && !env){
          sub = fn;
          fn = null;
        }
        if(typeof fn === 'object' && typeof env === 'string'){
          sub = env;
          env = fn;
          fn = null;
        }
      }

      var moda = (!!sub ? mocore.modules[sub] : mocore.modules[name]);
      if(!moda){
        if(!!isNode()){
          moda = mocore.modules[sub || name] = nodeLib(name,null);
          if(keys(moda.module.exports) === 1 && typeof moda.module.exports['exports'] !== null) 
            moda.module.exports = moda.module.exports.exports;
        }
        else
          throw ("ModuleError: module named '"+name+"' not loaded!");
      }
      return moda.module.exports;
    };

    if(arguments.length < 2) 
      throw "supply a 'this' as the last argument,fixes nodejs vs web context blocks";

    if(arguments.length <= 2){
      if(typeof fn === 'object' && !env){
        env = fn;
        fn = null;
      }
    }

    var lib = (!!isNode() ? nodeLib(name,fn) : browserLib(name,fn));
    if(!isNode()){
        lib.fn.call(lib.module,em,lib);
        mocore.modules[name] = lib;
        return lib.module.exports;
    }
    if(!!isNode()){
        lib.fn.call(env,em,lib);
        lib.module.exports = env.exports;
        mocore.modules[name] = lib;
        return lib.module.exports;
    }

    return lib.module.exports;
  };

  em.modules = exportModules;

  var shellEm = shell('em','em',null);
  shellEm.module.exports = em;
  exportModules.modules.em = shellEm;

  if(isNode()) module.exports = em;
  else{
    _.em = em;
    requirefix(_);
  }


})(this);
