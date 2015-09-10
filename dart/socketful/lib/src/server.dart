library socketful;

import 'dart:core';
import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:hub/hub.dart';
import 'package:streamable/streamable.dart' as sm;
import 'package:dispatch/dispatch.dart';

part 'base.dart';

class SocketTerminal extends SocketTransport{
  WebSocket socket;

  static create(m) => new SocketTerminal(m);
  static createRoute(m) => new SocketTerminal.Route(m);

  SocketTerminal.Route(Uri uri,[Map m]): super(m){
    this.conf.update('uri',uri);
    this.conf.update('port',uri.port);
    this.conf.update('path',uri.path);
    this.conf.update('query',uri.queryParameters);
    new Future.sync((){
      return WebSocket.connect(uri.toString(),protocols: this.conf.get('protocols'));
    }).then((socket){
      this.socket = socket;
      this._initd.complete(this);
    }).catchError((e){
      this._initd.completeError(e);
    });
  }

  SocketTerminal(HttpRequest req,[Map m]): super(m){
    var uri = req.uri;
    this.conf.update('req',req);
    this.conf.update('conInfo',req.connectionInfo);
    this.conf.update('cookies',req.cookies);
    this.conf.update('_uri',uri);
    this.conf.update('port',uri.port);
    this.conf.update('path',uri.path);
    this.conf.update('query',uri.queryParameters);
    WebSocketTransformer.upgrade(req).then((socket){
      this.socket = socket;
      this._initd.complete(this);
    }).catchError((e){
      this._initd.completeError(e);
    });
  }

  String get identity => this.conf.get('path');

  void doSocketInitialization(){
   val subd = false; 
    this.whenOpened.then((f){
      this.binder.fn = this.socket.add;
      this.socket.listen(this._inStreams.emit,onError:this.errorMutator.emit);
    });
  }

  Future close(){
    if(this.isClosed) return this.whenClosed;
    if(Valids.notExist(this.socket)) return super.close();
    return this.socket.close().then((f){
      return super.close();
    });
  }
}

class Socketful extends SocketfulBase{
  final MapDecorator stores = MapDecorator.create();
  HttpServer _server;

  static Future<Socketful> attachAddress(String path,[int port]){
    var sock = Socketful.create({});
    return HttpServer.bind(path,port)
    .then((f){
      sock.attach(f);
      return sock;
    });
  }

  static Future<Socketful> attachServer(Future<HttpServer> fs){
    var sock = Socketful.create({});
    return fs.then((f){
      sock.attach(f);
      return sock;
    });
  }

  static Future<SocketBridge> attachURI(String url){
    var uri = Uri.parse(url),path = uri.path;
    return SocketBridge.create(SocketTerminal.createRoute(uri)).open.then((f){
      f.init();
      return f;
    });
  }

  static create(m) => new Socketful(m);

  Socketful(Map n): super(n);

  void attach(HttpServer fs){
    this._server = fs;
    fs.listen(this.attachRequest,onError:this.errors.emit);
  }

  void attachRequest(HttpRequest d){
    if(!this.hasSocket(d.uri.path)) 
      return this.giveNiceReply(d);
    if(!this.validateProtocol(d))
      return this.denialRequest(d);
    this.attachBridge(SocketBridge.create(SocketTerminal.create(d)));
  }

  void attachUri(String url){
    var uri = Uri.parse(url),path = uri.path;
    if(!this.hasSocket(path)) return null;
    this.attachBridge(SocketBridge.create(SocketTerminal.createRoute(uri)));
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

  dynamic close([bool f]){
    if(Valids.exist(this._server)) this._server.close(force:f);
    return super.close();
  }

  bool validateProtocol(HttpRequest r){
    var uri = r.uri,headers = r.headers, method = r.method.toLowerCase();

    if(!Valids.match(method,'get')) return false;

    var conn = headers[HttpHeaders.CONNECTION];
    if(Valids.notExist(conn)) return false;

    bool isUpgrade = false;
    conn.forEach((f){
      if(Valids.match(f.toLowerCase(),'upgrade')) isUpgrade = true;
    });

    if(Valids.isFalse(isUpgrade)) return false;

    String upgrade = r.headers.value(HttpHeaders.UPGRADE);
    if(Valids.notExist(upgrade)) return false;
    upgrade = upgrade.toLowerCase();
    if(!Valids.match(upgrade,'websocket')) return false;

    return true;
  }

  void denialRequest(HttpRequest req){
    req.response.statusCode = 500;
    req.response.write('Bad Request: Not a websocket Request!');
    req.response.close();
  }

  void giveNiceReply(HttpRequest req){
    req.response.statusCode = 200;
    req.response.write('Welcome to Socketful!');
    req.response.close();
  }
}
