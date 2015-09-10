require('em')('fs',function(em){
    
    var fs = {};
    fs.writeScreen = function(msg){
      alert(msg);
    };

    this.exports  = fs;
});
