'use strict';

var Point2 = require('ndim/point2');
var Region2 = require('ndim/region2');
var Chunk = require('./chunk');

var temp = new Point2();

module.exports = World;

function World(args) {
    this.iteration = 0;
    this.chunks = {};
    this.size = args.size;
    this.chunkSize = args.chunkSize;
    this.backdrop = args.backdrop;
}

World.prototype.initAllChunks = function initAllChunks() {
    for (temp.x = 0; temp.x < this.size.x; temp.x += this.chunkSize.x) {
        for (temp.y = 0; temp.y < this.size.y; temp.y += this.chunkSize.y) {
            this.get(this.key(temp));
        }
    }
};

World.prototype.defaultChunk = function defaultChunk(key) {
    var chunk = this.chunks[key];
    if (chunk) {
        return chunk;
    }
    return this.createChunk(key);
};

World.prototype.createChunk = function createChunk(key) {
    var chunk = new Chunk({
        world: this,
        region: new Region2(
            temp.clone(),
            this.chunkSize
        ),
        backdrop: this.backdrop
    });
    this.chunks[key] = chunk;
    return chunk;
};

World.prototype.get = function get(point) {
    if (
        point.x < 0 ||
        point.x >= this.size.x ||
        point.y < 0 ||
        point.y >= this.size.y
    ) {
        return this.backdrop.get(point);
    }
    var positionOfChunk = new Point2(
        this.chunkSize.x * Math.floor(point.x / this.chunkSize.x),
        this.chunkSize.y * Math.floor(point.y / this.chunkSize.y)
    );
    var chunk = this.chunks[this.key(positionOfChunk)];
    return chunk.get(point);
};

World.prototype.key = function key(point) {
    return point.toString();
};

World.prototype.generateOnto = function iterate(other) {
    other.iteration = this.iteration + 1;
    var temp = new Point2();
    for (var x = 0; x < this.size.x; x += this.chunkSize.x) {
        temp.x = x;
        for (var y = 0; y < this.size.y; y += this.chunkSize.y) {
            temp.y = y;
            var key = this.key(temp);
            var chunk = this.chunks[key];
            var otherChunk = other.chunks[key];
            generateOnto(chunk, otherChunk);
            this.generateOnto(otherChunk);
        }
    }
};
