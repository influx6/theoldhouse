part of socketful;

abstract class SocketTransport{
  Completer _initd = new Completer();
  Completer _opened;
  Completer _closed;
  MapDecorator conf;
  sm.Streamable _inStreams,outStreams;
  Middleware errorMutator,sendMutator,receiveMutator;
  DualBind binder;

  SocketTransport(Map m){
    this.conf = MapDecorator.useMap(Enums.merge({
      'url': 'ws://127.0.0.1/ws',
      'protocols': []
    },Funcs.switchUnless(m,{})));

    this._opened = new Completer();
    this._closed = new Completer();
    this.binder = DualBind.create((n){});

    //data streams of data going in and out
    this.outStreams = sm.Streamable.create();
    this._inStreams = sm.Streamable.create();

    //mutators for handling listening and reactions
    this.sendMutator = Middleware.create(this.binder.first);
    this.receiveMutator = Middleware.create(this.binder.second);
    this.errorMutator = Middleware.create(Funcs.identity);

    //mutators for handling transport types
    //and changing the data necessary to fit task

    this.outStreams.on(this.sendMutator.emit);
    this._inStreams.on(this.receiveMutator.emit);

    this.outStreams.pause();
    this._inStreams.pause();

    this._initd.future.then(this._opened.complete)
    .catchError((e){
      this._opened.completeError(ConnectionErrored.create(e));
    });

    this.whenOpened.catchError((e){
      this.close();
    });

    this.doSocketInitialization();
  }

  void init(){
    this.whenOpened.then((f){
      this.outStreams.resume();
      this._inStreams.resume();
    });
  }

  String get identity;

  Future get whenOpened => this._opened.future;
  Future get whenClosed => this._closed.future;

  bool get isOpened => this._opened.isCompleted;
  bool get isClosed => this._closed.isCompleted;

  void pauseAll(){
    this.outStreams.pause();
    this._inStreams.pause();
  }

  Future open(){
    if(this.isClosed) 
      return new Future.error(ConnectionClosed.create());
    if(this.isOpened) return this.whenOpened;
    return this.whenOpened;
  }

  Future close(){
   if(!this.isOpened) return new Future.error(ConnectionNotOpened.create());
   if(this.isClosed)  return this.whenClosed;
   this.whenOpened.then((f){
      this._closed.complete(f);
   },onError: (e){
      this._closed.completeError(ConnectionErrored.create(e));
   });
   return this.whenClosed;
  }

  void doSocketInitialization();

  void sendPacket(dyanmic packet){
    this.outStreams.emit(packet);
  }

}

class Type{
  final String type;
  const Type(this.type);
  bool operator==(Type t){
    var me = this.type.toLowerCase();
    var them = t.type.toLowerCase();
    return me == them;
  }
  String get trueValue => this.type.toLowerCase();
  String toString(){
    return "DirectiveType#${type.toUpperCase()}";
  }
}

class Types{
  static Type json = const Type('Json');
  static Type blob = const Type('Blob');
  static Type buffer = const Type('ArrayBuffer');
}

class SocketBridge extends Dispatch{
  final String UNENCODED = Hub.randomString(2,5);
  final String UNDECODED = Hub.randomString(2,5);
  final String CLOSED_ID = Hub.randomString(2,5);
  final String SEND_ID = Hub.randomString(2,5);
  final String RECEIVED_ID = Hub.randomString(2,5);
  final String OPENED_ID = Hub.randomString(2,5);
  final String ID = Hub.randomString(2,5);
  SocketTransport transport;
  DispatchWatcher onClose;
  DispatchWatcher onOpen;
  DispatchWatcher onSend;
  DispatchWatcher onReceive;
  Type _directive;

  static create(t) => new SocketBridge(t);

  Middleware get outStream => this.transport.outStream;
  Middleware get inBus => this.transport.receiveMutator;
  Middleware get outBus => this.transport.sendMutator;
  Middleware get errBus => this.transport.errorMutator;

  SocketBridge(this.transport){
    this.onOpen = this.watch(this.OPENED_ID);
    this.onClose = this.watch(this.CLOSED_ID);
    this.onSend = this.watch(this.SEND_ID);
    this.onReceive = this.watch(this.RECEIVED_ID);

    this.transport.binder.gn = (e){
      this.dispatch({
        'message':this.RECEIVED_ID,
        'data': e
      });
    };

    this.outBus.reverseStacking();
    this.inBus.reverseStacking();

    this.onSend.listen((m){
      return this.transport.sendPacket(m['data']);
    });

    this.onReceive.listen((d){
      this.dispatch(d['data']);
    });

    var unTransform = (key,d,e){
      return {
        'message':key,
        'data': d,
        'error':e.message
      };
    };

    this.inBus.ware((d,next,end){
      Funcs.when(!this.matchDirective(Types.json) && !this.matchDirective(Types.blob) && !this.matchDirective(Types.buffer),(){
        var decoded;
        try{
          decoded = JSON.decode(d);
        }catch(e){
          decoded = unTransform(this.UNDECODED,d,e);
          this.transporter.errorMutator.emit(decoded);
        }
        return end(decoded);
      },(){
        return next();
      });
    });

    this.outBus.ware((d,next,end){
      Funcs.when(!this.matchDirective(Types.json) && !this.matchDirective(Types.blob) && !this.matchDirective(Types.buffer),(){
        var decoded;
        try{
          decoded = JSON.decode(d);
        }catch(e){
          decoded = unTransform(this.UNDECODED,d,e);
          this.transporter.errorMutator.emit(decoded);
        }
        return end(decoded);
      },(){
        return next();
      });
    });

    this.inBus.ware((d,next,end){
      Funcs.when(this.matchDirective(Types.json),(){
        var decoded;
        try{
          decoded = JSON.decode(d);
        }catch(e){
          decoded = unTransform(this.UNDECODED,d,e);
          this.transporter.errorMutator.emit(decoded);
        }
        return end(decoded);
      },(){
        return next();
      });
    });

    this.outBus.ware((d,next,end){
      Funcs.when(this.matchDirective(Types.json),(){
        var encoded;
        try{
          encoded = JSON.encode(d);
        }catch(e){
          encoded = unTransform(this.UNENCODED,d,e);
          this.transporter.errorMutator.emit(encoded);
        }
        return end(encoded);
      },(){
        return next();
      });
    });

    this.transport.whenOpened.then((f){
      this.dispatch({'message':this.OPENED_ID, 'data': this});
    });

    this.transport.whenClosed.then((f){
      this.dispatch({'message':this.CLOSED_ID, 'data': this});
    });

    this.directive = Types.json;
  }

  Type get directive => this._directive;
  Type set directive(Type t){
    try{
      if(Types.buffer == t){
        this.transport.socket.binaryType = t.trueValue;
      }
      if(Types.blob == t){
        this.transport.socket.binaryType = t.trueValue;
      }
    }catch(e){
      //do nothing
    }
    this._directive = t;
  }
  
  Map mapData(String tag,dynamic n){
    var data = n;
    if(Valids.isOnlyObject(n)){
      try{
        data = n.toJSON();
      }catch(e){
        data = n.toString();
      }
    };

    return {
      'message': tag,
      'data': data
    };
  }

  Future get open => this.transport.open().then((k){
    return this;
  });

  Future get close => this.transport.close().then((k){
    return this;
  });

  void send(String tag,dynamic n){
    var m = this.mapData(tag,n);
    this.dispatch({'message':this.SEND_ID,'data':m});
  }

  bool matchDirective(Type t) => this.directive == t;

  dynamic get identity => this.transport.identity;

  void init(){
    this.transport.init();
  }

  void destroy(){
    this.pause();
    this.transport.pauseAll();
    this.onClose.destroy();
    this.onOpen.destroy();
    this.transport.close();
    super.destroy();
  }
}


class SocketStore extends DispatchWatcher{
  final MapDecorator store = MapDecorator.create();

  static create(s,b) => new SocketStore(s,b);

  SocketStore(space,SocketfulBase base): super(base,space){
    var remove = SocketfulBase.Actions.get('removed');
    var add = SocketfulBase.Actions.get('added');

    this.watchMan.ware((d,next,end){
      var bit = d['action'];
      var sock = d['socket'];
      if(bit == remove){
        this.store.destroy(sock.ID);
        return end(null);
      }
      return next();
    });

    this.watchMan.ware((d,next,end){
      var bit = d['action'];
      var sock = d['socket'];
      if(bit == add){
        this.store.add(sock.ID,sock);
        sock.init();
      }
      next(sock);
    });

  }


  void close(){
    this.pause();
    this.store.onAll((n,k){
      k.destroy();
    });
    return super.destroy();
  }
}

abstract class SocketfulBase extends Dispatch{
  final MapDecorator stores = MapDecorator.create();
  final sm.Streamable errors = sm.Streamable.create();
  MapDecorator conf;

  static MapDecorator Actions = MapDecorator.useMap({
    'added':1,
    'removed': 2
  });

  SocketfulBase([Map m]){
    this.conf = MapDecorator.useMap(Funcs.switchUnless(m,{}));
    this.conf.add('origin','*/*');
  }

  void attach(f);

  void attachBridge(SocketBridge d){

    d.onClose.listen((n){
      this.dispatch({
        'message':d.identity,
        'action': SocketfulBase.Actions.get('removed'),
        'socket': d
      });
    });

    this.dispatch({
      'message':d.identity,
      'action': SocketfulBase.Actions.get('added'),
      'socket': d
    });

    /*d.init();*/
  }

  bool hasSocket(String path) => this.stores.has(path);
  dynamic getSocket(String path) => this.stores.get(path);

  dynamic removeSocket(String path){
    var n = this.stores.destroy(path);
    if(Valids.exist(n)) n.close();
    return n;
  }

  void addSocket(String path,SocketStore store){
    if(this.stores.has(path)) return null;
    this.stores.add(path,store);
  } void close(){
    this.pause();
    this.stores.onAll((n,k){
        k.close();
    });
  }

}
