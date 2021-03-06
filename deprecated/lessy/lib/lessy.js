module.exports = (function(){

	var fs = require('fs'), 
	path = require('path'),
	ts = require('tsk').ToolStack,
	util = ts.Util,
	less = require('less'),
	readFile = function(dir){
		var dir = path.resolve(dir);
		return fs.readFileSync(dir,'utf8');
	},
	readDir = function(dir){
		return fs.readdirSync(dir);
	},
	writeFile = function(dir,data){
		//console.log('will write:',dir,data,fs.writeFileSync);
		fs.writeFileSync(path.resolve(dir),data,'utf8');
	},
	watcher = require('watcherjs');

	
	ts.ASColors();

	// app.compile = function Compile(sets,useLess){};
	return function(output,imports){
			if(!output && !util.isString(output)) throw new Error('Please Specific your Output folder location');
			if(!imports && !util.isString(imports)) throw new Error('Please Specify the location of your less files so @Import directives are functional');

			var app = util.clone(watcher);
			app.out = path.resolve('./css/');
			app.imports = path.resolve('.');

			//change to not get compressed css files
			app.uglify = true;

			//set the output dir
			app.importFolder = function(dir){
				var out = path.resolve(dir);
				if(!fs.existsSync(out)) throw new Error('Import Folder does not exists!');
				this.imports = out;
				return true;
			};

			app.outputFolder = function(dir){
				var out = path.resolve(dir);
				if(!fs.existsSync(out)) fs.mkdirSync(out);
				this.out = out;
				return true;
			};

			//set the import location for @import directives
			app.imports = function(dir){
				return this.imports = path.resolve(dir);
			};

			app.generateParser = function Parser(){
				if(this.parser) return this.parser;
				this.parser = new(less.Parser)({
					paths: ['.',this.imports],
				});
				return this.parser;
			};

			app.sync = function Sync(set,endpoint){
				if(!util.isString(set) || (endpoint && !util.isString(endpoint))) return false;
				var self = this;

				if(!endpoint){
					var splitter = set.split('/');
					endpoint = splitter[splitter.length - 1].replace(/less/,'css');
				}
				// if(!fs.existsSync(point)) return false;
				if(!this.parser) this.generateParser();

				return this.watch(endpoint,set,function(){
					if(!fs.existsSync(this.root)) return false;
					var data = readFile(this.root),
						out = path.resolve(self.out,endpoint);
					return self.parser.parse(data,function(e,tree){
						//console.log('changing:',endpoint,data,out,tree,tree.toCSS());
						if(e) console.log('\t'+(e.message ? e.message : e));
						if(tree) writeFile(out,tree.toCSS({ compress: self.uglify }));
						else if(tree == null) console.log('\tError generating tree for'.red,endpoint.toString().green);
						console.log('\tUpdating:'.blue,endpoint.toString().yellow);
					});
				});
			};

			//use to watch a single dir
			app.syncDir = function Sync(sets){
				var self = this,lists,sets = path.resolve(sets);
				if(!fs.statSync(sets).isDirectory()) return false

				lists = readDir(sets);
				//console.log('grabbing:',lists);

				this.watch(sets,sets,function(){
					self.syncDir(sets);
				});

				util.eachAsync(lists,function(e,i,o,fn){
					if(!e.match(/\.less$/)) return;
					//console.log('in:',lists);
					var out = path.resolve(sets,e);
					this.sync(out);
				},null,this);
			};	

			app.outputFolder(output);
			app.importFolder(imports || '.');
			
			app.boot = function(){
				console.log('Starting Lessy at'.green,this.ms.toString().magenta,'ms'.magenta);
				this.bootup();
			};

			return app;
	};

})();
