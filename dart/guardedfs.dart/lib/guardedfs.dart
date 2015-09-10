import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:hub/hub.dart';
import 'package:path/path.dart' as paths;
import 'package:streamable/streamable.dart' as sm;

export 'package:path/path.dart';

class FileNotFound extends FileSystemException{
    FileNotFound(String msg,[path]): super(msg,path);
}

class GuardedFile{
	MapDecorator links = new MapDecorator();
	MapDecorator options;
	Switch writable;
	File f;

	static create(n,m,[l]) => new GuardedFile(path:n,readonly:m, lockRoot: l);
        static use(n,m,[l]) => new GuardedFile.openFile(path:n,readonly:m,lockRoot:l);

        static Future isFilePath(String path){
          if(FileSystemEntity.typeSync(path) != FileSystemEntityType.File) return new Future.error(new FileSystemExeption('NOT A File!',path));
          return new Future.value(path);
        }

	GuardedFile({String path, bool readonly: false, lockRoot: false}){
		this.options = new MapDecorator.from({'readonly': readonly, 'path':path, 'lockRoot': lockRoot});
		this.f = new File(this.options.get('path'));
		this.writable = Switch.create();
		if(!readonly) this.writable.switchOn();
	}
  
	GuardedFile.openFile({String path, bool readonly: false, lockRoot: false}){
                if(Valids.exist(path)){
                  this.f = new File(path);
                  if(!this.f.existsSync()) throw new FileNotFound("$path does not exist!",path);
                  this.options = new MapDecorator.from({'readonly': readonly, 'path':path, lockRoot: lockRoot});
                  this.writable = Switch.create();
                  if(!readonly) this.writable.switchOn();
                }
	}

	Future fsCheck(){
		var real = this.options.get('path');
		if(FileSystemEntity.typeSync(real) == FileSystemEntityType.NOT_FOUND) return new Future.error(new FileNotFound('NOT FOUND!',real));
		return new Future.value(real);
	}
	
        Future copyTo(String path){
          path = paths.normalize(path);
          var file = new Completer();
          GuardedFS.pathExists(path).then((n){
            return  file.complete(GuardedFile.create(n,true));
          }).catchError((n){
            var f = GuardedFile.create(path,false);
            this.readAsString().then(f.writeAsString);
            file.complete(f);
          });

          return file.future;
        }

	Future linkTo(String path){
		if(this.links.has(path)) return this.link.get(path);
		var absDir = this.f.absolute;
		var rpath = paths.normalize(path);
		var link = new Link(rpath);
		if(!!link.existsSync()){
			this.links.add(path,link);
			return new Future.value(link);
		}

		return link.create(absDir.path).then((_){
			this.links.add(path,_);
			return _;
		});
	}

	Future unlinkTo(String path){
		if(!this.links.has(path)) return new Future.error('directory has no such link: $path');
		return this.links.get(path).delete();
	}

	Future renameLinkTo(String path,String newName){
		if(!this.links.has(path)) return new Future.error('directory has no such link: $path');
		return this.links.get(path).rename(newName);
	}
	
	Future rename(String name){
		if(!this.writable.on()) return null;
		return this.f.rename(name);
	}

	dynamic renameSync(String name){
		if(!this.writable.on()) return null;
		return this.f.rename(name);
	}

	Future open(FileMode mode){
		if(!this.writable.on() && (mode == FileMode.WRITE || mode == FileMode.APPEND)) return null;
		return this.f.open(mode:mode);
	}

	dynamic openSync(FileMode mode){
		if(!this.writable.on() && (mode == FileMode.WRITE || mode == FileMode.APPEND)) return null;
		return this.f.openSync(mode:mode);
	}

	dynamic openRead([int start,int end]){
		return this.f.openRead(start,end);
	}

	dynamic openWrite([FileMode mode, Encoding encoding]){
		if(!this.writable.on()) return null;
		return this.f.openWrite(mode:Hub.switchUnless(mode, FileMode.WRITE),encoding:Hub.switchUnless(encoding, UTF8));
	}
	
	dynamic openAppend([Encoding encoding]){
	  return this.openWrite(FileMode.APPEND,encoding);
	}

	Future readAsBytes(){
		return this.f.readAsBytes();
	}

	dynamic readAsBytesSync(){
		return this.f.readAsBytesSync();
	}

	Future readAsLines([Encoding enc]){
		return this.f.readAsBytes();
	}

	dynamic readAsLinesSync([Encoding enc]){
		return this.f.readAsBytesSync();
	}

	Future readAsString([Encoding enc]){
		return this.f.readAsString(encoding: Hub.switchUnless(enc, UTF8));
	}

	dynamic readAsStringSync([Encoding enc]){
		return this.f.readAsStringSync(encoding: Hub.switchUnless(enc, UTF8));
	}

	Future writeAsString(String contents, [FileMode mode, Encoding encoding]){
		if(!this.writable.on()) return null;
		return this.f.writeAsString(contents,mode: Hub.switchUnless(mode, FileMode.WRITE),encoding: Hub.switchUnless(encoding, UTF8));
	}
  
	dynamic appendAsString(String contents,[Encoding enc]){
	  return this.writeAsString(contents, FileMode.APPEND, enc);
	}
	
	dynamic writeAsStringSync(String contents, [FileMode mode, Encoding encoding]){
		if(!this.writable.on()) return null;
		return this.f.writeAsStringSync(contents,mode: Hub.switchUnless(mode, FileMode.WRITE),encoding: Hub.switchUnless(encoding, UTF8));
	}

	dynamic appendAsStringSync(String contents,[Encoding enc]){
	    return this.writeAsStringSync(contents, FileMode.APPEND, enc);
	}
	 
	Future writeAsBytes(List<int> bytes, [FileMode mode]){
		if(!this.writable.on()) return null;
		return this.f.writeAsBytes(bytes,mode: Hub.switchUnless(mode, FileMode.WRITE));
	}
  
	dynamic appendAsBytes(List<int> bytes){
	  return this.writeAsBytes(bytes, FileMode.APPEND);
	}
	
	dynamic writeAsBytesSync(List<int> bytes, [FileMode mode]){
		if(!this.writable.on()) return null;
		return this.f.writeAsBytesSync(bytes,mode: Hub.switchUnless(mode, FileMode.WRITE));
	}

  	dynamic appendAsBytesSync(List<int> bytes){
	    return this.writeAsBytesSync(bytes, FileMode.APPEND);
	}
	 
	Future delete([bool r]){
		if(!this.writable.on()) return null;
		return this.f.delete(recursive: Hub.switchUnless(r,true));
	}

	void deleteSync([bool r]){
		if(!this.writable.on()) return null;
		return this.f.deleteSync(recursive: Hub.switchUnless(r,true));
	}

	Future exists(){
		return this.f.exists();
	}

	bool existsSync(){
		return this.f.existsSync();
	}

	Future stat(){
		return this.f.stat();
	}

	dynamic statSync(){
		return this.f.statSync();
	}

	String get path => this.f.path;
	String get absolutePath => this.f.absolute.path;

	dynamic get lastModified => this.f.lastModified();
	dynamic get lastModifiedSync => this.f.lastModifiedSync();

	dynamic get length => this.f.length();
	dynamic get lengthSync => this.f.lengthSync();

	bool get isWritable => this.writable.on();
	bool get isFile => true;
}

class GuardedDirectory{
	MapDecorator options;
	MapDecorator links;
	Switch writable;
	Switch rootlocked;
	Directory d;
	dynamic dm;
  
	static create(n,m,[l]) => new GuardedDirectory(path:n,readonly:m,lockRoot:l);
	static use(n,m,[l]) => new GuardedDirectory.openDir(path:n,readonly:m, lockRoot:l);
	
	GuardedDirectory({String path, bool readonly: false,bool lockRoot: false}){
          if(!Valids.exist(path)) throw "path must be specified";
          this.d = new Directory(path);
          this._init(readonly,path,lockRoot);
	}

	GuardedDirectory openDir({String path, bool readonly: false, bool lockRoot:false}){
          if(!Valids.exist(path)) throw "path must be specified";
          this.d = new Directory(path);
          if(Valids.not(this.d.existsSync())) throw new FileNotFound('$path does not exist!',path);
          this._init(readonly,path,lockRoot);
	}

        void _init(readonly,path,lockRoot){
          this.options = new MapDecorator.from({'readonly':readonly, 'path':path,'lockRoot': lockRoot});
          this.links = new MapDecorator();
          this.writable = Switch.create();
          this.rootlocked = Switch.create();
          if(!readonly) this.writable.switchOn();
          if(lockRoot) this.rootlocked.switchOn();
        }

	dynamic createDirSync([bool f]){
	    if(!this.writable.on() && !this.d.existsSync()) return this;
	    this.d.create(recursive: Hub.switchUnless(f, true));
	    return this;
	}
	  
	Future createDir([bool f]){
	    if(!this.writable.on() && !this.d.existsSync()) return new Future.value(this);
	    return this.d.create(recursive:  Hub.switchUnless(f, true)).then((_){ return this; });
	}

	Future openNewDir(String name,[bool r]){
            return new Future((){
              var root = paths.join(this.options.get('path'),name);
              this.checkLock(root);
              var dir = new GuardedDirectory.openDir(path:root,readonly:this.options.get('readonly'));
              return dir.createDir(r).then((j){ return dir; });
            });
	}

	dynamic openNewDirSync(String name,[bool r]){
	    var root = paths.join(this.options.get('path'),name);
            this.checkLock(root);
            var dir = new GuardedDirectory.openDir(path:root,readonly:this.options.get('readonly'));
            dir.createDirSync(r);
            return dir;
	}

	Future createNewDir(String name,[bool r]){
            return new Future((){
              var root = paths.join(this.options.get('path'),name);
              this.checkLock(root);
              var dir = GuardedDirectory.create(root,this.options.get('readonly'));
              return dir.createDir(r).then((j){ return dir; });
            });
	}

	dynamic createNewDirSync(String name,[bool r]){
	    var root = paths.join(this.options.get('path'),name);
            this.checkLock(root);
            var dir = GuardedDirectory.create(root,this.options.get('readonly'));
            dir.createDirSync(r);
            return dir;
	}

	Future createTemp(String name){
            if(!this.writable.on()) return null;
            return this.d.createTemp(name);
	}

	dynamic createTempSync(String name){
            if(!this.writable.on()) return null;
            return this.d.createTempSync(name);
	}

        void checkLock(String path){
          if(this.rootlocked.on()){
            if(paths.isWithin(this.options.get('path'),path)) return true;
            throw new FileSystemException("Directory is locked and cant move out of current root directory!");
          }
        }

	Future fsCheck(String path){
		var real = paths.join(this.options.get('path'),path);
		if(FileSystemEntity.typeSync(real) == FileSystemEntityType.NOT_FOUND) return new Future.error(new FileNotFound('NOT FOUND!',real));
		return new Future.value(real);
	}

	Future linkTo(String path){
		if(this.links.has(path)) return this.link.get(path);
		var absDir = this.d.absolute;
		var rpath = paths.normalize(path);
		var link = new Link(rpath);
		if(!!link.existsSync()){
			this.links.add(path,link);
			return new Future.value(link);
		}

		return link.create(absDir.path).then((_){
			this.links.add(path,_);
			return _;
		});
	}

	Future unlinkTo(String path){
		if(!this.links.has(path)) return new Future.error('directory has no such link: $path');
		return this.links.get(path).delete();
	}

	Future renameLinkTo(String path,String newName){
		if(!this.links.has(path)) return new Future.error('directory has no such link: $path');
		return this.links.get(path).rename(newName);
	}

	  
	dynamic File(String path){
	    var root = paths.join(this.options.get('path'),path);
            this.checkLock(root);
	    return GuardedFile.create(root, this.options.get('readonly'));
	}
  
	dynamic list([bool rec,bool ffl]){
		return this.d.list(recursive: Hub.switchUnless(ffl, false),followLinks: Hub.switchUnless(ffl, true));
	}

	dynamic listSync([bool rec,bool ffl]){
		return this.d.listSync(recursive: Hub.switchUnless(ffl, false),followLinks: Hub.switchUnless(ffl, true));
	}

	sm.Streamable directoryLists([Function transform, bool rec,bool ff]){
	    var transformed = sm.Streamable.create();
	    var fn = Hub.switchUnless(transform, (_){ return _; }); 
	    transformed.transformer.on((n){ return n.path; });
	    this.list(rec,ff).listen(transformed.emit,onDone:(){ 
	    	transformed.end(); 
	    });
	    return transformed;
	}
	 
  	sm.Streamable directoryListsAsString([bool rec,bool ff]){
          return this.directoryLists((o){ return o.path;},rec,ff); 
  	}
  
	Future rename(String name){
		if(!this.writable.on()) return null;
		return this.d.rename(name);
	}

	dynamic renameSync(String name){
		if(!this.writable.on()) return null;
		return this.d.rename(name);
	}

	Future delete([bool r]){
		if(!this.writable.on()) return null;
		return this.d.delete(recursive: Hub.switchUnless(r,true));
	}

	void deleteSync([bool r]){
		if(!this.writable.on()) return null;
		return this.d.deleteSync(recursive: Hub.switchUnless(r,true));
	}

	Future exists(){
		return this.d.exists();
	}

	bool existsSync(){
		return this.d.existsSync();
	}

	Future stat(){
		return this.d.stat();
	}

	dynamic statSync(){
		return this.d.statSync();
	}

	bool get isWritable => this.writable.on();

	String get path => this.d.path;
	String get absolutePath => this.d.absolute.path;

	bool get isDirectory => true;
}


class GuardedFS{
  final cache = Hub.createMapDecorator();
  GuardedDirectory dir;

  static Future pathExists(String path){
      if(FileSystemEntity.typeSync(path) == FileSystemEntityType.NOT_FOUND) return new Future.error(new FileNotFound('NOT FOUND!',path));
      return new Future.value(path);
  }

  static Future isFile(String path){
      var comp = new Completer();
      GuardedFS.pathExists(path).then((_){
        if(FileSystemEntity.typeSync(_) != FileSystemEntityType.FILE) return comp.completeError(new FileSystemException('NOT A File!',_));
        return comp.complete(_);
      },onError: (e){
        comp.completeError(e);
      }).catchError((e) => comp.completeError(e));
      return comp.future;
  }

  static Future isDir(String path){
      var comp = new Completer();
      GuardedFS.pathExists(path).then((_){
        if(FileSystemEntity.typeSync(_) != FileSystemEntityType.DIRECTORY) return comp.completeError(new FileSystemException('NOT A Directory!',_));
        return comp.complete(_);
      },onError: (e) => comp.completeError(e)).catchError((e) => comp.completeError(e));
      return comp.future;
  }

  static create(p,r,[l]) => new GuardedFS(p,r,l);
  static use(p,r,[l]) => new GuardedFS.useFs(p,r,l);
  
  GuardedFS(String path,bool readonly,bool lock){
    lock = Funcs.switchUnless(lock,false);
    this.dir = GuardedDirectory.create(path,readonly,lock);
  }

  GuardedFS useFs(String path,bool readonly,bool lock){
    lock = Funcs.switchUnless(lock,false);
    this.dir = GuardedDirectory.use(path,readonly,lock);
  }

  Future fsCheck(String path){
    var real = paths.join(this.dir.path,path);
    if(FileSystemEntity.typeSync(real) == FileSystemEntityType.NOT_FOUND) return new Future.error(new FileNotFound('NOT FOUND!',real));
    return new Future.value(real);
  }
  
  dynamic File(String path){
    if(this.cache.storage.length > 100) this.cache.flush();
    var dira = this.cache.get(path);
    if(dira != null && dira is GuardedFile) return dira; 
    dira = this.dir.File(path);
    this.cache.add(path,dira);
    return dira;
  }

  dynamic Dir(String path,[bool rec]){
    if(this.cache.storage.length > 100) this.cache.flush();
    var dira = this.cache.get(path);
    if(dira != null && dira is GuardedDirectory) return new Future.value(dira); 
    dira = this.dir.createNewDir(path,rec);
    return dira.then((_){
       this.cache.add(path,_);
       return _; 
    });
  }

  dynamic directoryLists([String path,Function transform, bool rec,bool ff]){
    var dir = (path != null ? this.Dir(path,rec) : new Future.value(this.dir));
    return dir.then((_){
       return _.directoryLists(transform,rec,ff);
    });
  }

  dynamic directoryListsAsString([String path, bool rec,bool ff]){
    var dir = (path != null ? this.Dir(path,rec) : new Future.value(this.dir));
    return dir.then((_){
       return _.directoryListsAsString(rec,ff);
    });	
  }
	
  bool get isWritable => this.dir.isWritable;
	
}
