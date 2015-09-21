'use strict';

var DEFAULT_TICK_INTERVAL = 1000;
var DEFAULT_REPLICAS = 1;
var WorldRange = require('./world-range');
var path = require('path');

module.exports = WorldService;

var thriftSource = require('fs').readFileSync(path.join(__dirname, 'gol.thrift'), 'ascii');

function WorldService(args) {
    this.address = args.address;
	this.ringpop = args.ringpop;
	this.logger = args.logger;
	this.tickInterval = args.tickInterval || DEFAULT_TICK_INTERVAL;
	this.channel = args.channel;
	this.tickHandle = null;
	this.boundTick = tick;
    this.replicas = args.replicas || DEFAULT_REPLICAS;

    this.range = new WorldRange({
        size: args.size,
        chunkSize: args.chunkSize
    });

	this.ringpop.on('membershipChanged', onMembershipChanged);

    this.thrift = new this.channel.TChannelAsThrift({
        source: thriftSource,
        channel: this.channel,
        isHealthy: isHealthy
    });

    this.thrift.register(this.channel, 'Gol::ping', handlePing);

	var self = this;

	function tick() {
		self.tick();
	}

	function onMembershipChanged() {
		self.onMembershipChanged();
	}

    function handlePing(opts, req, head, body, callback) {
        self.handlePing(opts, req, head, body, callback);
    }

    function isHealthy() {
        return {ok: true, message: 'OK'};
    }
}

WorldService.prototype.ping = function ping() {
    var addresses = Object.keys(this.ringpop.membership.membersByAddress);
    var address = addresses[Math.floor(Math.random() * addresses.length)];
    this.channel.peers.add(address);
    this.channel.request({
        hostPort: address,
        timeout: 100,
        hasNoParent: true
    }).send('Gol::ping', null, null, function onResponse(err, res) {
        console.log('pong');
    });
};

WorldService.prototype.handlePing = function handlePing(opts, req, head, body, callback) {
    console.log('pong');
    callback(null, {
        ok: true,
        head: null,
        body: null
    });
};

WorldService.prototype.tick = function tick() {
	this.tickHandle = setTimeout(this.boundTick, this.tickInterval);
    this.onMembershipChanged();
    this.ping();
};

WorldService.prototype.start = function start() {
	this.onMembershipChanged();
	this.tick();
};

WorldService.prototype.onMembershipChanged = function onMembershipChanged() {
    var addresses = Object.keys(this.ringpop.membership.membersByAddress);
	addresses.sort();
    var membershipIndex = addresses.indexOf(this.address);
    var membershipLength = addresses.length;
	this.logger.info('membership ' + JSON.stringify(addresses) + ' ' + this.address);
    this.range.updateMembership(membershipIndex, membershipLength, this.replicas);
    console.log('\x1b[2J\x1b[H' + this.range.render());
    this.logger.info(membershipIndex, membershipLength, this.replicas);
};
