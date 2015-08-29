'use strict';

var test = require('tape');
var Point2 = require('ndim/point2');
var Region2 = require('ndim/region2');
var quadkeyFromRegion = require('../quadkey-to-string');
var quadkeyIntoRegion = require('../quadkey-from-string');

test('1x1 chunk at 0,0 of 1x1 world', function t(assert) {
    var worldSize = new Point2(1, 1);
    var chunk = new Region2(new Point2(0, 0), new Point2(1, 1));
    var key = quadkeyFromRegion(chunk, worldSize);
    assert.equal(key, '', 'key "" for 1x1 chunk at origin of 1x1 world');
    assert.end();
});

test('1x1 chunk at 0,1 of 2x2 world', function t(assert) {
    var worldSize = new Point2(2, 2);
    var chunk = new Region2(new Point2(0, 1), new Point2(1, 1));
    var key = quadkeyFromRegion(chunk, worldSize);
    assert.equal(key, '2', 'key "2" for 1x1 chunk at 0,1 of 2x2 world');
    assert.end();
});

test('2x2 chunk at 0,0 of 2x2 world', function t(assert) {
    var worldSize = new Point2(2, 2);
    var chunk = new Region2(new Point2(0, 1), new Point2(2, 2));
    var key = quadkeyFromRegion(chunk, worldSize);
    assert.equal(key, '', 'key "" for 2x2 chunk at origin of 2x2 world');
    assert.end();
});

test('2x2 chunk at 2,0 of 4x4 world', function t(assert) {
    var worldSize = new Point2(4, 4);
    var chunk = new Region2(new Point2(2, 0), new Point2(2, 2));
    var key = quadkeyFromRegion(chunk, worldSize);
    assert.equal(key, '1', 'key "1" for 2x2 chunk at 2,0 of 4x4 world');
    assert.end();
});

test('2x2 chunk at 2,0 of 8x8 world', function t(assert) {
    var worldSize = new Point2(8, 8);
    var chunk = new Region2(new Point2(2, 0), new Point2(2, 2));
    var key = quadkeyFromRegion(chunk, worldSize);
    assert.equal(key, '01', 'key "01" for 2x2 chunk at 2,0 of 8x8 world');
    assert.end();
});

test('2x2 chunk at 7,7 of 8x8 world', function t(assert) {
    var worldSize = new Point2(8, 8);
    var chunk = new Region2(new Point2(6, 6), new Point2(2, 2));
    var key = quadkeyFromRegion(chunk, worldSize);
    assert.equal(key, '33', 'key "33" for 2x2 chunk at 6,6 of 8x8 world');
    assert.end();
});

test('2x2 chunk at 7,7 of 16x16 world', function t(assert) {
    var worldSize = new Point2(16, 16);
    var chunk = new Region2(new Point2(6, 6), new Point2(2, 2));
    var key = quadkeyFromRegion(chunk, worldSize);
    assert.equal(key, '033', 'key "033" for 2x2 chunk at 6,6 of 16x16 world');

    var region = new Region2(new Point2(), new Point2());
    quadkeyIntoRegion('033', region, worldSize);
    assert.ok(region.equals(chunk), 'write 6,6 with size 2x2 for key "033" of 16x16 world');

    assert.end();
});
