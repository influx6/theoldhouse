library specs.main;

import 'dart:async';
import 'dart:io';
import 'package:socketful/server.dart';
import 'package:hub/hub.dart';
import 'socketful.dart' as sock;

main(){
  
  sock.main().then((socks){

    Socketful.attachURI('ws://127.0.0.1:3000/records').then((record){

      jazzUp((_){

        var pong = record.watch('ping');
        var buffer = record.watch('buffer');
        var end = record.watch('end:shutdown');

        end.listen((f){
          if(Valids.asserts(f['data'],1))
            return record.close();
        });

        _.group('can i use server-to-server websocket',($){

            $.test('is it a valid socketbridge')
            .rack('new connection',(f,g){
              Expects.truthy(f);
              Expects.isTrue(f is SocketBridge);
            })
            .emit(record);

            $.test('listen to socket messages')
            .rackAsync('can i ping?',(f,next,g){
               pong.listen(g((m){
                 Expects.isMap(m);
                 Expects.asserts(m['data'],'pong');
                 next();
               }));
            })
            .rackAsync('can i send buffer?',(f,next,g){
               buffer.listen(g((m){
                 Expects.isMap(m);
                 Expects.isString(m['data']);
                 next();
               }));
            })
            .emit(true);

        });

      });
  

      record.send('ping','ping');
      record.send('buffer',['shell sock']);
      record.send('end:server',0);

    });

  });

}
