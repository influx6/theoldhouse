require('em')('domUtil',function(){
  
  var util = {};

  util.colors = ['grey', 'black', 'yellow', 'red', 'green', 'blue', 'white', 'cyan', 'magenta'];
  util.colorClasses = ['lightblue', 'lightgreen', 'orange', 'red','pink','blue','purple','grassgreen'];

  util.color = function(){
    var peek = Math.abs((Math.floor((Math.round(Math.random(8)*2300)/90) - this.colorClasses.length)));
    if(peek >= this.colorClasses.length) peek =  Math.abs(Math.random((190*peek) - this.colorClasses.length));
    return !!this.colorClasses[peek] ? this.colorClasses[peek] : 'blue';
  };

  util.toArray = function(arg,n,m){
    if(m == null ) return [].splice.call(arg,(n == null ? 0 : n));
    return [].splice.call(arg,(n == null ? 0 : n),(m == null ? arg.length : m));
  };

  util.each = function(a,fn){
    var i=0,len = a.length;
    for(; i < len; i++) fn(a[i],i);
  };  

  util.eachMap = function(a,fn){
    for(var i in a) fn(a[i],i);
  };

  util.keys = function(arr){
    var c = [];
    for(var i in arr) c.push(i);
    return c;
  };

  util.values = function(arr){
    var c = [];
    for(var i in arr) c.push(arr[i]);
    return c;
  };

  util.event = function(elem,fn){
    var em = document.getElementById(elem.replace('#',''));
    if(em == null) return;
    if(em.attachEvent) return em.attachEvent(elem,fn);
    return em.addEventListener(elem,fn,false);
  };
  
  util.live = function(hook,event,key,val,fn){
    $(hook).bind(event,function(e){
      var target = e.target;
      var value = (val.replace('#','').replace('.',''));
      var attr = target.getAttribute(key);
      var fns = function(e){
        fn(e);
        e.stopPropagation();
        e.preventDefault();
        return false;
      };

      if(attr === null) return false;

      var sets = attr.split(/\s+/);
      if(sets.length > 1){
        for(var i=0,len = sets.length; i < len; i++) if(sets[i] === value) return fns(e);;
        return false;
      };

      if(attr === value) return fns(e);

    });
  };

  return util;
},this);
