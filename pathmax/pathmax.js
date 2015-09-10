var sq = require("stackq");

var block = /^:([\w\W]+)$/;
var unblock = /^([\w\W]+)$/;
var hashed = /#([\w\W]+)/;
var plusHash = /\/+/;
var hashy = /#/;
var openEnded = /\*$/;
var bkHash = /\\+/;
var mflat = {
  'lockHash': false,
  'noQuery': false,
  'exactMatch': true,
  'validators':{},
  'params':{}
};

module.exports = function(pattern,config){
  var pa = pattern,open = openEnded.test(pattern);
  pattern = open ? pattern.replace('*','') : pattern;

  var confs = sq.Util.extends({},mflat,config);
  if(open) confs.exactMatch = false;

  var vaqs = {};
  var valids = sq.Util.extends({},sq.uriValidators,confs.validators);
  var data = sq.analyzeURI(pattern);
  data.pattern = pa;
  data.openEnded = open;
  var params = sq.enums.filter(data.splits,function(f){
    if(block.test(f)){
      var mb = f.match(block), id = mb[1], pid = confs.params[id];
      vaqs[f] = valids[pid] ? valids[pid] : valids['dynamic'];
      return true;
    }
    return false;
  });


  var validateWith = function(mx,px){
    var vd = sq.analyzeURI(mx);
    if(px) px.params = {};
    if(px) px.meta = vd;
    var state = true;
    if(confs.noQuery && vd.hasQuery) return false;
    if(confs.lockHash && vd.hasHash && vd.hwords.length != data.hwords.length) return false;
    if(confs.exactMatch && data.splits.length != vd.splits.length) return false;
    sq.enums.each(data.splits,function(e,i,o,fn){
      if(vd.splits[i] == e) return fn(null);
      if(vd.splits[i] != e && block.test(e)){
        if(!vaqs[e](vd.splits[i])) return fn(true);
        if(px){
          var x = e.match(block);
          px.params[x[1]] = vd.splits[i];
        }
        return fn(null);
      }
      if(vd.splits[i] != e && !block.test(e)){
        return fn(true);
      }
      return fn(null);
    },function(_,err){
      if(err) state = false;
    });
    return state;
  };

  return {
    conf: confs,
    scheme: data,
    validate: function(url,pam){
      return validateWith(url,pam);
    },
    collect: function(url){
      var pam = {};
      pam.state = validateWith(url,pam);
      pam.config = confs;
      pam.url = url;
      pam.pattern = pattern;
      return pam;
    }
  }
};
