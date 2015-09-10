library dispatch;

import 'dart:async';
import 'package:ds/ds.dart' as ds;
import 'package:hub/hub.dart';
import 'package:streamable/streamable.dart';

abstract class Store{
  Middleware dispatchFilter;
  void attach(Dispatch m);
  void attachOnce(Dispatch m);
  void detach();
  void delegate(m);
  void watch(m);
  void dispatchd(Map m) => this.dispatchFilter.emit(m);
}

abstract class StoreHouse{
  final MapDecorator storehouse = MapDecorator.create();
  final Store store;

  StoreHouse(this.store);

  Future delegateAdd(m);
  Future delegateRemove(m);
  bool hasTag(n);

  dynamic get tree => this.storehouse.core.values;

}

abstract class SingleStore extends Store{
  Dispatch dispatch;

  SingleStore([Dispatch d]){
    this.dispatch = Dispatch.create();
    this.dispatchFilter = Middleware.create((m){
      this.dispatch.dispatch(m);
    });
    this.attach(d);
  }

  bool get isActive => this.dispatch != null;

  //will ineffect listen to the dispatcher without killing its current dispatcher
  void shadowOnce(Dispatch n){
    this.dispatch.listenOnce(this.delegate);
  }

  //replaces the current dispatch and listens once and then detaches
  void attachOnce(Dispatch n){
    this.detach();
    this.dispatch = n;
    this.dispatch.listenOnce((f){
      this.delegate(f);
      this.detach();
    });
  }

  void attach(Dispatch n){
    this.detach();
    this.dispatch = n;
    this.dispatch.listen(this.delegate);
  }

  void detach(){
    if(!this.isActive) return null;
    this.dispatch.unlisten(this.delegate);
    this.dispatch = null;
  }

  void delegate(m);

  DispatchWatcher watch(dynamic m){
    if(!this.isActive) return null;
    return this.dispatch.watch(m);
  }
}

abstract class MultipleStore extends Store{
  Set<Dispatch> dispatchers;

  MultipleStore([Dispatch d]){
    this.dispatchers = new Set<Dispatch>();
    this.dispatchFilter = Middleware.create((m){
      this.dispatchers.forEach((f) => f.dispatch(m));
    });
    this.dispatchFilter.ware((d,next,end) => next());
    this.attach(d);
  }

  bool get isActive => !this.dispatch.isEmpty;

  void attachOnce(Dispatch n){
    n.listenOnce(this.delegate);
  }

  void attach(Dispatch n){
    this.dispatchers.add(n);
    n.delegate(this.delegate);
  }

  void detach(Dispatch n){
    this.dispatchers.remove(n);
    n.unlisten(this.delegate);
  }

  void delegate(m);

  DispatchWatcher watch(dynamic m){
    if(!this.isActive) return null;
    var dw = [];
    this.dispatchers.forEach((f){
      dw.add(f.watch(m));
    });
    return Dispatch.waitForAlways(dw).watch(m);
  }
}

class DispatchWatcher{
  final Switch _active = Switch.create();
  final Streamable<Map> streams = new Streamable<Map>();
  final dynamic message;
  Dispatch dispatch;
  Middleware watchMan;
  
  static create(f,m) => new DispatchWatcher(f,m);
  DispatchWatcher(dispatch,this.message){
    if(this.message is! RegExp && this.message is! String && this.message is! Function) 
      throw "message must either be a RegExp/a String/a Function for dispatch watchers";
    this.watchMan = Middleware.create((f){
      this.streams.emit(f);
    });
    this.watchMan.ware((d,next,end) => next());
    this._active.switchOn();
    this.attach(dispatch);
  }
  
  bool get isActive => this._active.on();

  void _delegate(f){
      if(!f.containsKey('message')) 
        return this.streams.emit(f); 
      Funcs.when(Valids.isFunction(this.message),(){
        if(Valids.falsy(this.message(f))) return null;
        this.watchMan.emit(f);
      });
      Funcs.when(Valids.isRegExp(this.message),(){
        if(!this.message.hasMatch(f['message'])) return null;
        this.watchMan.emit(f);
      });
      Funcs.when(Valids.isString(this.message),(){
        if(!Valids.match(this.message,f['message'])) return null;
        this.watchMan.emit(f);
      });
  }

  void send(Map m){
    if(!this.isActive) return null;
    this.dispatch.dispatch(m);
  }

  void pause() => this.streams.pause();
  void resume() => this.streams.resume();
  void listen(Function n) => this.streams.on(n);
  void listenOnce(Function n) => this.streams.onOnce(n);
  void unlisten(Function n) => this.streams.off(n);
  void unlistenOnce(Function n) => this.streams.offOnce(n);

  void attach(Dispatch n){
    this.detach();
    this.dispatch = n;
    this.dispatch.listen(this._delegate);
  }

  void detach(){
    if(!this.isActive || Valids.notExist(this.dispatch)) return null;
    this._active.switchOff();
    this.dispatch.unlisten(this._delegate);
    this.dispatch = null;
  }

  void destroy(){
    if(!this.isActive) return null;
    this.detach();
    this.streams.close();
  }

}

class Dispatch{
  final Switch active = Switch.create();
  final Streamable dispatchs = new Streamable<Map>();

  static Dispatch forAny(List<DispatchWatcher> ds){
    var dw = Dispatch.create();
    ds.forEach((f) => f.listen(dw.dispatch));
    return dw;
  }

  static Dispatch forAnyOnce(List<DispatchWatcher> ds){
    var dw = Dispatch.create();
    ds.forEach((f) => f.listenOnce(dw.dispatch));
    return dw;
  }

  static Dispatch waitForAlways(List<DispatchWatcher> ds){
    var dw = Dispatch.create();
    var vals = new List<Map>();
    var init = (){
      var m = new List.from(vals);
      vals.clear();
      m.forEach(dw.dispatch);
    };

    ds.forEach((f){
      f.listen((g){
        vals.add(g);
        if(vals.length >= ds.length) return init();
      });
    });

    return dw;
  }

  static Dispatch waitFor(List<DispatchWatcher> ds){
    var dw = Dispatch.create();
    var comp = new Completer();
    var fds = new List<Future>();
    Enums.eachAsync(ds,(e,i,o,fn){
      var c = new Completer();
      e.listenOnce(c.complete);
      fds.add(c.future);
      return fn(null);
    },(_,err){
      Future.wait(fds)
      .then(comp.complete)
      .catchError(comp.completeError);
    });

    comp.future.then((data){
      data.forEach(dw.dispatch);
    });

    return dw;
  }

  static Dispatch create() => new Dispatch();

  Dispatch(){
    this.active.switchOn();
  }

  bool get isActive => this.active.on();

  void dispatch(Map m){
    if(!this.isActive || Valids.notExist(m)) return null;
    if(m.containsKey('message') && !Valids.isString(m['message'])) return null;
    this.dispatchs.emit(m);
  }

  DispatchWatcher watch(dynamic message){
    if(!this.isActive) return null;
    return DispatchWatcher.create(this,message);
  }

  void pause() => this.dispatchs.pause();
  void resume() => this.dispatchs.resume();
  void listen(Function n) => this.dispatchs.on(n);
  void listenOnce(Function n) => this.dispatchs.onOnce(n);
  void unlisten(Function n) => this.dispatchs.off(n);
  void unlistenOnce(Function n) => this.dispatchs.offOnce(n);
  void destroy(){
    if(!this.isActive) return null;
    this.active.switchOff();
    this.dispatchs.close();
  }
}

class StreamManager{
  MapDecorator dispatchs;

  static create() => new StreamManager();

  StreamManager(){
    this.dispatchs = MapDecorator.create();
  }

  Streamable register(String tag) => this.dispatchs.add(tag,Streamable.create()) && this.get(tag);
  void unregister(String tag) => this.dispatchs.has(tag) && this.dispatchs.get(tag).close();
  Streamable get(String tag) => this.dispatchs.get(tag);

  void _unless(tag,n){
    if(!this.dispatchs.has(tag)) return null;
    return n(this.get(tag)); 
  }

  void bind(String t,Function n) => this._unless(t,(f) => f.on(n));
  void unbind(String t,Function n) => this._unless(t,(f) => f.off(n));
  void bindOnce(String t,Function n) => this._unless(t,(f) => f.onOnce(n));
  void unbindOnce(String t,Function n) => this._unless(t,(f) => f.offOnce(n));

  void destroy(){
    this.dispatchs.onAll((v,k) => k.close());
    this.dispatchs.clear();
  }
}

