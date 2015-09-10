/// <reference path='../node_modules/stacks/lib/ts/stacks.d.ts' />
var stacks = require('stacks');
var plug = require('../plug.js');
var core = stacks.core;
var expects = stacks.Expects;

stacks.Jazz('plug channel specification', function (_){
    var ch = new plug.channel.Channel();

      _('can i get use a link',function($) {
        var mc = ch.link();
        $.async(function (c,next,g) {
          c.listen(g(function(f){
            expects.truthy(f);
            return next();
          }));
          ch.emit({'name':'alex'});
        });
        $.for(mc);
      });

      _('can i get a message ready',function($) {
        var mc = new plug.message.MessagePack('example');

        $.async(function (c,next,g) {
          c.ready(g(function(f){
            expects.isTrue(f);
            next();
          }));
        });
        $.for(mc);
        mc.ok();
      });

      _('can i get a message packet',function($) {
        var mc = new plug.message.MessagePack('packet');

        $.async(function (c,next,g) {
          c.streams.tell(g(function(f){
            expects.isObject(f);
            return next();
          }));
        });

        $.for(mc);
        mc.pack({
          name:'alex',
          box: 232
        });
        mc.ok();
      });

    _('can i create a channel',function($) {
        $.sync(function (c) {
            expects.isObject(c);
        });

        $.sync(function (c) {
            expects.truthy(c);
        });

        $.asyncCount(3,function (c,next) {
            expects.truthy(c);
            next(); next(); next();
        });

        $.for(ch);
    });

    _('can i emit data within a channel',function($){

      $.async(function(c,next,g){
        c.bindOnce(g(function(f){
          expects.isObject(f);
          return next();
        }));
        c.emit({'name':'alex'});
      });

      $.for(ch);
    });

});
