#GuardedFS
provides a guarded directory and file wrapper,a very simple switch as means of ensuring 
changability in a file or directory,very simple. It simple is a sort of contract between the caller and file or directory
object that as far as calls are being passed through guardedfs directory or file objects,ability to write will be blocked
depending if it was set so, but it doesnt bind this contract and can still be bypassed by getting the file or directory object
directly from the guardedfs objects,its a choice to follow the rules not a strict you cant go there type of class.

##Example
	
	##code from test/guarded.dart

	library guardedfs.specs;

	import 'package:guardedfs/guardedfs.dart';

	void main(){
	  
	  //set the guardedfs guardeddirectory object to the path .. and block write/change
	  //every file or directory gotten from this object will be readonly
		var cur = GuardedFS.create('../',true);
	  //set the guardedfs guardeddirectory object to the path .. and unblock write/change
		//every file or directory gotten from this object can be change,rename,written too
		var mod = GuardedFS.create('../',false);
		
		//grab list of directory as strings not filesystementities
		cur.directoryListsAsString().then((_){
		  _.on((n){
	      assert(n is String);
		  });
		});
		
		cur.Dir('lib').then((_){
	    _.directoryListsAsString().on((n){
	      assert(n is String);
	    });
	  });
		
		//assert cur cant write to any file in the directory
		assert(cur.File('test/data.txt').openWrite() == null);
		//assert cur can append to this directory
		assert(mod.File('test/data.txt').openAppend() != null);
		
		//create a new folder in the test folder
		mod.Dir('test/suggest').then((_){
		  assert(_ != null);
		  assert(_.existsSync() == true);
		});

		var locker = mod.File('test/suggest/locker.txt');
		
		assert(locker.openWrite() != null);
		
		locker.writeAsStringSync('guardedfs');
		assert(locker.readAsStringSync() == 'guardedfs');
		
		
	}