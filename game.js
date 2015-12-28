'use strict';

var assert = require('assert');
var Point2 = require('ndim/point2');
var Void = require('./void');
var World = require('./world');
var WorldRange = require('./world-range');
var Generation = require('./generation');

var theVoid = new Void();

module.exports = Game;

function Game(args) {
    this.size = args.size;
    this.chunkSize = args.chunkSize;
    this.timers = args.timers;
    this.chunkProcessingInterval = args.chunkProcessingInterval;
    this.sendChunk = args.sendChunk;

    // This is a Ring delegate.
    // The following are populated by updatePeers.
    this.index = null;
    this.length = null;
    this.replicas = null;
    this.checksum = null;

    this.range = new WorldRange({
        size: this.size,
        chunkSize: this.chunkSize,
        delegate: null
    });
    this.range.updatePeers(0, 1, 1, null);

    // Create a ring of recyclable generation objects
    // circular buffer of generations
    this.generations = [
        this.createGeneration(),
        this.createGeneration(),
        this.createGeneration(),
        this.createGeneration()
    ];
    for (var i = 0; i < this.generations.length; i++) {
        var prev = this.generations[i];
        var next = this.generations[(i + 1) % this.generations.length];
        prev.next = next;
        next.prev = prev;
    }

    this.generation = this.generations[0];
    this.generation.onRangeUpdated();
    this.generation.start(0);

    this.maxConcurrentRequests = 10;
    this.concurrentRequests = 0;
    this.requestQueue = [];
    this.queuedChunks = {};

    var self = this;
    function boundTick() {
        self.nextChunk();
    }
    this.boundTick = boundTick;
}

Game.prototype.start = function start() {
    this.boundTick();
};

Game.prototype.createGeneration = function createGeneration() {
    return new Generation({
        world: this.createWorld(),
        range: this.range,
        game: this
    });
};

Game.prototype.createWorld = function createWorld() {
    return new World({
        chunkSize: this.chunkSize,
        size: this.size,
        backdrop: theVoid
    });
};

Game.prototype.updatePeers = function updatePeers(index, length, replicas, checksum) {
    this.length = length;
    this.index = index;
    this.replicas = replicas;
    this.checksum = checksum;
    this.range.updatePeers(index, length, replicas, checksum);
    this.generation.onRangeUpdated();
};

Game.prototype.nextChunk = function nextChunk() {
    this.timers.setImmediate(this.boundTick);
    for (var i = 0; i < this.generations.length; i++) {
        var generation = this.generations[i];
        generation.nextChunk();
    }
};

Game.prototype.getGeneration = function getGeneration(generationNumber) {
    var generation = this.generations[generationNumber % this.generations.length];
    if (generationNumber < generation.number) {
        return null;
    }
    if (generationNumber > generation.number) {
        generation.start(generationNumber);
        // Notably, if the other generation is already the prior, this is a no-op
        generation.prev.start(generationNumber - 1);
    }

    // TODO update this.generation to reflect the last generation with a complete prior generation

    return generation;
};

Game.prototype.enqueueChunk = function enqueueChunk(request) {
    if (this.queuedChunks[request.id]) {
        return;
    }
    this.queuedChunks[request.id] = true;
    this.requestQueue.push(request);
    this.sendNextChunk();
};

Game.prototype.flush = function flush() {
    if (this.concurrentRequests >= this.maxConcurrentRequests) {
        return;
    }
};

Game.prototype.sendNextChunk = function sendNextChunk() {
    var self = this;

    if (this.concurrentRequests >= this.maxConcurrentRequests || this.requestQueue.length <= 0) {
        return;
    }

    var request = this.requestQueue.shift();
    this.concurrentRequests++;
    this.sendChunk(request, onAcknowledged);

    function onAcknowledged(err, response) {
        self.onChunkAcknowledged(err, request, response);
    }
};

Game.prototype.onChunkAcknowledged = function onChunkAcknowledged(err, request, response) {
    this.concurrentRequests -= 1;
    delete this.queuedChunks[request.id];

    if (err) {
        this.lastError = err;
        // TODO drop if the peer no longer exists
        // TODO stop referring to peers by their index since that's not
        // consistent over ring changes.
        // TODO maybe not do this at all this.requestQueue.push(request);
    }

    this.sendNextChunk();
};

Game.prototype.receiveChunk = function receiveChunk(generationNumber, quadkey, buffer) {
    var generation = this.getGeneration(generationNumber);

    if (!generation) {
        return;
    }

    if (!generation.receiveChunk(quadkey, buffer)) {
        return;
    }
};

Game.prototype.generateOnto = function generateOnto(prev, next) {
    prev.generateOnto(next);
};
