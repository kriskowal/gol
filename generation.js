'use strict'

var assert = require('assert');

module.exports = Generation;

function Generation(args) {
    this.world = args.world;
    this.range = args.range;
    this.game = args.game;
    this.prev = null;

    this.number = -1;
    this.complete = true;

    this.neededChunks = {}; // object-set of all needed quadkeys
    this.completedChunks = {}; // object-set of all completed keys

    this.neededOwnPool = []; // array of all needed and owned quadkeys to complete generation
    this.neededPool = []; // array of all needed quadkeys to complete generation
}

Generation.prototype.start = function start(number) {
    if (number <= this.number) {
        return;
    }

    this.number = number;
    this.complete = number < 0;
    this.completedChunks = {};
    this.onRangeUpdated();

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

Generation.prototype.nextChunk = function nextChunk() {
    this.computeChunk();
};

Generation.prototype.chooseKey = function chooseKey() {
    // prefer neededOwnChunk
    // fall back to neededChunk
    var pool;
    if (this.neededOwnPool.length) {
        pool = this.neededOwnPool;
    } else if (this.neededPool.length) {
        pool = this.neededPool;
    } else {
        return null;
    }

    var index = Math.floor(Math.random() * pool.length);
    var key = pool[index];
    popIndex(pool, index);

    return key;
};

Generation.prototype.computeChunk = function computeChunk() {
    if (!this.prev.complete) {
        return;
    }

    // Find a key that has not been completed, if any remain.
    var key;
    for (;;) {
        key = this.chooseKey();
        if (key === null) {
            // no more keys
            this.checkCompletion();
            return;
        }
        if (!this.completedChunks[key]) {
            break;
        }
    }

    var nextChunk = this.world.defaultChunk(key);
    var prevChunk = this.prev.world.defaultChunk(key);

    this.game.generateOnto(prevChunk, nextChunk);
    this.completeChunk(key, 'computed');

    // broadcast chunk to all peers
    for (var i = 0; i < this.range.peersLength; i++) {
        this.game.enqueueChunk({
            id: i + '/' + this.number + '/' + key,
            peer: i,
            quadkey: key,
            generation: this.number,
            chunk: nextChunk.buffer
        });
    }
};

Generation.prototype.receiveChunk = function receiveChunk(quadkey, buffer) {
    if (this.completedChunks[quadkey]) {
        return;
    }

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
    this.complete = isEmptyObject(this.neededChunks);
    if (this.complete) {
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

