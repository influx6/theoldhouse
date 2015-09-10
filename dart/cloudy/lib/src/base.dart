part of cloudy;


abstract class HistoryNotifier{
  final Distributor delegate = Distributor.create('new-notifies');
  final Distributor notFound = Distributor.create('new-notifies');
  final Switch _useHash = new Switch();
  Completer _booted = new Completer();
  Completer _shutdown = new Completer();
  Switch _active;

  static RegExp hasHash = new RegExp(r'([\w\W]+)#([\w\W]*)');

  static String cleanHash(String url){
    var cleaned = url,groups = HistoryNotifier.hasHash.allMatches(url);
    groups.forEach((f){
      var core = f.group(0);
      cleaned = url.replaceAll(core,core.replaceAll('#','/'));
    });
    return cleaned;
  }


  HistoryNotifier(){
    this._active = Switch.create();
    this._active.switchOn();
    this.notFound.on((r){
      this.delegate.emit({
        'data': r,
        'message': 'notFound'
      });
    });
  }

  bool get usesHash => this._useHash.on();
  bool get isActive => this._active.on();

  void register(String url,String sid){
    return this.registerPattern(new UrlPattern(this.cleanUrl(url)),sid);
  }

  void registerPattern(UrlPattern url,String shoutId){
    this._handleInternal(url,(path){
      if(!this.isActive) return null;
      this.delegate.emit({
        'url':url,
        'data': path,
        'message': shoutId
      });
    });
  }

  void _handleInternal(url,Function n);

  Future boot(){
    if(this._booted.isCompleted) return this._booted.future;
    if(this._shutdown.isCompleted) 
      this._shutdown = new Completer();
    this._booted.complete(this);
    return this._booted.future.then((n){
      this._active.switchOn();
      return this;
    });
  }

  Future shutdown(){
    if(!this._shutdown.isCompleted) return this._shutdown.future;
    if(this._booted.isCompleted) 
      this._booted = new Completer();
    this._shutdown.complete(this);
    return this._shutdown.future.then((n){
      this._active.switchOff();
      return this;
    });
  }

  void bind(Function n) => this.delegate.on(n);
  void bindOnce(Function n) => this.delegate.onOnce(n);
  void unbind(Function n) => this.delegate.off(n);
  void unbindOnce(Function n) => this.delegate.offOnce(n);

  String cleanUrl(String url){
    if(this.usesHash) return url;
    return HistoryNotifier.cleanHash(url);
  }
}

class CloudyHistory extends Dispatch{
  AtomicMap history;
  HistoryNotifier notifier;
  List _recents;
  int _curpos = -1;

  static create([n]) => new CloudyHistory(n);

  CloudyHistory([this.notifier]){
    this.history = AtomicMap.create();
    this._recents = new List();
    this.notifier.bind(this._recents.add);
    this.notifier.bind(this._delegateNotices);
  }

  Future boot() => this.notifier.boot().then((f) => this);
  Future shutdown() => this.notifier.shutdown().then((f) => this);

  void _delegateNotices(m){
    if(!this.history.has(m['message'])) 
      return null;
    this.dispatch(m);
  }

  dynamic push(String key,String path){
    this.history.update(key,path);
    this.notifier.register(path,key);
  }

  dynamic unpush(String key){
    return this.destroy(key);
  }

  Map get last => Enums.last(this._recents);
  Map get first => Enums.first(this._recents);
  Map nth(int n) => Enums.nth(this._recents,n);

  Map cur([int i]){
    i = Funcs.switchUnless(i,0);
    if(Valids.match(this._curpos,-1)){
      this._curpos = this._recents.length - 1;
      this_cursor += i;
      return this._recents[curpos];
    }

    var rs = this._curpos + i;
    if(rs <= 0){
      this._curpos = 0;
      return this.first;
    }
    if(rs >= this.length){
      this._curpos = this.length - 1;
      return this.last;
    }

    return this._recents[rs];
  }

  Map get next => this.cur(1);
  Map get prev => this.cur(-1);
}

class CloudyPages{

  static final String PAGE_ADDED = Hub.randomString(2,4);
  static final String PAGE_REMOVED = Hub.randomString(2,4);

  static Future createPagesWith(CloudyHistoryNotifier hc,[AtomicMap f]){
    return new Future.sync((){
      return new _CloudyPages.withNotifier(CloudyHistory.create(hc),f);
    });
  }

  static Future createPages([n,AtomicMap f]){
    return new Future.sync((){
      return new _CloudyPages(CloudyHistory.create(CloudyHistoryNotifier.create(n)),f);
    });
  }
}

class CloudyBag{
  final Events events = Events.create();
  final _CloudyPages page;
  final dynamic root;
  final dynamic box;

  static create(b,p,r) => new CloudyBag(b,p,r);
  CloudyBag(this.box,this.page,this.root);

  Function get cloudy => this.page.cloudy;
  Function get watch => this.events.createEvent;
  Function get unwatch => this.events.createEvent; 
  Function get on => this.events.on;
  Function get once => this.events.once;
  Function get off => this.events.off;
  Function get offOnce => this.events.offOnce;
  Function get emit => this.events.fireEvent;

  void onCloudy(String name,Function n){
    this.watch(name);
    this.on(name,(t){
        this.cloudy(name,t.$.attr('route'),(page){
            return n(page,t);
        });
    });
  }

  void init() => this.box.init();
}

class _CloudyPages extends Dispatch{
  CloudyHistory history;
  AtomicMap pagesRegistry;
  sm.Streamable blocks;
  AtomicMap pages;
  Locker lock;


  factory _CloudyPages.withNotifier(CloudyHistoryNotifier n,[AtomicMap m]){
    return new _CloudyPages(CloudyHistory.create(n),m);
  }


  _CloudyPages(this.history,[this.pagesRegistry]){
    this.blocks = sm.Streamable.create();
    this.lock = Locker.create();
    this.pages = new AtomicMap<String,CloudPage>();
    this.pages.onAdd.on((n){
      this.dispatch({
        'message': CloudyPages.PAGE_ADDED,
        'page': n['value']
      });
    });
    this.pages.onRemove.on((n){
      this.dispatch({
        'message': CloudyPages.PAGE_REMOVED,
        'page': n['value']
      });
    });

    if(Valids.notExist(this.pagesRegistry)){
      this.pagesRegistry = new AtomicMap<String,Map>();
    }

    this.blocks.on((n){
      this.lock.sendBlock(n);
    });

    this.lock.locked.on((n){
      this.resumeCodes();
    });

    this.lock.unlocked.on((n){
      this.pauseCodes();
    });

    this.pauseCodes();
    this.startHistory();
  }

  //stops the history object listening and providing response
  //to changes in either server requests or url changes,making
  //cloudy pages and page unresponsive/unfunctional until its
  //started up again
  Future startHistory() => this.history.boot();
  Future stopHistory() => this.history.shutdown();
  dynamic watchHistory(String n) => this.history.watch(n);

  void resumeCodes() => this.blocks.resume();
  void pauseCodes() => this.blocks.pause();
  void flushCodes() => this.blocks.forceFlush();
  void sendCode(n) => this.blocks.emit(n);

  CloudyPage cloudy(String exid,String path,[Function fnpage]){
    if(this.hasPage(exid)) return this.getPage(exid);

    if(Valids.exist(this.pagesRegistry)){
      if(!this.pagesRegistry.has(exid)){
        this.pagesRegistry.add(exid,{
          'path':path,
          'effector': fnpage
        });
      }
    }
    
    var conf = this.pagesRegistry.get(exid);
    var page = CloudyPage.create(exid,path,this);
    this.history.push(exid,path);
    this.pages.add(exid,page);
    conf['effector'](page);
    return page;
  }

  bool hasPage(String exid) => this.pages.has(exid);
  CloudyPage getPage(String exid) => this.pages.get(exid);
  CloudyPage ejectPage(String exid) => this.pages.destroy(exid);
  MutexLockd newLock() => this.lock.createLock();

}

class CloudyPage extends Dispatch{
  final String READY = Hub.randomString(2,4);
  final String BLOCKDATA = Hub.randomString(2,4);
  final String ACTIVATED = Hub.randomString(2,4);
  final String DEACTIVATED = Hub.randomString(2,4);
  final String exid,path;
  Middleware blockMutator;
  DispatchWatcher _onHistory,onBlocks,onAdd,onRemove,onActive,onDeactive;
  _CloudyPages root;
  MutexLockd lock;

  static create(id,p,rt) => new CloudyPage(id,p,rt);

  CloudyPage(this.exid,this.path,this.root){
    this.lock = this.root.newLock();
    this._onHistory = this.root.watchHistory(this.exid);
    this.onBlocks = this.watch(this.BLOCKDATA);
    this.onActive = this.watch(this.ACTIVATED);
    this.onDeactive = this.watch(this.DEACTIVATED);

    this.onBlocks.watchMan.ware((data,next,end){
      return next(data['data']);
    });

    this.blockMutator = Middleware.create((b){
      this.dispatch({
        'message': this.BLOCKDATA,
        'data':b
      });
    });

    this.blockMutator.ware((data,next,end){
      return next(data);
    });

    this.onAdd = this.root.watch((n){
      var cur = n['page'],id=n['message'];
      if(Valids.match(id,CloudyPages.PAGE_ADDED) && cur == this)
        return true;
      return false;
    });

    this.onRemove = this.root.watch((n){
      var cur = n['page'],id=n['message'];
      if(Valids.match(id,CloudyPages.PAGE_REMOVED) && cur == this)
        return true;
      return false;
    });

    this.lock.unlocked.on((n){
      this.dispatch({
        'message': this.DEACTIVATED,
        'data':this
      });
    });

    this.lock.locked.on((n){
      this.dispatch({
        'message': this.ACTIVATED,
        'data':this
      });
    });

    this.lock.blocks.on((f){
      return this.blockMutator.emit(f);
    });

    this._onHistory.listen((f){
      this.blockMutator.emit(f);
      this.forceLock();
    });

    this.dispatch({
      'message': this.READY,
      'data': this
    });

  }

 void forceLock() => this.lock.lock();
 void forceUnlock() => this.lock.unlock();

}


