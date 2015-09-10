library ds.specs;

import 'package:ds/ds.dart' as ds;

part './lists/node.dart';
part './iterators/skip.dart';
part './graphs/graph.dart';
part './graphs/searcher.dart';
	
void main(){
	nodeSpec();
	skipSpec();
	graphSpec();
	searcher();
}
