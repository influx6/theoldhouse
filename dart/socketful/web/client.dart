library spec;

import 'dart:core';
import 'package:socketful/client.dart';
import 'package:hub/hubclient.dart';

void main(){

  jazzUp((_){ 

    _.group('can i create a socket transport',(g){

      var socks = Socketful.create({
        'url':'ws://127.0.0.1:3000/',
        'route':'sock_io',
      });
      var records = socks.of('/records');

      records.listen((bridge){

        bridge.onSend.listen(Funcs.tag('bridge-outtransmission'));
        bridge.onReceive.listen(Funcs.tag('bridge-intransmission'));

        var buffer = bridge.watch('buffer');
        var server = bridge.watch('end:shutdown');
        buffer.listen(Funcs.tag('buffer-transmission'));

        bridge.send('ping','ping');
        bridge.send('drill',{'name':'london'});
        bridge.send('buffer',[12,323,32,32]);

        server.listen((m){
          print('closing socks');
          socks.close();
        });

        bridge.send('end:server',0);
      });

      g.test('create a transport using websocketTransport class')
      .rack('basic transport with websocket transport',(f,guard){
          Expects.truthy(f);
          Expects.isTrue(f is Socketful);
      })
      .emit(socks);

      socks.attach('/records');

    });

  });

}
