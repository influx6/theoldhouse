library cloudy;

import 'dart:collection';
import 'dart:convert';
import 'dart:async';
import 'package:streamable/streamable.dart' as sm;
import 'package:hub/hub.dart';
import 'package:dispatch/dispatch.dart';
import 'package:route/client.dart';
import 'dart:html';

part 'base.dart';
 
Function killVM = Funcs.identity;

Future navigatePage(String path,[String title,bool trigger]){
  trigger = Funcs.switchUnless(trigger,false);
  title = Funcs.switchUnless(title,"Cloudy Page: $path");
  return new Future.sync((){
    if(trigger){
        window.location.assign(path);
       (window.document as HtmlDocument).title = title;
    } else {
      window.history.pushState(null, title, path);
    }
    return true;
  });
}

class CloudyHistoryNotifier extends HistoryNotifier{
  Router interRouter;

  static create([n]) => new CloudyHistoryNotifier(n);

  CloudyHistoryNotifier([bool n]): super(){
    n = Funcs.switchUnless(n,true);
    this.interRouter =  new Router(useFragment:n);
    this._useHash.switchOn();
  }

  void _handleInternal(url,Function handler){
    this.interRouter.addHandler(url,handler);
  }

  Future boot(){
    return super.boot().then((t){
      try{
        this.interRouter.listen();
      }catch(e){
        this.notFound.emit(e);
      }
    }).catchError((e){
      this.notFound.emit(e);
    });
  }

}

