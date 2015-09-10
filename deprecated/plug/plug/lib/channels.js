/// <reference path='../../node_modules/stacks/lib/ts/stacks.d.ts' />
/// <reference path='./plug.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var stacks = require("stacks");

var ChannelLink = (function () {
    function ChannelLink(channel) {
      if(!(channel instanceof Channel))
        throw "argument must be an instance of channel";
      var self = this;
      this.channel = channel;
      this.distributor = stacks.core.Distributors();
      this.mutator = stacks.core.Middleware(function(m){
        self.distributor.distributeWith(self,[m]);
      });
      this.channel.bind(this.mutator.emit);
    }
    ChannelLink.prototype.addMutate = function (f) {
        this.mutator.add(f);
    };

    ChannelLink.prototype.removeMutate = function (f) {
        this.mutator.remove(f);
    };

    ChannelLink.prototype.listen = function (f) {
        this.distributor.add(f);
    };

    ChannelLink.prototype.listenOnce = function (f) {
        this.distributor.add(f);
    };

    ChannelLink.prototype.unlisten = function (f) {
        this.distributor.remove(f);
    };

    ChannelLink.prototype.unlistenOnce = function (f) {
        this.distributor.remove(f);
    };

    ChannelLink.prototype.die = function () {
        this.channel.unbind(this.hook);
    };

    return ChannelLink;
})();
exports.ChannelLink = ChannelLink;

var Channel = (function () {
    function Channel() {
        this.streams = stacks.streams.Streamable();
    }
    Channel.prototype.emit = function (d) {
        this.streams.emit(d);
    };

    Channel.prototype.bindOnce = function (g) {
        this.streams.tellOnce(g);
    };

    Channel.prototype.unbindOnce = function (g) {
        this.streams.untellOnce(g);
    };

    Channel.prototype.bind = function (g) {
        this.streams.tell(g);
    };

    Channel.prototype.unbind = function (g) {
        this.streams.untell(g);
    };

    Channel.prototype.link = function () {
        return new ChannelLink(this);
    };

    return Channel;
})();
exports.Channel = Channel;

var SelectedChannel = (function (_super) {
    __extends(SelectedChannel, _super);
    function SelectedChannel(id, picker) {
        _super.call(this);
        this.contract = stacks.core.Contract(id, picker);
        this.contract.onPass(stacks.Funcs.bind(this.streams.emit,this.streams));
    }
    SelectedChannel.prototype.emit = function (d) {
        this.contract.interogate(d);
    };
    return SelectedChannel;
})(Channel);
exports.SelectedChannel = SelectedChannel;
