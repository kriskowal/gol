'use strict';

var fs = require('fs');
var Point2 = require('ndim/point2');
var chunkToPng = require('./png');

var temp = new Point2();

function Chunk(args) {
    var self = this;
    self.position = args.position;
    self.size = args.size;
    self.iteration = args.iteration;
    self.world = args.world;
    self.cells = [];
    for (var x = 0; x < self.size.x; x++) {
        for (var y = 0; y < self.size.y; y++) {
            self.cells[y * self.size.x + x] = Math.random() < 0.5;
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
        return self.world.set(point, value);
    } else {
        self.cells[y * self.size.x + x] = value;
    }
};

Chunk.prototype.iterateOnto = function iterateOnto(other) {
    var self = this;
    for (var x = 0; x < self.size.x; x++) {
        for (var y = 0; y < self.size.y; y++) {
            var count = 0;
            temp.x = x - 1;
            temp.y = y - 1;
            count += self.get(temp); // nw
            temp.x = x;
            count += self.get(temp); // nc
            temp.x = x + 1;
            count += self.get(temp); // ne
            temp.y = y;
            count += self.get(temp); // ce
            temp.y = y + 1;
            count += self.get(temp); // se
            temp.x = x;
            count += self.get(temp); // sc
            temp.x = x - 1;
            count += self.get(temp); // sw
            temp.y = y;
            count += self.get(temp); // sc
            temp.x = x;
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
    for (var x = 0; x < self.size.x; x++) {
        temp.x = x;
        for (var y = 0; y < self.size.y; y++) {
            temp.y = y;
            out += self.get(temp) ? '• ' : '  ';
        }
        out += '\n';
    }
    console.log(out);
};

function Backdrop() {
}

Backdrop.prototype.get = function get() {
    return Math.random () < .5;
};

function RotatingWorlds() {
    var self = this;
    var size = new Point2(256, 256);
    var position = new Point2(0, 0);
    var args = {position: position, size: size, world: new Backdrop()};
    self.worlds = [];
    for (var index = 0; index < 10; index++) {
        self.worlds[index] = new Chunk(args);
    }
    self.index = 0;
    self.world = self.worlds[index];
}

RotatingWorlds.prototype.iterate = function iterate() {
    var self = this;
    var index = (self.index + 1) % self.worlds.length;
    var world = self.worlds[self.index];
    var other = self.worlds[index];
    world.iterateOnto(other);
    self.index = index;
    self.world = other;
};

RotatingWorlds.prototype.draw = function draw() {
    var self = this;
    self.world.draw();
};

var worlds = new RotatingWorlds();

setInterval(function () {
    worlds.iterate();
}, 100);

var http = require('http');

var server = http.createServer(handleRequest);
server.listen(6007);

function handleRequest(req, res) {
    res.writeHead(200, 'OK', {'content-type': 'image/png'});
    chunkToPng(worlds.world).pipe(res);
}

