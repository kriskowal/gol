'use strict';

var Point2 = require('ndim/point2');
var Region2 = require('ndim/region2');
var Chunk = require('./chunk');

var temp = new Point2();

module.exports = World;

function World(args) {
    var self = this;
    self.iteration = 0;
    self.chunks = {};
    self.size = args.size.scale(4);
    self.chunkSize = args.chunkSize;
    self.backdrop = args.backdrop;
    var temp = new Point2();
    for (temp.x = 0; temp.x < self.size.x; temp.x += self.chunkSize.x) {
        for (temp.y = 0; temp.y < self.size.y; temp.y += self.chunkSize.y) {
            self.chunks[temp.toString()] = new Chunk({
                world: self,
                region: new Region2(
                    temp.clone(),
                    self.chunkSize
                )
            });
        }
    }
}

World.prototype.get = function get(point) {
    var self = this;
    if (
        point.x < 0 ||
        point.x >= self.size.x ||
        point.y < 0 ||
        point.y >= self.size.y
    ) {
        return self.backdrop.get(point);
    }
    var positionOfChunk = new Point2(
        self.chunkSize.x * Math.floor(point.x / self.chunkSize.x),
        self.chunkSize.y * Math.floor(point.y / self.chunkSize.y)
    );
    var chunk = self.chunks[positionOfChunk.toString()];
    return chunk.get(point);
};

World.prototype.iterateOnto = function iterate(other) {
    var self = this;
    other.iteration = self.iteration + 1;
    var temp = new Point2();
    for (var x = 0; x < self.size.x; x += self.chunkSize.x) {
        temp.x = x;
        for (var y = 0; y < self.size.y; y += self.chunkSize.y) {
            temp.y = y;
            var key = temp.toString();
            var selfChunk = self.chunks[key];
            var otherChunk = other.chunks[key];
            selfChunk.iterateOnto(otherChunk);
        }
    }
};
