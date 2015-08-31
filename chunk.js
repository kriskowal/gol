'use strict';

var assert = require('assert');
var Point2 = require('ndim/point2');
var Region2 = require('ndim/region2');

module.exports = Chunk;

var temp = new Point2();

function Chunk(args) {
    var self = this;
    self.region = args.region;
    self.position = self.region.position;
    self.size = self.region.size;
    self.iteration = 0;
    self.world = args.world;
    self.cells = [];
    for (var x = 0; x < self.size.x; x++) {
        temp.x = self.position.x + x;
        for (var y = 0; y < self.size.y; y++) {
            temp.y = self.position.y + y;
            self.set(temp, Math.random() < 0.2);
        }
    }
}

Chunk.prototype.get = function get(point) {
    var self = this;
    var x = point.x - self.position.x;
    var y = point.y - self.position.y;
    if (x < 0 || x >= self.size.x || y < 0 || y >= self.size.y) {
        return self.world.get(point);
    } else {
        return self.cells[y * self.size.x + x];
    }
};

Chunk.prototype.set = function set(point, value) {
    var self = this;
    var x = point.x - self.position.x;
    var y = point.y - self.position.y;
    if (x < 0 || x >= self.size.x || y < 0 || y >= self.size.y) {
        console.log('chunk miss', point.toString(), 'in', self.position);
        return self.world.set(point, value);
    } else {
        self.cells[y * self.size.x + x] = value;
    }
};

Chunk.prototype.iterateOnto = function iterateOnto(other) {
    var self = this;
    assert(self.position.equals(other.position), 'must iterate over same position');
    other.iteration = self.iteration + 1;
    for (var x = 0; x < self.size.x; x++) {
        for (var y = 0; y < self.size.y; y++) {
            var count = 0;
            // visiting the neighbors in this order:
            // 1 2 3
            // 8 9 4
            // 7 6 5
            temp.x = self.position.x + x - 1;
            temp.y = self.position.y + y - 1;
            count += self.get(temp); // nw
            temp.x += 1;
            count += self.get(temp); // nc
            temp.x += 1;
            count += self.get(temp); // ne
            temp.y += 1;
            count += self.get(temp); // ce
            temp.y += 1;
            count += self.get(temp); // se
            temp.x -= 1;
            count += self.get(temp); // sc
            temp.x -= 1;
            count += self.get(temp); // sw
            temp.y -= 1;
            count += self.get(temp); // sc
            temp.x += 1;
            var live = self.get(temp); // cc
            var becomes;
            if (live) {
                becomes = count === 2 || count === 3;
            } else {
                becomes = count === 3;
            }
            other.set(temp, becomes);
        }
    }
};

Chunk.prototype.draw = function draw() {
    var self = this;
    var out = '\x1b[2J\x1b[H';
    var temp = new Point2();
    for (var x = 0; x < self.size.x; x++) {
        temp.x = self.position.x + x;
        for (var y = 0; y < self.size.y; y++) {
            temp.y = self.position.y + y;
            out += self.get(temp) ? '• ' : '  ';
        }
        out += '\n';
    }
    console.log(out);
};

