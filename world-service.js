'use strict';

var DEFAULT_TICK_INTERVAL = 1000;
var DEFAULT_REPLICAS = 1;
var WorldRange = require('./world-range');

module.exports = WorldService;

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

	var self = this;

	function tick() {
		self.tick();
	}

	function onMembershipChanged() {
		self.onMembershipChanged();
	}
}

WorldService.prototype.tick = function tick() {
	this.tickHandle = setTimeout(this.boundTick, this.tickInterval);
    this.onMembershipChanged();
};

WorldService.prototype.start = function start() {
	this.onMembershipChanged();
	this.tick();
};

WorldService.prototype.onMembershipChanged = function onMembershipChanged() {
	var members = this.ringpop.membership.members.slice();
	var addresses = [];
	for (var index = 0; index < members.length; index++) {
		addresses.push(members[index].address);
	}
	addresses.sort();
    var membershipIndex = addresses.indexOf(this.address);
    var membershipLength = addresses.length;
	this.logger.info('membership ' + JSON.stringify(addresses) + ' ' + this.address);
    this.range.updateMembership(membershipIndex, membershipLength, this.replicas);
    console.log('\x1b[2J\x1b[H' + this.range.render());
    this.logger.info(membershipIndex, membershipLength, this.replicas);
};
