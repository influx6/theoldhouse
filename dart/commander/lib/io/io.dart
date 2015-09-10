library commander;

import 'package:hub/hub.dart';
import 'package:commander/commander.dart';
import 'dart:async';
import 'dart:io';
import 'dart:convert';

Commander ioCommand = Funcs.immediate((){

  var io = Commander.create();

  io.add('link');
  io.add('unlink');

  io.add('destroydir');
  io.add('destroyfile');

  io.add('writebyte');
  io.add('writefile');

  io.add('readbyte');
  io.add('readfile');
  io.add('readdir');

  io.add('appendbyte');
  io.add('appendfile');
  io.add('appendfile');

  io.add('listdir');
  io.add('makedir');

  io.on('help',(args){
    io.es.fireEvent('help',(""" 
        
    ->  io:Commander: Provides a commandline interface for io operations because it uses a simple
        command pattern,allows its embeddment into any environment capable of handling the commands
        queries:

          Commands:
            readfile: read out a file to the stdout stream
            writefile: write into a file from the stdin
            appendfile: append into a file from the stdin
            writebyte: write data as bytes from the stdin
            readbytes: read file contents as bytes from the stdin
            makedir: creates a directory
            destroyfile: deletes a file within the current directory
            destroydir: deletes a directory within the current path
            link: symlinks a file or directory within the directory to another
            unlink: removes a file or directory symlink from the current path
            listdir: read out a directory listings into stdout
            readdir: read out a directory returning a map of both relative and absolute paths 

    """));
  });

  io.on('link',(List args){
    if(args.isEmpty || !Valids.maybeLength(args,2)) 
      return io.es.fireEvent('link','supply the path required!');

    var from = Enums.first(args);
    var to = Enums.second(args);
    var link = new Link(to);

    link.exists().then((f){
      if(Valids.isFalse(f)){
        return link.create(from,recursive: true).then((f){
          return io.es.fireEvent('link','new link added for $from to ${f.path}');
        })
        .catchError((e){
          return io.es.fireEvent('link',e);
        });
      }
      return io.es.fireEvent('link','$from link already exists!');
    });
  });

  io.on('unlink',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('unlink','supply the path required!');

    var from = Enums.first(args);
    var unlink = new Link(from);

    unlink.exists().then((f){
      if(Valids.isTrue(f)){
        return unlink.delete(recursive: true).then((f){
          return io.es.fireEvent('unlink','link removed for $from');
        })
        .catchError((e){
          return io.es.fireEvent('unlink',e);
        });
      }
      return io.es.fireEvent('unlink','$from link does not exists!');
    });
  });

  io.on('listdir',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('listdir','supply the path required!');

    var path = Enums.first(args);
    var tree = Enums.second(args) == 'tree' ? true : false;
    var dir = new Directory(path);

    dir.exists().then((f){
      var lists;
      if(Valids.isTrue(f)){
        try{
          lists = dir.listSync(recursive: tree,followLinks: true);
          return io.es.fireEvent('listdir',Enums.map(lists,(e,i,o) => e.path));
        }catch(e){
           return io.es.fireEvent('listdir','$path directory could not read!');
        }
      }else{
       return io.es.fireEvent('listdir','$path directory does not exists!');
      }
    });
  });

  io.on('readdir',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('readdir','supply the path required!');

    var path = Enums.first(args);
    var tree = Enums.second(args) == 'tree' ? true : false;
    var dir = new Directory(path);

    dir.exists().then((f){
      var lists;
      if(Valids.isTrue(f)){
        try{
          lists = dir.listSync(recursive: tree,followLinks:true);
        }catch(e){
           return io.es.fireEvent('readdir','$path directory could not read!');
        }
        return io.es.fireEvent('readdir',{
          'rel': Enums.map(lists,(e,i,o) => e.path),
          'absolute': Enums.map(lists,(e,i,o) => e.absolute.path)
        });
      }
      return io.es.fireEvent('readdir','$path directory does not exists!');
    });
  });

  io.on('makedir',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('makedir','supply the path required!');

    var path = Enums.first(args);
    var at = Valids.maybeLength(args,2) ? Enums.second(args) : Directory.current.path;
  
    var dir = new Directory(path);

    dir.exists().then((f){

      if(Valids.isFalse(f)){
        return dir.create(recursive: true).then((d){
           return io.es.fireEvent('makedir','directory $path was created at $at!');
        }).catchError((e){
           return io.es.fireEvent('makedir','$path directory could not be created!');
        });
      }

       return io.es.fireEvent('makedir','$path directory already exists!');
    });
    
  });

  io.on('destroydir',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('destroydir','supply the path required!');

    var path = Enums.first(args);
    var dir = new Directory(path);

    if(!dir.existsSync()){
       return io.es.fireEvent('destroydir','$path does not exists!');
    }

    dir.delete().then((f){
       return io.es.fireEvent('destroydir','$path was destroyed');
    })
    .catchError((e){
       return io.es.fireEvent('destroydir',e);
    });
        
  });

  io.on('destroyfile',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('destroyfile','supply the path required!');

    var path = Enums.first(args);
    var file = new File(path);

    if(!file.existsSync()){
       return io.es.fireEvent('destroyfile','$path does not exists!');
    }

    file.delete().then((f){
       return io.es.fireEvent('destroyfile','$path was destroyed');
    })
    .catchError((e){
       return io.es.fireEvent('destroyfile',e);
    });
        
  });

  io.on('readfile',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('readfile','supply the path required!');

    var path = Enums.first(args);
    var file = new File(path);

    if(!file.existsSync()){
       return io.es.fireEvent('readfile','$path does not exists!');
    }

    file.readAsString().then((d){
       return io.es.fireEvent('readfile',d);
    })
    .catchError((e){
      print('error occured $e');
       return io.es.fireEvent('readfile',e);
    });
        
  });

  io.on('readbyte',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('readbyte','supply the path required!');
    var path = Enums.first(args);
    var file = new File(path);
    if(file.existsSync()){
       return io.es.fireEvent('readbyte','$path does not exists!');
    }

    file.readAsBytes().then((data){
       return io.es.fireEvent('readbyte',data);
    })
    .catchError((e){
       return io.es.fireEvent('readbyte',e);
    });
        
  });

  io.on('appendbyte',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('appendbyte','supply the path and data required!');
    var path = Enums.first(args);
    var data = UTF8.encode(Enums.second(args));
    var file = new File(path);

    if(!file.existsSync()){
       return io.es.fireEvent('appendbyte','$path does not exists!');
    }

    file.writeAsBytes(data,mode:FileMode.APPEND).then((n){
       return io.es.fireEvent('appendbyte','data written to $path!');
    })
    .catchError((e){
       return io.es.fireEvent('appendbyte',e);
    });

  });

  io.on('writebyte',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('writebyte','supply the path and data required!');

    
    var path = Enums.first(args);
    var force = Enums.second(args);
    var data = UTF8.encode(Enums.second(args));

    var file = new File(path);

    file.writeAsBytes(data).then((n){
       return io.es.fireEvent('writebyte','data written to $path!');
    })
    .catchError((e){
       return io.es.fireEvent('writebyte',e);
    });

  });

  io.on('appendfile',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('appendfile','supply the path and data required!');

    var path = Enums.first(args);
    var data = Enums.second(args);
    var file = new File(path);

    if(!file.existsSync()){
       return io.es.fireEvent('appendfile','$path does not exists!');
    }

    file.writeAsString(data,mode:FileMode.APPEND).then((n){
       return io.es.fireEvent('appendfile','data written to $path!');
    })
    .catchError((e){
       return io.es.fireEvent('appendfile',e);
    });

  });

  io.on('writefile',(List args){
    if(args.isEmpty) 
      return io.es.fireEvent('writefile','supply the path and data required!');

    var path = Enums.first(args);
    var data = Enums.second(args);
    var file = new File(path);

    file.writeAsString(data).then((n){
       return io.es.fireEvent('writefile','data written to $path!');
    })
    .catchError((e){
       return io.es.fireEvent('writefile',e);
    });

  });

  return io;
});
