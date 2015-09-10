var _ = require('stackq');
var plug = require('grid');
var fs = require('../fs.grid.js');

_.Jazz('fs.plug specification tests',function(n){

  var dir = fs.bp.ioReadDirector({ base: '..' });
  var write = fs.bp.ioWriteDirector({ base: '..' });

  n('can i read a file',function(k){
    k.async(function(d,next,g){
      d.out('file').on(g(function(f){
        next();
        _.Expects.truthy(f);
        _.Expects.truthy(f.body);
      }));
    });
    read.in('file').Packets.make({ file: './fs.grid.js'});
  }).use(read);

  n('can i write a file',function(k){
      write.in('file').on(function(f){
        k.async(function(d,next,g){
          next();
          _.Expects.truthy(f);
          _.Expects.isObject(f.body);
        });
      });

    write.in('file').Packets.make({ file: './specs/pork.md'})
    .emit('#oh God!,i Seek you!')
    .emit('\n')
    .emit('\n')
    .emit('sing aloud to my God, oh earth')
    .emit('\n')
    .emit('recite a beautiful psalm to his hearing')
    .emit('\n')
    .emit('fill him with the most beautiful praise')
    .emit('\n')
    .emit('for my God and Lord deserves more beyond wonder')
    .emit('\n')
    .emit('praise my God, oh Zion, praise the Lord, Our God and King!')
    .emit('\n')
    .emit('\n')
    .end();

  }).use(write);

});
