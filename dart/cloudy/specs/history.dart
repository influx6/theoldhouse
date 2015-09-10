library specs.history;

import 'package:hub/hub.dart';

void main(List args){
  
  var notifier = args[0];
  var history = args[1];
  var jazzup = args[2];
  var navigatePage = args[3];

  history.boot().then((f){

      jazzup((_){

        _.group('testing a cloudy history can get cloudy',(g){
          
          g.test('can i make a cloudy history')
          .rack('is it a notifier?',(f,g){
            Expects.truthy(f);
          })
          .emit(notifier);

          g.test('can i make a history')
          .rackAsync('is it history?',(f,next,g){
            Expects.truthy(f);
          })
          .emit(history);

        });

    });

  });

}

