module.exports = (function(){

  var _ = require('stackq');
  var q = require('quero');
  var grid = require('grids');

  require('quero/adaptors/buffer.js');
  require('quero/adaptors/inmemory.js');


  var db = { bp:{}, mutators:{}, misc:{} };

  db.bp.streamdb = grid.Blueprint('streamdb',function(){
    var db = _.Future.make();

    // this.newIn('conf');
    this.newIn('query');
    this.newIn('qs');
	
    this.newOut('changes');

    this.in().pause();
    this.in('qs').pause();
    this.in('query').pause();


    db.complete(q.make(this.peekConfig()));

    db.then(function(k){
      k.up();
      this.in().resume();
      this.in('qs').resume();
      this.in('query').resume();
    });

    var queryProc = this.$bind(function(p){
      if(!_.Query.isQuery(p.body.query)) return;
      var body = p.body, model = body.model, uid = body.uid;
      db.then(this.$bind(function(d){
          var m = d.modelQuery(body.query);
          var p = this.out('changes').$.make({ uid: uid, body: body, model: model });
                m.future().changes().on(this.$bind(function(pc){
                  p.emit({ 'uid': uid , meta: pc});
                }));
                m.future().then(this.$bind(function(c){
                  var buf = d.connection.get(body.model);
                  if(buf){
              p.emit({ 'uid': uid , doc: body.persist ? buf.peek() : buf.release(), end: true});
            }
          }));
          m.future().onError(this.$bind(function(e){
            this.out('err').$.make(e);
          }));
          m.end();
      }));
    });

    this.in('qs').on(function(p){
      p.stream.on(function(f){
        if(!_.Query.isQuery(f)) return;
        var q = { uuid: p.uuid}; q.body = _.Util.extends({ query: f },p.body);
        return queryProc(q);
      });
    });

    this.in('query').on(function(p){
      //every packet that comes contains the stream of data and the query needed to kickstart
      return queryProc(p);
    });

    //only data comes in here,not query object
    this.in().on(this.$bind(function(p){
      //every packet that comes contains the stream of data and the query needed to kickstart
      var body = p.body, stream = p.stream(), model = body.model, uid = body.uid;
      db.then(this.$bind(function(d){
        stream.on(this.$bind(function(c){
          var m = d.model(model), ft = m.future();
          var p = this.out('changes').$.make({ uid: uid, body: body, model: model });
          ft.changes().on(this.$bind(function(pc){
            p.emit({ 'uid': uid , meta: pc});
          }));
          ft.onError(this.$bind(function(e){
            this.out('err').$.make(e);
          }));
          m.use('insert',c);
          m.use('save');
          m.end();
        }));

        stream.onEvent('endData',this.$bind(function(){
          var buf = d.connection.get(model);
          if(buf){
            p.emit({ 'uid': uid , doc: body.persist ? buf.peek() : buf.release(), end: true});
          }
        }));

      }));
    }));
  });

  db.bp.flatdb = grid.Blueprint('flatdb',function(){
    var db = _.Future.make();

    this.newIn('qs');

    this.in().pause();
    this.in('qs').pause();

    db.complete(q.make(this.peekConfig()));

    db.then(function(k){
      k.up();
      this.in().resume();
      this.in('qs').resume();
    });

    var queryProc = this.$bind(function(p){
      if(!_.Query.isQuery(p.body.query)) return;
      var body = p.body, model = body.model, uid = body.uid;
      db.then(this.$bind(function(d){
          var m = d.modelQuery(body.query);
	  var p = this.out('changes').$.make({ uid: uid, body: body, model: model });

	  m.future().onError(this.$bind(function(e){
	    this.out('err').$.make(e);
	  }));

          m.future().changes().on(this.$bind(function(pc){
            p.emit({ 'uid': uid , meta: pc});
          }));

          m.future().then(this.$bind(function(c){
            var buf = d.connection.get(body.model);
            if(buf){
	      p.emit({ 'uid': uid , doc: body.persist ? buf.peek() : buf.release(), end: true});
	    }
          }));
          m.end();
      }));
    });

    this.in('qs').on(function(p){
      p.stream.on(function(f){
        if(!_.Query.isQuery(f)) return;
        var q = { uuid: p.uuid}; q.body = _.Util.extends({ query: f },p.body);
        return queryProc(q);
      });
    });

    this.in().on(function(p){
      //every packet that comes contains the stream of data and the query needed to kickstart
      return queryProc(p);
    });
  });

  return db;
}());
