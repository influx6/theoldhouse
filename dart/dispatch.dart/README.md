Dispatch
==========
  Provides a simple extendable Dispatcher that uses streams as a means of sending out messages and watchers capable of watching the messages based on either a string,function or regexp attribute


##Example:
  ```

    var dispatch = Dispatch.create();
    //register watchers based on criteria
    var thunder = dispatch.watch('thunder');
    var reggy = dispatch.watch(new RegExp('reggy'));
    var r1 = dispatch.watch((m) => m == 'slots');
    var r2 = dispatch.watch(new RegExp('bank'));

    dispatch.dispatch({'message':'slot','data':'rocking sox'});
    dispatch.dispatch({'message':'bank','data':'thunderous flags'});
    dispatch.dispatch({'message':'thunder','data':'rocking sox2'});
    dispatch.dispatch({'message':'reggy','data':'thunderous flags2'});
    dispatch.dispatch({'data':'we are not tagged'});

  ```
