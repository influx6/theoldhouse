# Magnus
  the combination of sequences with immutables and a the idea of HTML generation make this library.Magnus is about creating a very simple and basic UI library that can work both on server side and client side with minimal effort. By combining sequence like structures that have cursors and are automatically updated based on changes within the local cursor regions, we can create elaborate and connected UI structures easily renderable to Html Strings which only are updated once a change occurs i.e after the first render the output is cached until there is a change.

##Install

      npm install magnus
  
##Example

```javascript

  var _ = require('stackq'), 
  magnus = require('magnus');

  var data = _.Immutate.transform({
    label: 'i love her',
    name: 'denis',
    date: Date.now(),
  });

  var atom = magnus.Component.extends({
    init: function(map,fn){
      this.$super('atom',map,fn);
    },
  });

  var list = magnus.Component.extends({
    init: function(map){
      this.$super('li',map,function(){
        return this.atom;
      });
    }
  });


  var denis = list.make({ atom: data.ghost('name') });

  var atomic = atom.make({
    atom: data.ghost('label'),
    attr: { id: data.ghost('name') },
  },function(){
    return [this.atom,denis];
  });
  
  //to get the html rendering of the atomic element
  console.log(atom.render())
  
  //update the data
  data.ghost('name').set("thunder");


  //to get the updated html rendering of the atomic element
  console.log(atom.render())

```
