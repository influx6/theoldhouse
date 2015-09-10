Socketful
==========
  Provides a simple extendable websocket api for both client and server


##Example:

  Client Side:

    ```
        var socks = Socketful.create({
          'url':'ws://127.0.0.1:3000/',
        });

        -> SocketStores are created where sockets belonging to a specified routes are allocated and by listening to those stores we can customize each sockets behaviour as needed

        var records = socks.of('/records');

        -> Simply listen to a store and add the behaviours and messages that a client side socket is to send to the server and its behaviour and your ready

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

    ```

  Server Side:

    The server side as with the dart:io provides websocket implementations for doing server side request and creating server websockets to handle websocket requests from clients and socketful supports both.


    Server-Side Requests:

        ``` 

        Socketful.attachURI('ws://127.0.0.1:3000/records').then((record){

            var pong = record.watch('ping');
            var buffer = record.watch('buffer');
            var end = record.watch('end:shutdown');

            end.listen((f){
              if(Valids.asserts(f['data'],1))
                return record.close();
            });

            buffer.listen((f){
              //received messages under buffer tag
            });

            pong.listen((f){
              //received messages under  ping tag
            });

            //send messages to the server from these socket
            record.send('ping','ping');
            record.send('buffer',['shell sock']);
            record.send('end:server',0);



        ```


        
    Server-Side Websocket Server:

        ```
        -> We create a server dedicated for websocket connections, though if desired,socketful on the server provides the attachRequests method that allows per request handling,incase one desires to only bind a namespace of a route only to socketful

         Socketful.attachAddress('127.0.0.1',3000).then((socks){

           //the routes for websocket connections
           var f = socks.of('/records');

           //watch for messages based on tags
            var ping = f.watch('ping');
            var buffer = f.watch('buffer');
            var server = f.watch('end:server');

            //respond to these messages
            ping.listen((m){
              f.send('ping','pong');
            });

            buffer.listen((m){
              f.send('buffer','recieved');
            });

            server.listen((m){
              f.send('end:shutdown',1);
            });


        });


        ```
