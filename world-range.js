'use strict';

var Point2 = require('ndim/point2');
var Region2 = require('ndim/region2');
var Quadkey = require('./quadkey');
var Hilbert2 = require('./hilbert2');

module.exports = WorldRange;

function WorldRange(args) {
    // dimensions of the world
    this.size = args.size;
    // dimensions of each chunk of the world
    this.chunkSize = args.chunkSize;
    // delegate for receiving update events
    this.delegate = args.delegate;

    // length of the hilbert curve of the whole world
    this.hilbertLength = Hilbert2.sizeToLength(this.size);
    // length of the hilbert curve of each chunk of the world
    this.chunkHilbertLength = Hilbert2.sizeToLength(this.chunkSize);
    // index of this member of the cluster
    this.peersIndex = null;
    // number of members in the cluster
    this.peersLength = null;
    // approximate number of members of the cluster that own each chunk
    this.peersReplicas = null;
    // the position of the hilbert curve on which this range begins
    this.begin = null;
    // the position of the hilbert curve on which this range ends (exclusive)
    this.end = null;
    // the set of chunk quadkeys that this range of the hilbert curve contains
    this.contents = {};
    // the set of chunk quadkeys that this range of the hilbert curve either contains or neighbors
    this.neighborhood = {};
    // keys of prior object in sorted order
    this.neighborhoodKeys = [];
    // a list of chunk quadkeys for all neighbors of this hilbert range
    this.neighbors = [];

    this.chunkPosition = new Point2();
    this.worldRegion = new Region2(new Point2(0, 0), this.size);
    this.chunkRegion = new Region2(this.chunkPosition, this.chunkSize);

    this.all = {};
    this.allKeys = [];
    // populate all, allKeys
    var point = new Point2();
    var worldRegion = new Region2(new Point2(0, 0), this.size);
    var chunkRegion = new Region2(point, this.chunkSize);
    for (var hilbert = 0; hilbert < this.hilbertLength; hilbert += this.chunkHilbertLength) {
        Hilbert2.decodeInto(hilbert, point, this.hilbertLength); // cc
        point.divThis(this.chunkSize).floorThis().mulThis(this.chunkSize);
        var quadkey = Quadkey.encode(chunkRegion, this.size);
        this.all[quadkey] = true;
        this.allKeys.push(quadkey);
    }
}

WorldRange.prototype.lookup = function lookup(quadkey) {
	Quadkey.decodeInto(quadkey, this.chunkRegion, this.size);
	var hilbertIndex = Hilbert2.encode(this.chunkPosition, this.hilbertLength);
	return Math.floor(hilbertIndex * this.hilbertToPeers);
};

WorldRange.prototype.getContents = function getContents() {
    return Object.keys(this.contents).sort();
};

WorldRange.prototype.getNeighbors = function getNeighbors() {
    return this.neighbors;
};

WorldRange.prototype.updatePeers = function updatePeers(peersIndex, peersLength, peersReplicas) {
    this.peersToHilbert = this.hilbertLength / peersLength;
    this.hilbertToPeers = peersLength / this.hilbertLength;
    this.peersIndex = peersIndex;
    this.peersLength = peersLength;
    this.peersReplicas = peersReplicas;
    this.updateRangeInto(this, peersIndex);
    this.setRange(this.begin, this.end);
    if (this.delegate) {
        this.delegate.updateRange(this);
    }
};

WorldRange.prototype.updateRangeInto = function updatePositionInto(that, index) {
    var hilbertLength = Math.ceil(this.peersReplicas * this.peersToHilbert);
    if (hilbertLength > this.hilbertLength) {
        that.begin = 0;
        that.end = 0;
    } else {
        that.begin = Math.floor(
            (this.peersLength + index) *
            this.peersToHilbert
        ) % this.hilbertLength;
        that.end = (that.begin + hilbertLength) % this.hilbertLength;
    }
};

// Accepts an initial and terminal (exclusive) hilbert key number.
// Updates the ownership and neighborhood indexes.
WorldRange.prototype.setRange = function setRange(begin, end) {
    this.contents = {};
    this.neighborhood = {};
    if (end === 0) {
        end = this.hilbertLength;
    }
    if (begin < end) {
        this.addRange(begin, end);
    } else {
        this.addRange(0, end);
        this.addRange(begin, this.hilbertLength);
    }
    this.updateNeighbors();
};

WorldRange.prototype.addRange = function addRange(begin, end) {
    var point = new Point2();
    var worldRegion = new Region2(new Point2(0, 0), this.size);
    var chunkRegion = new Region2(point, this.chunkSize);

    var quadkey;
    for (var hilbert = begin; hilbert < end; hilbert += this.chunkHilbertLength) {

        Hilbert2.decodeInto(hilbert, point, this.hilbertLength); // cc
        point.divThis(this.chunkSize).floorThis().mulThis(this.chunkSize);
        quadkey = Quadkey.encode(chunkRegion, this.size);
        // console.log('%s: %s, %s', quadkey, worldRegion, chunkRegion, worldRegion.contains(chunkRegion));
        this.contents[quadkey] = true;
        this.neighborhood[quadkey] = this.neighborhood[quadkey] || 0;
        this.neighborhood[quadkey] += worldRegion.contains(chunkRegion);

        point.y -= this.chunkSize.y; // nc
        quadkey = Quadkey.encode(chunkRegion, this.size);
        // console.log('%s+nc: %s, %s', quadkey, worldRegion, chunkRegion, worldRegion.contains(chunkRegion));
        this.neighborhood[quadkey] = this.neighborhood[quadkey] || 0;
        this.neighborhood[quadkey] += worldRegion.contains(chunkRegion);

        point.x += this.chunkSize.x; // ne
        quadkey = Quadkey.encode(chunkRegion, this.size);
        // console.log('%s+ne: %s, %s', quadkey, worldRegion, chunkRegion, worldRegion.contains(chunkRegion));
        this.neighborhood[quadkey] = this.neighborhood[quadkey] || 0;
        this.neighborhood[quadkey] += worldRegion.contains(chunkRegion);

        point.y += this.chunkSize.y; // ce
        quadkey = Quadkey.encode(chunkRegion, this.size);
        // console.log('ce=%s: %s, %s', quadkey, worldRegion, chunkRegion, worldRegion.contains(chunkRegion));
        this.neighborhood[quadkey] = this.neighborhood[quadkey] || 0;
        this.neighborhood[quadkey] += worldRegion.contains(chunkRegion);

        point.y += this.chunkSize.y; // se
        quadkey = Quadkey.encode(chunkRegion, this.size);
        // console.log('%s+se: %s, %s', quadkey, worldRegion, chunkRegion, worldRegion.contains(chunkRegion));
        this.neighborhood[quadkey] = this.neighborhood[quadkey] || 0;
        this.neighborhood[quadkey] += worldRegion.contains(chunkRegion);

        point.x -= this.chunkSize.x; // sc
        quadkey = Quadkey.encode(chunkRegion, this.size);
        // console.log('%s+sc: %s, %s', quadkey, worldRegion, chunkRegion, worldRegion.contains(chunkRegion));
        this.neighborhood[quadkey] = this.neighborhood[quadkey] || 0;
        this.neighborhood[quadkey] += worldRegion.contains(chunkRegion);

        point.x -= this.chunkSize.x; // sw
        quadkey = Quadkey.encode(chunkRegion, this.size);
        // console.log('%s+sw: %s, %s', quadkey, worldRegion, chunkRegion, worldRegion.contains(chunkRegion));
        this.neighborhood[quadkey] = this.neighborhood[quadkey] || 0;
        this.neighborhood[quadkey] += worldRegion.contains(chunkRegion);

        point.y -= this.chunkSize.y; // cw
        quadkey = Quadkey.encode(chunkRegion, this.size);
        // console.log('%s+cw: %s, %s', quadkey, worldRegion, chunkRegion, worldRegion.contains(chunkRegion));
        this.neighborhood[quadkey] = this.neighborhood[quadkey] || 0;
        this.neighborhood[quadkey] += worldRegion.contains(chunkRegion);

        point.y -= this.chunkSize.y; // nw
        quadkey = Quadkey.encode(chunkRegion, this.size);
        // console.log('%s+nw: %s, %s', quadkey, worldRegion, chunkRegion, worldRegion.contains(chunkRegion));
        this.neighborhood[quadkey] = this.neighborhood[quadkey] || 0;
        this.neighborhood[quadkey] += worldRegion.contains(chunkRegion);
    }

};

WorldRange.prototype.eachChunk = function eachChunk(callback, thisp) {
    var begin = this.begin;
    var end = this.end;
    if (end === 0) {
        end = this.hilbertLength;
    }
    if (begin < end) {
        this.eachChunkWithin(begin, end, callback, thisp);
    } else {
        this.eachChunkWithin(0, end);
        this.eachChunkWithin(begin, this.hilbertLength, callback, thisp);
    }
};

WorldRange.prototype.eachChunkWithin = function eachChunk(begin, end, callback, thisp) {
    var neighbors = []; // re-used
    var quadkey;
    for (var hilbert = begin; hilbert < end; hilbert += this.chunkHilbertLength) {

        Hilbert2.decodeInto(hilbert, this.chunkPosition, this.hilbertLength); // cc
        this.chunkPosition.divThis(this.chunkSize).floorThis().mulThis(this.chunkSize);
        var quadkey = Quadkey.encode(this.chunkRegion, this.size)
        neighbors.push(quadkey);

        this.chunkPosition.y -= this.chunkSize.y; // nc
        if (this.worldRegion.contains(this.chunkRegion)) {
            neighbors.push(Quadkey.encode(this.chunkRegion, this.size));
        }

        this.chunkPosition.x += this.chunkSize.x; // ne
        if (this.worldRegion.contains(this.chunkRegion)) {
            neighbors.push(Quadkey.encode(this.chunkRegion, this.size));
        }

        this.chunkPosition.y += this.chunkSize.y; // ce
        if (this.worldRegion.contains(this.chunkRegion)) {
            neighbors.push(Quadkey.encode(this.chunkRegion, this.size));
        }

        this.chunkPosition.y += this.chunkSize.y; // se
        if (this.worldRegion.contains(this.chunkRegion)) {
            neighbors.push(Quadkey.encode(this.chunkRegion, this.size));
        }

        this.chunkPosition.x -= this.chunkSize.x; // sc
        if (this.worldRegion.contains(this.chunkRegion)) {
            neighbors.push(Quadkey.encode(this.chunkRegion, this.size));
        }

        this.chunkPosition.x -= this.chunkSize.x; // sw
        if (this.worldRegion.contains(this.chunkRegion)) {
            neighbors.push(Quadkey.encode(this.chunkRegion, this.size));
        }

        this.chunkPosition.y -= this.chunkSize.y; // cw
        if (this.worldRegion.contains(this.chunkRegion)) {
            neighbors.push(Quadkey.encode(this.chunkRegion, this.size));
        }

        this.chunkPosition.y -= this.chunkSize.y; // nw
        if (this.worldRegion.contains(this.chunkRegion)) {
            neighbors.push(Quadkey.encode(this.chunkRegion, this.size));
        }

        callback.call(thisp, quadkey, neighbors);

        neighbors.length = 0;
    }
};

WorldRange.prototype.updateNeighbors = function updateNeighbors() {
    var quadkeys = Object.keys(this.neighborhood).sort();
    this.neighborhoodKeys = quadkeys;
    this.neighbors.length = 0;
    for (var index = 0; index < quadkeys.length; index++) {
        var quadkey = quadkeys[index];
        if (!!this.neighborhood[quadkey] && !this.contents[quadkey]) {
            this.neighbors.push(quadkey);
        }
    }
};

WorldRange.prototype.render = function render(history, completed, needed) {
    var self = this;
    var out = '';
    history = history || {};
    var position = new Point2();
    var region = new Region2(position, this.chunkSize);
    for (position.x = 0; position.x < self.size.x; position.x += self.chunkSize.x) {
        for (position.y = 0; position.y < self.size.y; position.y += self.chunkSize.y) {
            out += self.glyph(region, history, completed, needed) + ' ';
        }
        out += '\n';
    }
    return out;
};

WorldRange.prototype.glyph = function glyph(region, history, completed, needed) {
    var quadkey = Quadkey.encode(region, this.size);
    var glyph;
    if (this.contents[quadkey]) {
        history[quadkey] = true;
        glyph = '•';
    } else if (history[quadkey]) {
        glyph = '∙';
    } else if (this.neighborhood[quadkey]) {
        glyph = '◦';
    } else {
        glyph = '·';
    }
    var pre = '';
    var post = '';
    if (completed) {
        if (needed && needed[quadkey] && completed[quadkey] === 'computed') {
            pre = '\x1b[33m'; // yellow
        } else if (completed[quadkey] === 'received') {
            pre = '\x1b[34m'; // blue
        } else if (completed[quadkey] === 'computed') {
            pre = '\x1b[32m'; // green
        } else {
            pre = '\x1b[31m'; // red
        }
        post = '\x1b[0m';
    }
    return pre + glyph + post;
};
