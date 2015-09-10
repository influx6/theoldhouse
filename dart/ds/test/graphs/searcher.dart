part of ds.specs;

void searcher(){
	
 	var graph = ds.dsGraph.create();
  	
 	var n1 = graph.add(1);
 	var n2 = graph.add(2);
	var n3 = graph.add(3);
 	var n4 = graph.add(4);
	var n5 = graph.add(10);
	var n6 = graph.add(15);
	
  graph.bind(n3,n2,1);
  graph.bind(n1,n5,8);
  graph.bind(n1,n6,3);
  graph.bind(n4,n2,2);
  graph.bind(n2,n4,2);
  graph.bind(n2,n6,12);
  graph.bind(n5,n3,5);
	graph.bind(n6,n4,3);
	
	var df = ds.dsDepthFirst.create((n,[a,_]){
		print('depth-first processing $n : $a');
	});

	var ldf = ds.dsLimitedDepthFirst.create((n,[a,_]){
		print('limited depth-first processing $n : $a');
	});

	var bf = ds.dsBreadthFirst.create((n,[a,_]){
		print('breadth-first processing $n : $a');
	});
	
	var lbf = ds.dsLimitedBreadthFirst.create((n,[a,_]){
		print('limited-breadth-first processing $n : $a');
	});
	
	var b = ds.dsBreadthFirst.create((n,[a,_]){
		print('breadth:: $n : $a');
		if(n.data == 10) _.end();
	});
  
	df.search(graph).then((_){
    print('df is done');
  });

	print('\n');

	bf.search(graph).then((_){
    print('bf is done');
  });

  print('\n');
  ldf.search(graph,2).then((_){
    print('ldf is done');
  });

  print('\n');

  lbf.search(graph,5).then((_){
    print('lbf is done');
  });

  print('\n');	

	b.search(graph).then((_){
    print('b is ended');
  });

  print('\n');
  ldf.search(graph,1).then((_){
    print('ldf2 is done');
  });

  print('\n');	
	
	var gd = new ds.GraphFilter.depthFirst((key,n,a){
		if(n.data == key) return n;
		return null;
	});
	
	var gb = new ds.GraphFilter.depthFirst((key,n,a){
		if(n.data == key) return n;
		return null;
	});
	
	gd.use(graph);
	gb.use(graph);
	
	gd.filter(2).then((n){
    assert(n.data is int && n.data == 2);
	}).catchError((e){
    print('error $e');
  });
	
	gb.filter(10).then((n){
    assert(n.data is int && n.data == 10);
	}).catchError((e){
    print('error $e');
  });
	
	gd.filterAll(22).catchError((e){
    assert(e is Exception);
  });
}
