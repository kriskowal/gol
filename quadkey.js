'use strict';

var Region2 = require('ndim/region2');
var Point2 = require('ndim/point2');

var dx = {0: 0, 1: 1, 2: 0, 3: 1};
var dy = {0: 0, 1: 0, 2: 1, 3: 1};
var quadrants = '0123';

// computes a quadkey, as used to name tiles, based on
// the position, including the scale, of the tile.
exports.encode = encode;
function encode(region, worldSize) {
    var size, path = '';
    // assert(worldSize.x === worldSize.y, 'quadkeys only apply to square regions');
    // assert(region.size.x === region.size.y, 'quadkeys only apply to square regions');
    var position = region.position;
    for (var size = region.size.x; size < worldSize.x; size *= 2) {
        var y = position.y & size && 1;
        var x = position.x & size && 1;
        path = quadrants.charAt(y << 1 | x) + path;
    }
    return path;
}

exports.decode = decode;
function decode(path, worldSize) {
    var region = new Region2(new Point2(), new Point2());
    decodeInto(path, region, worldSize);
    return region;
}

exports.decodeInto = decodeInto;
function decodeInto(path, region, worldSize) {
    region.position.x = 0;
    region.position.y = 0;
    region.size.x = worldSize.x;
    region.size.y = worldSize.y;
    for (var index = 0; index < path.length; index++) {
        var quadrant = path.charAt(index);
        region.size.x /= 2;
        region.size.y /= 2;
        region.position.x += dx[quadrant] * region.size.x;
        region.position.y += dy[quadrant] * region.size.y;
    }
}
