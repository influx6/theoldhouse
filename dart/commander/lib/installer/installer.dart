library commander.installer;

import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:hub/hub.dart';
import 'package:commander/commander.dart';
import 'package:commander/io/io.dart';
import 'package:commander/platform/platform.dart';
import 'package:path/path.dart' as paths;

Commander installCommand = Funcs.immediate((){

  var current = Platform.script.toFilePath();
  var dart = Platform.environment['_'];
  var isWin = Platform.isWindows;
  var pwd = Directory.current.absolute.path;

  var installer = Commander.create();

  installer.add('install');
  installer.add('uninstall');

  installer.add('install-zord');
  installer.add('uninstall-zord');

  installer.on('help',(args){
    installer.es.fireEvent('help',(""" 
        
    ->  installer:Commander: Provides a commandline interface to install a file in the systems bin directory

          Commands:
            install: installs a valid dart file as a commandline executable
            uninstall: removes the file from the runnable list
            install-zord: installs the commander executable file
            uninstall-zord: uninstalls the commander executable file

    """));
  });

  installer.on('install-zord',(List args){
    if(args.isEmpty) 
      return installer.es.fireEvent('install-zord','supply the location to install zord');
    var to = Enums.first(args);
    installer.analyze(['install',current,to,'zord']);
  });

  installer.on('uninstall-zord',(List args){
    if(args.isEmpty) 
      return installer.es.fireEvent('uninstall-zord','supply the location to uninstall zord');
    var to = Enums.first(args);
    installer.analyze(['uninstall',to,'zord']);
  });
  
  installer.on('install',(List args){
    if(args.isEmpty || !Valids.maybeLength(args,3)) 
      return installer.es.fireEvent('install','supply the file and path to install to!');

    var file = Enums.first(args);
    var path = Enums.second(args);
    var alias = Enums.third(args);

    var ff = new File(file),fp = new Directory(path);
    var fabs = ff.absolute.path, pabs = fp.absolute.path;

    var end = paths.join(pabs,alias);

    ioCommand.onEvent('writefile',(g){
      platformCommand.analyze(['chmod',end,'-R','+x']);
    });

    if(!isWin){

      ioCommand.fire('writefile',[end,"""  
#!/bin/sh

type dart > /dev/null

if [ \$? -eq 1 ]; then
  echo "Please add the dart-sdk/bin path to your environments \$PATH!";
else
  dart $fabs \$*
fi
  
""".replaceAll('\t','')]);

    }else{

      ioCommand.fire('writefile',[end,"""  
@IF EXIST "%~dp0\dart.exe" (
  "%~dp0\dart.exe"  "$fabs" %*
) ELSE (
  dart  "$fabs" %*
)
      """.replaceAll('\t','')]);

    }

    installer.es.fireEvent('install','$file installed $path as $alias');

  });

  installer.on('uninstall',(List args){
    if(args.isEmpty || !Valids.maybeLength(args,2)) 
      return installer.es.fireEvent('install','supply the file and path to install to!');

    var path = Enums.first(args);
    var alias = Enums.second(args);

    var fp = new Directory(path),pabs = fp.absolute.path;
    var end = paths.join(pabs,alias);

    ioCommand.analyze(['destroyfile',end]);

  });

  return installer;
});
