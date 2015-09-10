part of ds.specs;

void skipSpec(){
  var list = ds.dsList.create([11,2,3,4,5,6]);
	var skip = ds.dsSkipIterator.create(list,4);
  var selector = ds.dsSelectIterator.create(list.root.right);

  while(selector.moveNext()) assert(selector.current != null);
  list.free();
}
