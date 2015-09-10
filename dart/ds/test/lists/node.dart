part of ds.specs;

void nodeSpec(){

	var node = ds.dsNode.create(2);		
	var list = new ds.dsList();
	var liss = ds.dsList.create();
	var li = list.iterator;
	var ls = liss.iterator;
		
	list.append(1);
	list.append(2);
	list.append(3);
  	
	list.append(4);
	list.append(5);
	
	liss.append(5);
	liss.append(6);
	liss.append(13);
	liss.append(45);
	liss.append(59);
	liss.append(node);

	assert(li.has(1));
	assert(li.has(2));
	assert(li.has(4));
	assert(li.has(3));
	assert(!li.has(6));	
	
	assert(li.compare(liss.iterator) == false);
	
	assert(ls.remove(6) != null);
	assert(!ls.has(2));
	
	assert(list.removeHead().data == 1);
	assert(liss.removeTail().data == node);
	
}
