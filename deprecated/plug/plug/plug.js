var plug = require('./lib/plug');
var channel = require('./lib/channels');
var messages = require('./lib/messages');
var adapters = require('./lib/adapters');
var uuids = require('./lib/packuuid');


module.exports = {
  plug: plug,
  channel: channel,
  message: messages,
  adapter: adapters,
  createGreedQueue: function(){
    return new adapters.AdapterGreedQueue();
  },
  createAdapterQueue: function(d){
    return new adapters.AdapterWorkQueue();
  },
  createAdapter: function(d){
    return new adapters.Adapter(d);
  },
  createAdapters: function(d){
    return new adapters.Adapters(d);
  },
  createMessage: function(d,f){
    return new messages.MessagePack(d,f);
  },
  createTaskMessage: function(d){
   var mesg = new messages.MessagePack(d,uuicore.tasks());
   mesg.streamMid.add(function(f,next,end){
      if(!valicore.exists(f['uuid']) && !valicore.exists(f['data'])) return;
      return next();
   });
   return mesg;
  },
  createChannelLink: function(d){
    return new channels.ChannelLink(d);
  },
  createSelectedChannel: function(d,p){
    return new channel.SelectedChannel(d,p);
  },
  createChannel: function(){
    return new channel.Channel();
  },
  createPlug: function(id,fn){
    var pl = new plug.Plug(id);
    if(fn && typeof fn == 'function') fn.call(null,pl);
    return pl;
  },
  createPlate: function(fn){
    var pl =  new plug.Plate();
    if(fn && typeof fn == 'function') fn.call(null,pl);
    return pl;
  },
};
