library socketful;

import 'dart:async';
import 'dart:html';
import 'dart:convert';
import 'package:ds/ds.dart' as ds;
import 'package:hub/hub.dart';
import 'package:streamable/streamable.dart' as sm;
import 'package:dispatch/dispatch.dart';

part 'base.dart';

class SocketTerminal extends SocketTransport{
  WebSocket socket;

  static create(m) => new SocketTerminal(m);

  SocketTerminal(Map m): super(m){
    var uri = Uri.parse(this.conf.get('url'));
    this.conf.add('uri',uri);
    this.conf.add('path',uri.path);
    this.conf.add('retry',10);
    try{
      this.socket = new WebSocket(this.conf.get('url'),this.conf.get('protocols'));
      this._doConnectionState();
    }catch(e){
      this._initd.completeError(ConnectionErrored.create(e));
    }
  }

  String get identity => this.conf.get('path');

  void doSocketInitialization(){
    this.whenOpened.then((f){
      this.binder.fn = this.socket.send;
      this.socket.onError.listen(this.errorMutator.emit);
      this.socket.onMessage.listen(this._inStreams.emit);
      this.socket.onClose.listen((e){
        this.close();
      });
    });
  }

  Future close(){
    if(this.isClosed) return this.whenClosed;
    this.socket.close();
    return super.close();
  }

  bool get socketErrored{
    if(Valids.notExist(this.socket)) return false;
    var readyState = this.socket.readyState;
    var closed = WebSocket.CLOSED;
    var closing = WebSocket.CLOSING;
    return readyState == closed || readyState == closing;
  }

  bool get socketReady{
    if(Valids.notExist(this.socket)) return false;
    var readyState = this.socket.readyState;
    var opened = WebSocket.OPEN;
    return readyState == opened;
  }

  void _doConnectionState(){
    var count = 0,retry = this.conf.get('retry');
    new Timer.periodic(new Duration(milliseconds: 300),(t){
      if(count >= retry) return t.cancel();
      if(!!this.socketReady){
        this._initd.complete(this);
        return t.cancel();
      }
      if(!!this.socketErrored){
        this._initd.completeError(ConnectionNotOpened.create());
        return t.cancel();
      }
      count += 1;
    });
  }

}

class Socketful extends SocketfulBase{
  final RegExp endSlash = new RegExp(r'\/$');
  final RegExp beginSlash = new RegExp(r'^\/');
  
  static create(m) => new Socketful(m);

  Socketful(Map m): super(m);

  void attach(String path){
    var conf = this.conf.clone,
    cleanPath = path.replaceAll(this.beginSlash,''),
    origin = conf['url'].replaceAll(this.endSlash,'');
    conf['url'] = [origin,cleanPath].join('/');
    conf['path'] = path;
    this.attachRequest(conf);
  }

  void attachRequest(Map r){
    if(!this.hasSocket(r['path'])) return null;
    var bridge = SocketBridge.create(SocketTerminal.create(r));
    bridge.inBus.ware((d,next,end) => next(d.data));
    this.attachBridge(bridge);
  }

  SocketStore of(String n,[Function validator(Map f)]){
    if(this.hasSocket(n)) return this.getSocket(n);
    var val = Funcs.switchUnless(validator,(m){
      var message = m['message'],action = m['action'],sock=m['socket'];
      if(Valids.match(message,n)) return true;
      return false;
    });
    var store = SocketStore.create(val,this);
    this.addSocket(n,store);
    return store;
  }


  void close([bool m]){
      super.close();
  }
}
