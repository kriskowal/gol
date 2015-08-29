'use strict';

module.exports = quadkeyIntoRegion;

var dx = {0: 0, 1: 1, 2: 0, 3: 1};
var dy = {0: 0, 1: 0, 2: 1, 3: 1};

function quadkeyIntoRegion(path, region, worldSize) {
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
