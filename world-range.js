
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
    // length of the hilbert curve of the whole world
    this.hilbertLength = Hilbert2.sizeToLength(this.size);
    // length of the hilbert curve of each chunk of the world
    this.chunkHilbertLength = Hilbert2.sizeToLength(this.chunkSize);
    // index of this member of the cluster
    this.membershipIndex = null;
    // number of members in the cluster
    this.membershipLength = null;
    // approximate number of members of the cluster that own each chunk
    this.membershipReplicas = null;
    // the position of the hilbert curve on which this range begins
    this.begin = null;
    // the position of the hilbert curve on which this range ends (exclusive)
    this.end = null;
    // the set of quadkeys that this range of the hilbert curve contains
    this.contents = {};
    // the set of quadkeys that this range of the hilbert curve either contains or neighbors
    this.neighborhood = {};
    // a list of quadkeys for all neighbors of this hilbert range
    this.neighbors = [];
}

WorldRange.prototype.getContents = function getContents() {
    return Object.keys(this.contents).sort();
};

WorldRange.prototype.getNeighbors = function getNeighbors() {
    return this.neighbors;
};

WorldRange.prototype.updateMembership = function updateMembership(membershipIndex, membershipLength, membershipReplicas) {
    this.membershipToHilbert = this.hilbertLength / membershipLength;
    this.hilbertToMembership = membershipLength / this.hilbertLength;
    this.membershipIndex = membershipIndex;
    this.membershipLength = membershipLength;
    this.membershipReplicas = membershipReplicas;
    this.updateRangeInto(this, membershipIndex);
    this.setRange(this.begin, this.end);
    this.updatePlan();
};

WorldRange.prototype.updateRangeInto = function updatePositionInto(that, index) {
    var hilbertLength = Math.ceil(this.membershipReplicas * this.membershipToHilbert);
    if (hilbertLength > this.hilbertLength) {
        that.begin = 0;
        that.end = 0;
    } else {
        that.begin = Math.floor(
            (this.membershipLength + index) *
            this.membershipToHilbert
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

WorldRange.prototype.updateNeighbors = function updateNeighbors() {
    var quadkeys = Object.keys(this.neighborhood).sort();
    this.neighbors.length = 0;
    for (var index = 0; index < quadkeys.length; index++) {
        var quadkey = quadkeys[index];
        if (!!this.neighborhood[quadkey] && !this.contents[quadkey]) {
            this.neighbors.push(quadkey);
        }
    }
};

WorldRange.prototype.updatePlan = function updatePlan(ratio, redundancy) {
    var point = new Point2();
    this.plan = {} // quadkey -> [member indexes]

    var neighbors = Object.keys(this.neighborhood);
    for (var index = 0; index < this.neighborhood.length; index++) {
        var quadkey = this.neighborhood[index];
        Quadkey.decodeInto(quadkey, point, this.size);
        var hilbert = Hilbert2.encode(point, this.hilbertLength);
        // TODO
    }
};

WorldRange.prototype.render = function render(history) {
    var self = this;
    var out = '';
    history = history || {};
    var position = new Point2();
    var region = new Region2(position, this.chunkSize);
    for (position.x = 0; position.x < self.size.x; position.x += self.chunkSize.x) {
        for (position.y = 0; position.y < self.size.y; position.y += self.chunkSize.y) {
            out += self.glyph(region, history) + ' ';
        }
        out += '\n';
    }
    return out;
};

WorldRange.prototype.glyph = function glyph(region, history) {
    var quadkey = Quadkey.encode(region, this.size);
    if (this.contents[quadkey]) {
        history[quadkey] = true;
        return '•';
    } else if (history[quadkey]) {
        return '∙';
    } else if (this.neighborhood[quadkey]) {
        return '◦';
    } else {
        return ' ';
    }
};
