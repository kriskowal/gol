
var Point2 = require('ndim/point2');
var Region2 = require('ndim/region2');
var Quadkey = require('./quadkey');
var Hilbert2 = require('./hilbert2');

module.exports = WorldRange;

function WorldRange(args) {
    this.size = args.size;
    this.chunkSize = args.chunkSize;
    this.length = Hilbert2.sizeToLength(this.size);
    this.chunkLength = Hilbert2.sizeToLength(this.chunkSize);
    this.contents = {};
    this.neighborhood = {};
}

WorldRange.prototype.contains = function (quadkey) {
    return this.contents[quadkey] === true;
};

WorldRange.prototype.neighbors = function (quadkey) {
    return !!this.neighborhood[quadkey] && !this.contents[quadkey];
};

WorldRange.prototype.getNeighbors = function getNeighbors() {
    var neighbors = [];
    var keys = Object.keys(this.neighborhood).sort();
    for (var index = 0; index < keys.length; index++) {
        var key = keys[index];
        if (this.neighbors(key)) {
            neighbors.push(key);
        }
    }
    return neighbors;
};

WorldRange.prototype.getContents = function getContents() {
    return Object.keys(this.contents).sort();
};

// Accepts an initial and terminal (exclusive) hilbert key number.
// Updates the ownership and neighborhood indexes.
WorldRange.prototype.setRange = function setRange(begin, end) {
    var point = new Point2();
    var worldRegion = new Region2(new Point2(0, 0), this.size);
    var chunkRegion = new Region2(point, this.chunkSize);

    this.contents = {};
    this.neighborhood = {};

    var quadkey;
    for (var hilbert = begin; hilbert < end; hilbert += this.chunkLength) {

        Hilbert2.decodeInto(hilbert, point, this.length); // cc
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

