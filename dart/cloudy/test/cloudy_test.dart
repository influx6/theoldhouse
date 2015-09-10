library taggables.store;

import 'dart:io';
import 'dart:async';
import 'package:hub/hub.dart';
import 'package:cloudy/src/server.dart';
//import tests cases
import './specs/history.dart' as historys;
import './specs/pages.dart' as pages;

void main(){
  HttpServer.bind('127.0.0.1',30010).then((s){
    CloudyPages.createPages(s).then((page){
      var notifier = page.history.notifier;
      var history = page.history;

      historys.main([notifier,history,jazzUp,navigatePage]);
      pages.main([page,jazzUp,navigatePage,killVM,false]);
    });

  });

}
