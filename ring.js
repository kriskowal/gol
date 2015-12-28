'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var farmhash = require('farmhash');
var indexOf = require('./sorted-index-of');

function Ring(options) {
    this.checksum = null;
    this.index = 0;
    this.addresses = [];
    this.address = options.address;
    this.hash = options.hash || farmhash.hash32;
    this.replicas = options.replicas;
    this.delegate = options.delegate;
}

util.inherits(Ring, EventEmitter);

Ring.prototype.whoami = function whoami() {
	return this.addresses[this.index];
};

Ring.prototype.lookup = function lookup(value) {
	var index = this.delegate.lookup(value);
	return this.addresses[index];
};

Ring.prototype.addRemoveServers = function addRemoveServers(plus, minus) {
    plus = plus || [];
    minus = minus || [];
    var changed = false;
    for (var index = 0; index < minus.length; index++) {
        var address = minus[index];
        changed = changed || this.removeServer(address);
    }
    for (var index = 0; index < plus.length; index++) {
        var address = plus[index];
        changed = changed || this.addServer(address);
    }
    this.update();
    return changed;
};

Ring.prototype.update = function update() {
    this.index = indexOf(this.addresses, this.address);
    this.delegate.updatePeers(
        this.index,
        this.addresses.length,
        this.replicas,
        this.checksum
    );
    this.checksum = this.hash(this.addresses.join(','));
    this.emit('checksumComputed');
};

Ring.prototype.addServer = function addServer(address) {
    var index = indexOf(this.addresses, address);
    if (index >= 0) {
        return false;
    }
    this.addresses.splice(~index, 0, address);
    this.update();
    this.emit('added', address);
};

Ring.prototype.removeServer = function removeServer(address) {
    var index = indexOf(this.addresses, address);
    if (index < 0) {
        return false;
    }
    this.addresses.splice(index, 1);
    this.update();
    this.emit('removed', address);
};

Ring.prototype.hasServer = function hasServer(address) {
    var index = indexOf(this.addresses, address);
    return index >= 0;
};

Ring.prototype.getServerCount = function getServerCount() {
    return this.addresses.length;
};

Ring.prototype.getStats = function getStats() {
    return {
        checksum: this.checksum,
        servers: this.addresses
    };
};

module.exports = Ring;

