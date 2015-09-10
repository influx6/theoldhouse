/// <reference path='../../node_modules/stacks/lib/ts/stacks.d.ts' />
/// <reference path='./plug.d.ts' />
var stacks = require('stacks');


var messagePackSignature = stacks.core.Util.guid();

var MessagePack = (function () {
    function MessagePack(message,uuid){
        stacks.core.Asserted(stacks.Valicore.exists(message),"a message argument must be passed")
        var frozen = false;
        this.tag = uuid || stacks.Util.guid();
        this.message = message;
        this.readyBus = stacks.core.Distributors();
        this.__streams__ = stacks.streams.Streamable();
        this.streams = stacks.core.StreamSelect(this.__streams__,false);
        this.streamMid = stacks.core.Middleware(stacks.Funcs.bind(function(f){
          this.__streams__.emit(f);
        },this));

        this.__freeze = function(){ frozen = true; };
        this.frozen = function(){ return !!frozen;}
        this.__streams__.pause();
    };

    MessagePack.prototype.shell = function(){
      var cell = {};
      cell.ok = stacks.Funcs.bind(this.ok,this);
      cell.pack = stacks.Funcs.bind(this.pack,this);
      this.shell = stacks.Funcs.bind(function(){ return cell; },this);
      return cell;
    };

    MessagePack.isMessage = function(m){
      if(m.isMessage && stacks.ascontrib.valicore.isFunction(m.isMessage)){
        return m.isMessage() === messagePackSignature;
      }
      return false;
    };

    MessagePack.prototype.destroy = function(){
      this.readyBus.close;
      this.__streams__.close();
      this.streams.destroy();
      this.__streams__ = this.streams = this.readyBus = null;
    };

    MessagePack.prototype.isDead = function(){
      if(stacks.Util.isValid(this.__streams__) && stacks.Util.isValid(this.streams)) return false;
      return true;
    };

    MessagePack.prototype.isMessage = function(f){
      return messagePackSignature;
    };

    MessagePack.prototype.pack = function (f,fn) {
      if(this.isDead()) return;
      if(!!fn && stacks.Valicore.isFunction(fn) && !fn(f)) return;
      this.streamMid.emit(f);
    };

    MessagePack.prototype.ready = function (f) {
      if(this.isDead() || this.frozen()) return;
        this.readyBus.add(f);
    };

    MessagePack.prototype.ok = function () {
      if(this.isDead()) return;
      if (stacks.ascontrib.valicore.isTrue(this.ispack)) return null;
      this.ispack = true;
      this.readyBus.distributeWith(this, [true]);
      this.__streams__.resume();
    };

    MessagePack.prototype.listen = function(fn){
      if(this.isDead()) return;
      this.__streams__.tell(fn);
    };

    MessagePack.prototype.listenOnce = function(fn){
      if(this.isDead()) return;
      this.__streams__.tellOnce(fn);
    };

    MessagePack.prototype.unlisten = function(fn){
      if(this.isDead()) return;
      this.__streams__.untell(fn);
    };

    MessagePack.prototype.unlistenOnce = function(fn){
      if(this.isDead()) return;
      this.__streams__.untellOnce(fn);
    };

    return MessagePack;
})();
exports.MessagePack = MessagePack;
