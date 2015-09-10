var _ = require('stackq');
var domain = module.exports = {};


domain.ResultType = _.Checker.orType(_.valids.Primitive,_.valids.Object,_.valids.List);

domain.ComponentArg = _.Checker({
  atom: _.Cursor.instanceBelongs,
  data: _.funcs.maybe(_.valids.Object),
  attr: _.funcs.maybe(_.valids.Object),
});

domain.ElementType = _.Checker({
  type: _.valids.String,
  data: _.funcs.maybe(_.valids.Object),
  attr: _.funcs.maybe(_.valids.Object),
});
