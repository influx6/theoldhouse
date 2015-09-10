library specs;

import 'dart:html';
import 'package:hub/hubclient.dart';
import 'package:cloudy/src/client.dart';

//import tests cases
import './specs/history.dart' as historys;
import './specs/pages.dart' as pages;

void main(){

    CloudyPages.createPages(true).then((page){
      var notifier = page.history.notifier;
      var history = page.history;

      historys.main([notifier,history,jazzUp,navigatePage]);
      pages.main([page,jazzUp,navigatePage,killVM,true]);
    });
}
