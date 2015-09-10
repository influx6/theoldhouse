library specs.pages;

import 'dart:async';
import 'package:hub/hub.dart';

void main(List args){

    var pages = args[0];
    var jazzup = args[1];
    var navigatePage = args[2];
    var killVM = args[3];
    var isWeb = args[4];

    jazzup((_){

      _.group('can i create cloud pages',(g){

        g.test('is it a cloud manager?')
        .rackAsync('is it a valid object',(f,next,guarded){
          Expects.truthy(f);
          next();
        })
        .rackAsync('do we get a message?',(f,next,g){
          pages.listen(g((n){
            Expects.truthy(n['message']);
            Expects.truthy(n['page']);
            return next();
          }));
        })
        .emit(pages);

      });

      _.group('can i make a single cloudy page',(g){

        pages.cloudy('home','/index.html#app',(p){

          g.test('do we have a cloudy page?')
          .rack('its a cloudypage',(f,g){
            Expects.truthy(f);
          })
          .rackAsync('can page become active',(f,nx,g){
            p.onActive.listen(g((n){
              Expects.truthy(n);
              Expects.isMap(n);
              nx();
            }));
          })
          .rackAsync('can page get blocks',(f,nx,g){
            p.onBlocks.listen(g((n){
              var data = n['data'];
              if(Valids.isOnlyObject(data)){
                data.response.write('OK!');
                data.response.close();
              };

              Expects.truthy(n);
              Expects.isMap(n);
              nx();
            }));
          })
          .emit(p);

        
        });


      });

        new Timer(new Duration(milliseconds:3000),(){
          var to = isWeb ? '/index.html#app' : 'http://127.0.0.1:30010/index.html#app';
          navigatePage(to,'App Page',true).then((g){
            return killVM(0);
          });
        });

  });

}
