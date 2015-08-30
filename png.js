'use strict';

var PNG = require('node-png').PNG;
var Point2 = require('ndim/point2');

var point = new Point2();

module.exports = chunkToPng;
function chunkToPng(chunk) {
    var png = new PNG({filterType: 4});
    png.width = chunk.size.x;
    png.height = chunk.size.y;
    png.data = new Buffer(png.height * png.width * 4);
    for (var y = 0; y < png.height; y++) {
        point.y = chunk.position.y + y;
        for (var x = 0; x < png.width; x++) {
            point.x = chunk.position.x + x;
            var value = (1 - chunk.get(point)) * 255;
            var i = (png.width * y + x) << 2;
            png.data[i + 0] = value; // r
            png.data[i + 1] = value; // g
            png.data[i + 2] = value; // b
            png.data[i + 3] = 255; // a
        }
    }
    return png.pack();
}
