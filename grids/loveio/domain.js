var _ = require('stackq');

var dom = module.exports = {};

dom.dbConf = _.Checker({
  'adaptor': _.valids.String,
  'db': _.valids.String,
});

dom.Server = _.Checker({
  'address': _.valids.String,
  'port': _.valids.Number,
  'flat': dom.dbConf,
  'stream': dom.dbConf,
});
