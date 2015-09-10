var b = require('../lib/lessy')('./css','./less');
b.syncDir('./less');
b.bootup();