'use strict'

var assert = require('assert');

module.exports = Generation;

function Generation(args) {
    this.world = args.world;
    this.range = args.range;
    this.game = args.game;
    this.number = args.number;
    this.timers = args.timers;
    this.complete = this.number === -1;

    this.prev = null;
    this.next = null;

    this.neededChunks = {}; // object-set of all needed quadkeys
    this.completedChunks = {}; // object-set of all completed keys

    this.neededOwnPool = []; // array of all needed and owned quadkeys to complete generation
    this.neededPool = []; // array of all needed quadkeys to complete generation

    this.collaborators = {};

    this.startedAt = args.timers.now();
    this.completedAt = null;
    this.duration = null;
}

Generation.prototype.start = function start(number) {
    if (number <= this.number) {
        return;
    }

    this.number = number;
    this.complete = number === -1;
    this.completedChunks = {};
    this.onRangeUpdated();

    this.collaborators = {};

    if (number > this.game.generation.number) {
        this.game.generation = this;
    }
};

Generation.prototype.onRangeUpdated = function onRangeUpdated() {
    this.neededOwnPool = Object.keys(this.range.contents);
    this.neededPool = computeNeededPool(this.range.allKeys, this.neededOwnPool);
    this.neededChunks = computeNeededChunks(this.range.allKeys, this.completedChunks);
    this.checkCompletion();
};

Generation.prototype.chooseKey = function chooseKey() {

    return key;
};

Generation.prototype.computeChunk = function computeChunk() {
    if (!this.prev.complete || this.prev.number !== this.number - 1) {
        return;
    }

    // prefer neededOwnChunk
    // fall back to neededChunk
    var pool;
    var own = false;
    if (this.neededOwnPool.length) {
        pool = this.neededOwnPool;
        own = true;
    } else if (this.neededPool.length) {
        pool = this.neededPool;
    } else {
        this.checkCompletion();
        return;
    }

    // Find a key that has not been completed, if any remain.
    var key;
    for (;;) {
        if (pool.length === 0) {
            this.checkCompletion();
            return;
        }
        var index = Math.floor(Math.random() * pool.length);
        var key = pool[index];
        popIndex(pool, index);

        if (!this.completedChunks[key]) {
            break;
        }
    }

    var nextChunk = this.world.defaultChunk(key);
    var prevChunk = this.prev.world.defaultChunk(key);

    this.game.generateOnto(prevChunk, nextChunk);
    this.completeChunk(key, 'computed');

    // Do not broadcast non-own chunks
    if (!own) {
        return;
    }

    // broadcast chunk to all peers
    for (var i = 0; i < this.range.peersLength; i++) {
        // TODO link actual chunk to drop requests to send stale buffers for recycled generations
        this.game.enqueueChunk({
            id: i + '/' + this.number + '/' + key,
            peer: i,
            quadkey: key,
            generation: this.number,
            chunk: nextChunk.buffer
        });
    }
};

Generation.prototype.receiveChunk = function receiveChunk(quadkey, buffer, address) {
    if (this.completedChunks[quadkey]) {
        return;
    }

    this.collaborators[address] = true;

    var chunk = this.world.defaultChunk(quadkey);
    buffer.copy(chunk.buffer);
    this.completeChunk(quadkey, 'received');
};

Generation.prototype.completeChunk = function completeChunk(quadkey, means) {
    delete this.neededChunks[quadkey];
    this.completedChunks[quadkey] = means;
    this.checkCompletion();
    // pools are updated as keys are plucked to eager avoid O(n) search
};

Generation.prototype.checkCompletion = function checkCompletion() {
    if (this.complete) {
        // TODO warn, why are we checking?
        return;
    }
    this.complete = this.complete || isEmptyObject(this.neededChunks);
    if (this.complete) {
        this.completedAt = this.timers.now();
        this.duration = this.completedAt - this.startedAt;
        this.next.start(this.number + 1);
    }
};

function computeNeededChunks(keys, own) {
    var diff = {};
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!own[key]) {
            diff[key] = true;
        }
    }
    return diff;
}

function computeNeededPool(keys, completed) {
    var pool = [];
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!completed[key]) {
            pool.push(key);
        }
    }
    return pool;
}

function popIndex(array, index) {
    assert(array.length > 0);
    assert(index < array.length);
    array[index] = array[array.length - 1];
    array.length--;
}

function isEmptyObject(object) {
    for (var name in object) {
        if (hasOwnProperty.call(object, name)) {
            return false;
        }
    }
    return true;
}

