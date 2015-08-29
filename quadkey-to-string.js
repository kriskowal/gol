'use strict';

// computes a quadkey, as used to name tiles, based on
// the position, including the scale, of the tile.
var quadrants = '0123';
function quadkeyString(region, worldSize) {
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

module.exports = quadkeyString;
