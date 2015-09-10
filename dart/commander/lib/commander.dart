library commander;

import 'package:hub/hub.dart';
import 'package:streamable/streamable.dart' as streams;

class Commander{
  final MapDecorator commands = new MapDecorator();
  final Events es = Events.create();
  final Switch consoleOn = Switch.create();

  static create() => new Commander();

  Commander(){
    this.add('default');
    this.add('help');
    this.consoleOn.switchOn();
  }

  bool get isConsoleOn => this.consoleOn.on();
  bool has(String com) => this.commands.has(com);
  void switchOffConsole() => this.consoleOn.switchOff();

  streams.Distributor command(String com) => this.commands.get(com);

  void add(String command){
    this.es.createEvent(command);
    this.commands.add(command,streams.Distributor.create(command));
  }

  void remove(String command){
    if(!this.commands.has(command)) return null;
    var com = this.commands.remove(command);
    com.free();
  }

  void fire(String command,List n){
    if(!this.commands.has(command)) return this.commands.get('default').emit(n);
    this.commands.get(command).emit(n);
  }

  void onEvent(String command,Function n){
    if(!this.commands.has(command)) return null;
    this.es.on(command,n);
  }

  void onceEvent(String command,Function n){
    if(!this.commands.has(command)) return null;
    this.es.once(command,n);
  }

  void offEvent(String command,Function n){
    if(!this.commands.has(command)) return null;
    this.es.off(command,n);
  }

  void offOnceEvent(String command,Function n){
    if(!this.commands.has(command)) return null;
    this.es.offOnce(command,n);
  }

  void on(String command,Function n){
    if(!this.commands.has(command)) return null;
    this.command(command).on(n);
  }

  void once(String command,Function n){
    if(!this.commands.has(command)) return null;
    this.command(command).once(n);
  }

  void offOnce(String command,Function n){
    if(!this.commands.has(command)) return null;
    this.command(command).offOnce(n);
  }

  void off(String command,Function n){
    if(!this.commands.has(command)) return null;
    this.command(command).off(n);
  }

  void analyze(List<String> args){
    if(args.length <= 0)  return null;
    var finder = Enums.nthFor(args);
    this.onEvent(finder(0),(n){
      if(this.isConsoleOn) return print(n);
      return null;
    });
    this.fire(finder(0),args.sublist(1,args.length));
  }

}
