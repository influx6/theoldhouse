library specs;

import 'dart:async';
import 'dart:io';
import 'package:socketful/server.dart';
import 'package:hub/hub.dart';

main(){
  
    return Socketful.attachAddress('127.0.0.1',3000).then((socks){

        jazzUp((_){

          _.group('can i create a socket transport',(g){

              g.test('can i create a instance')
              .rack('socketful is valid',(f,guard){
                Expects.truthy(f);
                Expects.isTrue(f is Socketful);
              })
              .emit(socks);

              g.test('can i create a socket connection')
              .rackAsync('lets make a socket',(f,next,guard){
                Expects.truthy(f);
                Expects.isTrue(f is SocketStore);
                f.listen((b){
                  next(b);
                });
              })
              .tickAsync('can i get a brigde',2,(f,next,guard){

                Expects.truthy(f);
                Expects.isTrue(f is SocketBridge);

                var ping = f.watch('ping');
                var buffer = f.watch('buffer');
                var server = f.watch('end:server');

                ping.listen(guard((m){
                  Expects.asserts(m['data'],'ping');
                  f.send('ping','pong');
                  next(socks);
                }));

                buffer.listen(guard((m){
                  Expects.isList(m['data']);
                  f.send('buffer','recieved');
                  next(socks);
                }));

                server.listen(guard((m){
                  Expects.asserts(m['data'],0);
                  f.send('end:shutdown',1);
                  socks.close();
                }));

              })
             .emit(socks.of('/records'));

        });

      });

        return socks;
  });

}
