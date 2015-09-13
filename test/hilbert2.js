'use strict';

var test = require('tape');
var Point2 = require('ndim/point2');
var Hilbert2 = require('../hilbert2');

function distance(a, b) {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

test('1x1 in 2x2', function t(assert) {
    var worldSize = new Point2(2, 2);
    var chunkSize = new Point2(1, 1);
    testHilbert(worldSize, chunkSize, assert);
    assert.end();
});

test('1x1 in 4x4', function t(assert) {
    var worldSize = new Point2(4, 4);
    var chunkSize = new Point2(1, 1);
    testHilbert(worldSize, chunkSize, assert);
    assert.end();
});

test('2x2 in 4x4', function t(assert) {
    var worldSize = new Point2(4, 4);
    var chunkSize = new Point2(2, 2);
    testHilbert(worldSize, chunkSize, assert);
    assert.end();
});

test('4x4 in 16x16', function t(assert) {
    var worldSize = new Point2(16, 16);
    var chunkSize = new Point2(4, 4);
    testHilbert(worldSize, chunkSize, assert);
    assert.end();
});

function testHilbert(worldSize, chunkSize, assert) {
    var worldLength = Hilbert2.sizeToLength(worldSize);
    var chunkLength = Hilbert2.sizeToLength(chunkSize);
    var point = new Point2();
    var prev = new Point2(0, 0);
    for (var index = 0; index < worldLength; index += chunkLength) {
        Hilbert2.decodeInto(index, point, worldLength);
        point.divThis(chunkSize).floorThis().mulThis(chunkSize);
        if (index) {
            assert.equals(distance(point, prev), chunkSize.x, (index - chunkSize.x) + '..' + index);
        }
        prev.become(point);
    }
}
