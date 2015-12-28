'use strict';

var assert = require('assert');
var Point2 = require('ndim/point2');
var Region2 = require('ndim/region2');

module.exports = Chunk;

var temp = new Point2();

function Chunk(args) {
    this.region = args.region;
    this.position = this.region.position;
    this.size = this.region.size;
    this.generationNumber = 0;

    this.world = args.world;

    this.buffer = new Buffer(1 * this.size.x * this.size.y);
    this.buffer.fill(0);

    this.age = null;
    for (var x = 0; x < this.size.x; x++) {
        temp.x = this.position.x + x;
        for (var y = 0; y < this.size.y; y++) {
            temp.y = this.position.y + y;
            this.set(temp, args.backdrop.get(temp));
        }
    }
}

Chunk.prototype.get = function get(point) {
    var x = point.x - this.position.x;
    var y = point.y - this.position.y;
    if (x < 0 || x >= this.size.x || y < 0 || y >= this.size.y) {
        return this.world.get(point);
    } else {
        return this.buffer.readUInt8(y * this.size.x + x, true);
    }
};

Chunk.prototype.set = function set(point, value) {
    var x = point.x - this.position.x;
    var y = point.y - this.position.y;
    if (x < 0 || x >= this.size.x || y < 0 || y >= this.size.y) {
        return this.world.set(point, value);
    } else {
        this.buffer.writeUInt8(y * this.size.x + x, value, true);
    }
};

Chunk.prototype.generateOnto = function generateOnto(other) {
    assert(this.position.equals(other.position), 'must iterate over same position');
    other.generationNumber = this.generationNumber + 1;
    for (var x = 0; x < this.size.x; x++) {
        for (var y = 0; y < this.size.y; y++) {
            var count = 0;
            // visiting the neighbors in this order:
            // 1 2 3
            // 8 9 4
            // 7 6 5
            temp.x = this.position.x + x - 1;
            temp.y = this.position.y + y - 1;
            count += this.get(temp); // nw
            temp.x += 1;
            count += this.get(temp); // nc
            temp.x += 1;
            count += this.get(temp); // ne
            temp.y += 1;
            count += this.get(temp); // ce
            temp.y += 1;
            count += this.get(temp); // se
            temp.x -= 1;
            count += this.get(temp); // sc
            temp.x -= 1;
            count += this.get(temp); // sw
            temp.y -= 1;
            count += this.get(temp); // sc
            temp.x += 1;
            var live = this.get(temp); // cc
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
    var out = '\x1b[2J\x1b[H';
    var temp = new Point2();
    for (var x = 0; x < this.size.x; x++) {
        temp.x = this.position.x + x;
        for (var y = 0; y < this.size.y; y++) {
            temp.y = this.position.y + y;
            out += this.get(temp) ? '• ' : '  ';
        }
        out += '\n';
    }
    console.log(out);
};
