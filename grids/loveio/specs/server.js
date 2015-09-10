var _ = require('stackq'),
 io = require('../loveio');

_.Jazz('Lovedb specs',function($){

  var ios = io.bp.IO({
    'address': '127.0.0.1',
    'port': 3001,
    'flat': {
      'adaptor': 'inMemory',
      'username': 'alex',
      'password':'box',
      'db': 'localhost/medicdocs'
    },
    'stream':{
      'adaptor': 'Listdb',
      'db': 'localhost/attachments'
    },
    'rack':{
      'base': './apps',
      'configs': './config',
      'models': './models',
      'views': './views'
    },
  });


});
