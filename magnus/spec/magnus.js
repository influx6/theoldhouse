var _ = require('stackq'), magnus = require('../magnus.js');

_.Jazz('magnus dom specifications',function($){

  var nucleus = magnus.createElement({
    type: 'nucleus',
    attr: {
      id: 'arie',
    },
    children: 'sparks'
  });

  var atom = magnus.createElement({ 
    type: 'atom',
    attr:{
      id:'snike',
      scam: { id:'0.1' }
    },
    children: ['alex',{ type: 'bucket' },nucleus]
  });

  var atomMarkup = magnus.renderHTML(atom);
  var nucleusMarkup = magnus.renderHTML(nucleus);
  
  $('can i create a immutable elem',function(k){
    k.sync(function(m,g){
      _.Expects.truthy(magnus.Element.instanceBelongs(m));
    });
  }).use(nucleus).use(atom);

  $('can i render to html string',function(k){
    k.sync(function(m,g){
      var rn = magnus.renderHTML(m);
      _.Expects.isString(rn.markup);
    });
  }).use(nucleus).use(atom);

  $('can i validate markup for <nucleus>',function(k){
    k.sync(function(m,g){
      var rn = magnus.renderHTML(m);
      _.Expects.is(rn.markup,nucleusMarkup.markup);
    });
  }).use(nucleus);

  $('can i validate markup for <atom>',function(k){
    k.sync(function(m,g){
      var rn = magnus.renderHTML(m);
      _.Expects.is(rn.markup,atomMarkup.markup);
    });
  }).use(atom);

});
