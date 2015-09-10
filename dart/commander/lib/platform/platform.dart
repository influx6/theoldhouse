library commander.platform;

import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:hub/hub.dart';
import 'package:commander/commander.dart';
import 'package:commander/io/io.dart';
import 'package:path/path.dart' as paths;

Commander platformCommand = Funcs.immediate((){

  var plat = Commander.create();

  plat.add('chmod');

  plat.on('help',(args){
    plat.es.fireEvent('help',(""" 
        
    ->  platform:Commander: Provides a commandline interface to unix/windows platform command

          Commands:
            chmod: unix command to change the permissions of a file/directory

    """));
  });

  plat.on('chmod',(List args){
    if(args.isEmpty || !Valids.maybeLength(args,3)) 
      return plat.es.fireEvent('chmod','supply the file and path to install to!');

    var file = Enums.first(args);
    var options = Enums.second(args);
    var perm = Enums.third(args);

    if(!Platform.isWindows){

      return Process.run('chmod',[options,perm,file]).then((p){
         if(p.exitCode == 1){
            plat.es.fireEvent("chmod','$file permission couldn't be changed");
            return null;
         } 
        plat.es.fireEvent('chmod','$file permission changed with options $options and code $perm');
      });

    }else{


    }


  });

  return plat;
});
