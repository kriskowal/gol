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
        this.createGeneration(-4),
        this.createGeneration(-3),
        this.createGeneration(-2),
        this.createGeneration(-1)
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

    var self = this;
    function boundTick() {
        self.nextChunk();
    }
    this.boundTick = boundTick;
}

Game.prototype.start = function start() {
    this.boundTick();
};

Game.prototype.createGeneration = function createGeneration(number) {
    return new Generation({
        number: number,
        world: this.createWorld(),
        range: this.range,
        timers: this.timers,
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
    for (var i = 0; i < this.generations.length; i++) {
        var generation = this.generations[i];
        generation.onRangeUpdated();
    }
};

Game.prototype.nextChunk = function nextChunk() {
    for (var i = 0; i < this.generations.length; i++) {
        var generation = this.generations[i];
        for (var j = 0; j < 5; j++) {
            generation.computeChunk();
        }
    }
    this.timers.setTimeout(this.boundTick, 4);
};

Game.prototype.getGeneration = function getGeneration(generationNumber) {
    var generation = this.generations[generationNumber % this.generations.length];
    if (generationNumber < generation.number) {
        // the generation is lost to history
        return null;
    }
    if (generationNumber > generation.number) {
        generation.start(generationNumber);
        // Notably, if the other generation is already the prior, this is a no-op
        generation.prev.start(generationNumber - 1);
    }

    return generation;
};

Game.prototype.enqueueChunk = function enqueueChunk(request) {
    // randomize order of transmission
    var index = 0;
    if (this.requestQueue.length) {
        index = Math.floor(Math.random() * this.requestQueue.length);
        this.requestQueue.push(this.requestQueue[index]);
    }
    this.requestQueue[index] = request;
    this.sendNextChunk();
};

Game.prototype.sendNextChunk = function sendNextChunk() {
    var self = this;

    if (this.concurrentRequests >= this.maxConcurrentRequests || this.requestQueue.length <= 0) {
        return;
    }

    var request;
    for (;;) {
        request = this.requestQueue.shift();
        if (!request) return;
        if (request.generation >= this.generation.number - 1) {
            break;
        }
    }

    this.concurrentRequests++;
    this.sendChunk(request, onAcknowledged);

    function onAcknowledged(err, response) {
        self.onChunkAcknowledged(err, request, response);
    }
};

Game.prototype.onChunkAcknowledged = function onChunkAcknowledged(err, request, response) {
    this.concurrentRequests -= 1;

    if (err) {
        this.lastError = err;
        // TODO drop if the peer no longer exists
        // TODO stop referring to peers by their index since that's not
        // consistent over ring changes.
        // TODO maybe not do this at all this.requestQueue.push(request);
    }

    this.sendNextChunk();
};

Game.prototype.receiveChunk = function receiveChunk(generationNumber, quadkey, buffer, address) {
    var generation = this.getGeneration(generationNumber);
    if (!generation) {
        return;
    }
    generation.receiveChunk(quadkey, buffer, address);
};

Game.prototype.generateOnto = function generateOnto(prev, next) {
    prev.generateOnto(next);
};
