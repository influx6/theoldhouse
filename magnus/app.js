var rules = Stackq.Immutate.transform({ name: 'alex', id:'wonder' });

var app = Magnus.Client('AppSet');

app.Blueprint('atom');

var suck = app.create('atom',{
  atom: rules.ghost('name'),
  attr: { id: rules.ghost('id') }
},function(){ 
  return this.atom; 
},document.body);

setTimeout(function(){
  rules.get().set('name','johnna');
},3000);

setTimeout(function(){
  rules.get().set('name','I love my God!');
  rules.get().set('id','snick');
},6000);

// app.dom().on('rendered',function(f){ console.log('rendering:',f); });
