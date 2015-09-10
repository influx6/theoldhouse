var _ = require('stackq');
var grid = require('grids');
var fs = require('../fs.grid.js');

_.Jazz('fs.plug specification tests',function(n){

  var read = fs.bp.ioReadDirector({ base: '..' });
  var write = fs.bp.fileWriteNew({ name: 'writer' });
  var append = fs.bp.fileWriteAppend({ name: 'append' });

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
      write.in().on(function(f){
        k.async(function(d,next,g){
          next();
          _.Expects.truthy(f);
          _.Expects.isObject(f.body);
        });
      });

    write.in().Packets.make({ file: './poem.md'})
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

  n('can i append a file',function(k){
      append.in().on(function(f){
        k.async(function(d,next,g){
          next();
          _.Expects.truthy(f);
          _.Expects.isObject(f.body);
        });
      });

    append.in().Packets.make({ file: './poem.md'})
    .emit('#Forever oh God!,i wait for you!')
    .emit('\n')
    .emit('\n')
    .emit('with joy unseizing upon this earth')
    .emit('\n')
    .emit('to see you, know you and walk with you')
    .emit('\n')
    .emit('for by you i have found where i belong')
    .emit('\n')
    .emit('in your presence oh God, Lord and father')
    .emit('\n')
    .emit('\n')
    .end();

  }).use(append);


});
