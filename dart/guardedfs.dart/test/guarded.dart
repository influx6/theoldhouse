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
	  _.whenClosed((j){ print('closed!'); });
	  _.on((n){
	    print(n);
      assert(n is String);
	  });
	});
	
	cur.Dir('lib').then((_){
    _.directoryListsAsString().on((n){
      assert(n is String);
    });

    _.linkTo('./thanklib').then((_){
    	print('made: $_');
    	_.deleteSync();
    }).catchError(print);

  });
	
	//assert cur can write to any file in the directory
	assert(cur.File('test/data.txt').openWrite() == null);
	//assert cur can append to this directory
	assert(mod.File('test/data.txt').openAppend() != null);
	
	//create a new folder in the test folder
	mod.Dir('test/suggest').then((_){
	  assert(_ != null);
	  assert(_.existsSync() == true);
	});

	var locker = mod.File('test/suggest/locker.txt');
	locker.copyTo('./thunder.clap').then((n){
   assert(GuardedFile.existsSync());
  });

	assert(locker.openWrite() != null);
	
	locker.writeAsStringSync('guardedfs');
	assert(locker.readAsStringSync() == 'guardedfs');
	
	mod.fsCheck('buker').catchError((n){ assert(n is FileSystemException); });
}
