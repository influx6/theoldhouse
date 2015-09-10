library specs;

import 'dart:html';
import 'package:hub/hubclient.dart';
import 'package:cloudy/client.dart';

void main(){

  Cloudy.init();
  jazzUp((_){

    _.group('can i get a new bag',(g){

        Cloudy.bind('flow',(bag){
        
          g.test('can i create a home')
          .rackAsync('is it a home',(f,next,g){
            f.onCloudy('home',((page,tag){
              Expects.truthy(page);
              Expects.truthy(tag);
              Expects.isString(page.path);
              next();
            }));
          })
          .emit(bag);


          g.test('can i create a files')
          .rackAsync('is it a files',(f,next,g){
            f.onCloudy('files',((page,tag){
              Expects.truthy(page);
              Expects.truthy(tag);
              Expects.isString(page.path);
              next();
            }));
          })
          .emit(bag);

          bag.init();
        });

    });

  });


}
