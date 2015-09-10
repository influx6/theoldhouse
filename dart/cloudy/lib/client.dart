library cloudy.client;

import 'dart:html';
import 'dart:collection';
import 'dart:convert';
import 'dart:async';
import 'package:bass/bass.dart';
import 'package:hub/hubclient.dart';
import 'package:streamable/streamable.dart' as sm;
import 'package:dispatch/dispatch.dart';
import 'package:taggables/taggables.dart';
import 'package:requestful/client.dart';
import 'package:cloudy/src/client.dart';


class _Cloudy{
  StoreDispatcher store;
  DispatchBox box;

  static AtomicMap Bags = new AtomicMap<String,CloudyBag>();
  static Dispatch Streams = Dispatch.create();

  static bool registerCore(){
      Core.register('cloudy','cloudy-page',(t){
        if(!t.$.hasAttr('id') || !t.$.hasAttr('route'))
          return t.destroy();

        var id = t.$.attr('id');
        var pid = t.$.p.attr('id');
        var box = _Cloudy.Bags.get(pid);

        if(Valids.notExist(box)) 
          return t.destroy();

        box.emit(id,t);
      });

      Core.register('cloudy','cloudy-pages',(t){
        var id = t.$.attr('id');
        _Cloudy.createCloud(t.root).then((bag){
          _Cloudy.Bags.add(id,bag);
        });
        t.init();
      });
      return true;
  }

  static Future<CloudBag> createCloud(Element doc){
    return CloudyPages.createPages(true).then((pages){
      var ds = StoreDispatcher.create(doc)..init();
      var box = StoreDispatcher.Box('cloudy-page','page',ds);
      return CloudyBag.create(box,pages,doc);
    });
  }

  static create(e) => new _Cloudy(e);

  _Cloudy(BodyElement e){
    _Cloudy.registerCore();
    this.store = StoreDispatcher.create(e);
    this.box = StoreDispatcher.Box('cloudy-pages','pages',this.store);
  }

  void bind(String id,Function n){
    _Cloudy.Bags.onAdd.on((f){
        if(f['key'].toLowerCase() == id.toLowerCase()){
          return n(f['value']);
        }
    });
  }

  void init(){
    this.box.init();
  }
}

var Cloudy = _Cloudy.create(window.document.body);
