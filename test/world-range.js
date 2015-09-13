'use strict';

var Point2 = require('ndim/point2');
var test = require('tape');
var WorldRange = require('../world-range');

test('2x2 in 4x4', function t(assert) {

    var worldRange = new WorldRange({
        size: new Point2(4, 4),
        chunkSize: new Point2(2, 2)
    });

    worldRange.setRange(0, worldRange.length);
    assert.deepEquals(worldRange.getContents(), ['0', '1', '2', '3'], 'content of whole world');

    worldRange.setRange(0, worldRange.length / 2);
    assert.deepEquals(worldRange.getContents(), ['0', '2'], 'content of half world');
    assert.deepEquals(worldRange.getNeighbors(), ['1', '3'], 'content of neighborhood of half world');

    assert.end();
});

test('2x2 in 16x16', function t(assert) {

    var worldRange = new WorldRange({
        size: new Point2(16, 16),
        chunkSize: new Point2(2, 2)
    });

    worldRange.setRange(0, worldRange.chunkLength);
    assert.deepEquals(worldRange.getContents(), ['000'], 'world containing only a corner');
    assert.deepEquals(worldRange.getNeighbors(), ['001', '002', '003'], 'neighbors of corner');

    worldRange.setRange(0, worldRange.length);
    assert.deepEquals(worldRange.getNeighbors(), [], 'whole world has no neighbors');

    assert.end();
});
