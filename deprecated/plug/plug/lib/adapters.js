/// <reference path='../../node_modules/stacks/lib/ts/stacks.d.ts' />
/// <reference path='./plug.d.ts' />
var stacks = require("stacks");
var messages = require('./messages.js');
var asc = stacks.ascontrib;
var as = stacks.as;
var funcs = stacks.Funcs;
var util = core.Util;
var valids = asc.valids;

var Adapter = (function () {
    function Adapter(fc) {
      if(!valicore.isFunction(fc))
        throw "argument must be a function!";
        var self = this;
        this.plugs = new Array();
        this.adaptive = fc;
        this.job = stacks.core.Distributors();
        this.jobState = stacks.core.Choice(function(f){
            self.adaptive(f,self,this);
        });
    }

    Adapter.prototype.attachPlug = function (t) {
      if (this.hasPlug(t) || !t.dispatch) return null;
      this.plugs.push(t);
      this.listen(funcs.bind(t.dispatch,t));
    };

    Adapter.prototype.detachPlug = function (t) {
      if (!this.hasPlug(t) || !t.dispatch) return null;
      this.plugs[this.plugs.indexOf(t)] = null;
      this.unlisten(funcs.bind(t.dispatch,t));
      stacks.core.Util.normalizeArray(this.plugs);
    };

    Adapter.prototype.delegate = function (t) {
        if(!messages.MessagePack.isMessage(t)) return;
        this.jobState.analyze(t);
    };

    Adapter.prototype.send = function (t) {
        if(!messages.MessagePack.isMessage(t)) return;
        this.job.distributeWith(this, [t]);
    };

    Adapter.prototype.hasPlug = function (t) {
        return this.plugs.indexOf(t) != -1;
    };

    Adapter.prototype.listen = function (t) {
        this.job.add(t);
    };

    Adapter.prototype.listenOnce = function (t) {
        this.job.addOnce(t);
    };

    Adapter.prototype.unlisten = function (t) {
        this.job.remove(t);
    };

    Adapter.prototype.unlistenOnce = function (t) {
        this.unlisten(t);
    };
    return Adapter;
})();
exports.Adapter = Adapter;

var Adapters = (function () {
    function Adapters(id) {
        this.id = id;
        this.registry = stacks.core.MapDecorator({});
    }
    Adapters.prototype.add = function (sid,fc) {
        this.registry.add(sid,fc);
    };

    Adapters.prototype.remove = function (sid) {
        this.registry.remove(sid);
    };

    Adapters.prototype.has = function (sid) {
        return this.registry.exists(sid);
    };

    Adapters.prototype.Q = function (sid) {
        if (!this.has(sid)) return null;
        var fn = this.registry.fetch(sid);
        return new Adapter(fn);
    };
    return Adapters;
})();
exports.Adapters = Adapters;

var AdapterWorkQueue = (function () {
    function AdapterWorkQueue() {
        this.adaptors = new Array();
    }
    AdapterWorkQueue.prototype.queue = function (q) {
      if(!(q instanceof Adapter)) return null;
        var first = stacks.ascontrib.enums.last(this.adaptors);
        this.adaptors.push(q);
        if (!!first) {
            first.listen(q.delegate);
        }
    };

    AdapterWorkQueue.prototype.unqueue = function (q) {
      if(!(q instanceof Adapter)) return null;
        if (!this.has(q))
            return null;
        var index = this.adaptors.indexOf(q), pid = index - 1, nid = index + 1, pa = this.adaptors[pid], na = this.adaptors[nid];

        if (!!pa) {
            pa.unlisten(q.delegate);
            if (!!na) {
                q.unlisten(na.delegate);
                pa.listen(na.delegate);
            }
        }

        this.adaptors[index] = null;
        stacks.core.Util.normalizeArray(this.adaptors);
    };

    AdapterWorkQueue.prototype.has = function (q) {
      if(!(q instanceof Adapter)) return null;
        return this.adaptors.indexOf(q) != -1;
    };

    AdapterWorkQueue.prototype.isEmpty = function () {
        return this.adaptors.length <= 0;
    };

    AdapterWorkQueue.prototype.emit = function (d) {
      if (this.isEmpty) return null;
      var fst = stacks.ascontrib.enums.first(this.adaptors);
      fst.delegate(d);
    };
    return AdapterWorkQueue;
})();
exports.AdapterWorkQueue = AdapterWorkQueue;

var AdapterGreedQueue = (function () {
    function AdapterGreedQueue() {
        this.qa = new Array();
        this.workQ = stacks.core.GreedQueue();
    }
    AdapterGreedQueue.prototype.queue = function (q) {
      if(!(q instanceof Adapter)) return null;
      return this.workQ.addChoice(q.jobState);
    };

    AdapterGreedQueue.prototype.has = function (q) {
      if(!(q instanceof Adapter)) return null;
      return this.workQ.has(q.jobState);
    };

    AdapterGreedQueue.prototype.unqueue = function (q) {
      if(!(q instanceof Adapter)) return null;
      return this.workQ.dequeue(q.jobState);
    };

    AdapterGreedQueue.prototype.emit = function (d) {
      return this.workQ.emit(d);
    };

    return AdapterGreedQueue;
})();
exports.AdapterGreedQueue = AdapterGreedQueue;
