var as = require('./lib/as-contrib.js').AsContrib;
var core = require('./lib/core.js');
module.exports = {
  'as': as,
  'ds': core.DS,
  'streams': core.Streams,
  'ascontrib':as,
  'core': core,
  'Class': core.funcs.bind(core.Class,core),
  'Jazz': core.funcs.bind(core.JzGroup,core),
  'Expects': core.Expects
}
