library specs.io;

import 'dart:io';
import 'dart:async';
import 'package:commander/commander.dart';
import 'package:commander/io/io.dart';
import 'package:hub/hub.dart';

void main(List a){
 
  jazzUp((_){

    _.group('can i catch arguments',(g){

      g.test('arguments tests')
      .rackAsync('can catch 1 from the arguments',(f,next,gf){
          ioCommand.es.on('default',(n){
            Expects.asserts(1,Enums.first(n));
            next();
          });
      })
      .emit(true);

    });

    _.group('io operations',(g){

      g.test('read a file')
      .rackAsync('can i read myself?',(f,next,t){
        ioCommand.es.on('readfile',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);


      g.test('write a file')
      .rackAsync('can i write myself?',(f,next,t){
        ioCommand.es.on('writefile',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);

      g.test('append a file')
      .rackAsync('can i append myself?',(f,next,t){
        ioCommand.es.on('appendfile',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);

      g.test('destroy a file')
      .rackAsync('can i destroy io.text?',(f,next,t){
        ioCommand.es.on('destroyfile',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);
      
      g.test('create a dir')
      .rackAsync('can i create directory called folds?',(f,next,t){
        ioCommand.es.on('makedir',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);

      g.test('destroy a dir')
      .rackAsync('can i destroy folds?',(f,next,t){
        ioCommand.es.on('destroydir',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);

      g.test('create a link')
      .rackAsync('can i create io.txt link to io.back?',(f,next,t){
        ioCommand.es.on('link',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);

      g.test('destroy a link')
      .rackAsync('can i destroy io.text link?',(f,next,t){
        ioCommand.es.on('unlink',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);

      g.test('write a byte to a file')
      .rackAsync('can i write bytes to io.bytes?',(f,next,t){
        ioCommand.es.on('writebyte',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);

      g.test('append byte a file')
      .rackAsync('can i append bytes?',(f,next,t){
        ioCommand.es.on('appendbyte',t((e){
          Expects.truthy(e);
          Expects.isString(e);
          next();
        }));
      }).emit(true);
    });

  });

  ioCommand.fire('default',[1]);
  ioCommand.fire('readfile',['./io.dart']);
  ioCommand.fire('writefile',['./io.text','max: sucks to be you john!']);
  ioCommand.fire('appendfile',['./io.text',"\njohn: not it doesn't!"]);
  ioCommand.fire('writebyte',['./io.byte','max: sucks to be you john!']);
  ioCommand.fire('appendbyte',['./io.byte',"\njohn: not it doesn't!"]);
  ioCommand.fire('link',['./io.text','io.back']);
  ioCommand.fire('destroyfile',['./io.text']);
  ioCommand.fire('unlink',['./io.back']);
  ioCommand.fire('makedir',['./folds']);
  ioCommand.fire('destroydir',['./folds']);

}
