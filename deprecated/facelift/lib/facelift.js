require('em')('jquery',function(em){

    var $ = this.jQuery || function(){ throw "jQuery is not loaded!"; };
    this.exports = $;

},this);

require('em')('FaceLiftUI',function(em){
    
    var ui = this.exports = {}, $ = em('jquery'), as = em('as-contrib'), enums = core.enums;

    ui.root = function(elem){
      var doc = {};
      
      enums.extends(doc,ui.core);
    };

    ui.core = {
    
    };

},this);
