module.exports = function(ma,as){
    
    var enums = core.enums, valids = core.validators, inv = core.invokable;
   

    ma.scoped('array operations');
    
    var item = [1,32,43,3,43];

    ma.obj(item).length(5);
    ma.obj(enums.first(item)).is(1);
    ma.obj(enums.nth(item,3)).is(3);
    ma.obj(enums.rest(item)).length(4);
    
    ma.scoped('effect non-effect');

    var shout = enums.effect(function(n){
      ma.obj(n).isValid();
    });
    
    ma.obj(shout(1)).isNumber().is(1);

    ma.scoped('partial');

    var partial3 = enums.partial(function(a,b,c){
      ma.obj(a).is('a').isString();
      ma.obj(b).is('b').isString();
      ma.obj(c).is('c').isString();
      return a+'-'+b+'-'+c;
  
    });

    var abc = partial3('a')('b','c');
    ma.obj(abc).is('a-b-c').length(5).isString();

    ma.scoped('curried');

    var curried3 = enums.curried(function(c,b,a,z){
      ma.obj(c).is('d').isString();
      ma.obj(b).is('v').isString();
      ma.obj(a).is('w').isString();
      ma.obj(z).is('z').isString();
      return c+'-'+b+'-'+a+"-"+z;
    },4);

    
    var cba = curried3('z')('w')('v')('d');
    ma.obj(cba).is('d-v-w-z').length(7).isString();
    
    ma.scoped('dispatch');

    var dispatch = enums.dispatch(function(n){
      if(valicore.isArray(n)) return n.length;
    },function(n){
      if(valicore.isObject(n)) return n;
    },function(n){
      if(valicore.isString(n)) return "{String:"+n+"}";
    });
    
    ma.obj(dispatch('a')).is('{String:a}').isString().length(10);

    ma.scoped('construct');
    var con = [1,32,43]
    ma.obj(enums.construct(con,[122,1])).isArray().length(3);
    ma.obj(enums.construct(con,[1,32,43,43])).isArray().length(5);
    
    ma.obj(enums.reduce([1,2,-3,4], function(memo,e){
        return memo - e;
    },10)).is(6);

    ma.obj(enums.reduce([1,32,32], function(memo,e){
        return memo - e;
    })).is(-63);

    ma.obj(enums.reduceRight([1,32,32], function(memo,e){
        return memo - e;
    })).is(-1);

    ma.obj(enums.average([1,2,3,4,5,6,7,8])).is(4.5);

    ma.obj(enums.cat([1,3],[2,4],[6,7])).length(6);
    
    var composed = inv.compose(enums.identity,function(n){ return -n; },enums.identity);
    
    ma.obj(composed(2)).is(-2);

    inv.doWhen(true,function(s){
      ma.obj(s).isTrue();
    });

    inv.fnull(function(n,m,c){
      ma.obj(enums.toArray(arguments)).length(3);
    },1,1)(1,null,2);
}
