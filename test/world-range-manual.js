'use strict';

var Region2 = require('ndim/region2');
var Point2 = require('ndim/point2');

var WorldRange = require('../world-range');

var range = new WorldRange({
    size: new Point2(32, 32),
    chunkSize: new Point2(2, 2),
});

var membershipLength = 1;
var membershipIndex = 0;
var membershipReplicas = 1;
var history = {};

function tick() {
    console.log('\x1b[2J\x1b[Hmember %d of %d with %d replicas', membershipIndex + 1, membershipLength, membershipReplicas);
    range.updateMembership(membershipIndex, membershipLength, membershipReplicas);
    console.log(range.render(history));
    membershipIndex += 1;
    if (membershipIndex >= membershipLength) {
        history = {};
        membershipLength++;
        membershipIndex = 0;
    }
    console.log('');
    console.log('   %d neighbors', range.neighbors.length);
    console.log(' • chunk in current partition');
    console.log(' ◦ uncovered neighbor of current partition');
    console.log(' ∙ coverage from prior partitions');
    console.log('');
    setTimeout(tick, 250);
}
tick();
