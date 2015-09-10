part of ds.specs;

void graphSpec(){
	
	var arc = ds.dsGraphArc.create(ds.dsGraphNode.create(1),1);
	assert(arc.node.data == 1);
	assert(arc.weight == 1);
	
 	var b = ds.dsGraphNode.create(2);
	var node = ds.dsGraphNode.create(1);
 	var m = ds.dsGraphNode.create(4);
	node.addArc(m,1);
	node.addArc(b,2);
	b.addArc(node,1);
  m.addArc(node,2);
  b.addArc(m,3);

  node.removeArc(m);

  var graph = ds.dsGraph.create();
  var graph2 = ds.dsGraph.create();
  var n3 = graph.add(3);
  var n4 = graph.add(4);
  var n1 = graph.add(1);
  var n2 = graph.add(2);
  graph.bind(n4,n1,3);
  graph.bind(n3,n2,1);
  graph.bind(n2,n3,1);
  graph.bind(n1,n2,1);
  graph.bind(n3,n4,2);
  graph.bind(n1,n3,5);

  graph.eject(n2);
  graph.bind(n3,n1,3);
	
}
