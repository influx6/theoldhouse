library cloudy;

import 'dart:collection';
import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'package:hub/hub.dart';
import 'package:streamable/streamable.dart' as sm;
import 'package:dispatch/dispatch.dart';
import 'package:requestful/server.dart' as rq;
import 'package:route/server.dart';

part 'base.dart';

final rq.Requestful _client = rq.Requestful.create({});

void killVM([int n]){
  return exit(n);
}

Future navigatePage(String path,[String title,dynamic n]){
  title = Funcs.switchUnless(title,"Cloudy Page: $path");
    var req = _client.query({
      'to': HistoryNotifier.cleanHash(path),
      'with':'get',
    });

    req.filter('prefilter').ware((d,next,end){
      d.headers.set('Content-Length',-1);
      d.write(Valids.notExist(n) ? title : n.toString());
      return next();
    });
    
  return req.init();
}

class CloudyHistoryNotifier extends HistoryNotifier{
  final HttpServer server;
  Router interRouter;

  static create(s) => new CloudyHistoryNotifier(s);

  CloudyHistoryNotifier(this.server): super(){
    this.interRouter =  new Router(this.server);
    this._useHash.switchOff();
  }

  void _handleInternal(url,Function handler){
    this.interRouter.serve(url).listen(handler);
  }

}
