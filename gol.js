'use strict';

var assert = require('assert');
var fs = require('fs');
var Point2 = require('ndim/point2');
var Region2 = require('ndim/region2');
var chunkToPng = require('./png');
var quadkeyIntoRegion = require('./quadkey-from-string');

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
            self.cells[y * self.size.x + x] = Math.random() < 0.2;
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

function Backdrop() {
}

Backdrop.prototype.get = function get() {
    return Math.random() < 0.3;
};

function World(args) {
    var self = this;
    self.chunks = {};
    self.size = args.size.scale(4);
    self.chunkSize = args.chunkSize;
    self.backdrop = args.backdrop;
    var temp = new Point2();
    for (temp.x = 0; temp.x < self.size.x; temp.x += self.chunkSize.x) {
        for (temp.y = 0; temp.y < self.size.y; temp.y += self.chunkSize.y) {
            self.chunks[temp.toString()] = new Chunk({
                world: self,
                position: temp.clone(),
                size: self.chunkSize
            });
        }
    }
}

World.prototype.get = function get(point) {
    var self = this;
    if (
        point.x < 0 ||
        point.x >= self.size.x ||
        point.y < 0 ||
        point.y >= self.size.y
    ) {
        return self.backdrop.get(point);
    }
    var positionOfChunk = new Point2(
        self.chunkSize.x * Math.floor(point.x / self.chunkSize.x),
        self.chunkSize.y * Math.floor(point.y / self.chunkSize.y)
    );
    var chunk = self.chunks[positionOfChunk.toString()];
    return chunk.get(point);
};

World.prototype.iterateOnto = function iterate(other) {
    var self = this;
    var temp = new Point2();
    for (var x = 0; x < self.size.x; x += self.chunkSize.x) {
        temp.x = x;
        for (var y = 0; y < self.size.y; y += self.chunkSize.y) {
            temp.y = y;
            var key = temp.toString();
            var selfChunk = self.chunks[key];
            var otherChunk = other.chunks[key];
            selfChunk.iterateOnto(otherChunk);
        }
    }
};

function WorldBuffer() {
    var self = this;
    var size = new Point2(256, 256);
    // var position = new Point2(0, 0); // was for CHunk
    var args = {
        // position: position // was for Chunk
        size: size,
        chunkSize: size,
        backdrop: new Backdrop()
    };
    self.worlds = [];
    for (var index = 0; index < 10; index++) {
        self.worlds[index] = new World(args);
    }
    self.iteration = 0;
    self.index = 0;
    self.world = self.worlds[0];
}

WorldBuffer.prototype.iterate = function iterate() {
    var self = this;
    self.iteration += 1;
    var index = self.iteration % self.worlds.length;
    var world = self.worlds[self.index];
    var other = self.worlds[index];
    world.iterateOnto(other);
    self.index = index;
    self.world = other;
};

WorldBuffer.prototype.draw = function draw() {
    var self = this;
    self.world.chunks['Point2(0, 0)'].draw();
};

var worlds = new WorldBuffer();

var start = Date.now();
setInterval(function () {
    worlds.iterate();
    // worlds.draw();
}, 16);

var http = require('http');

var server = http.createServer(handleRequest);
server.listen(6007);

function handleRequest(req, res) {
    console.log(req.method, req.url);
    var match = /^\/([0-3]*)\.png$/.exec(req.url);
    if (req.url === '/now.json') {
        res.writeHead(200, 'OK', {'content-type': 'application/json'});
        var duration = Date.now() - start;
        res.end(JSON.stringify({
            iteration: worlds.iteration,
            duration: duration,
            frequency: worlds.iteration / duration,
            period: duration / worlds.iteration
        }));
    } else if (req.url === '/favicon.ico') {
        res.writeHead(404, 'No favicon for you', {'content-type': 'text/plain'});
        res.end('No favicon for you');
    } else if (match) {
        var quadkey = match[1];
        var region = new Region2(new Point2(), new Point2());
        quadkeyIntoRegion(quadkey, region, worlds.world.size);
        if (!worlds.world.chunks[region.position.toString()]) {
            res.writeHead(404, 'Not found', {'content-type': 'text/plain'});
            return res.end('Not found ' + region.position);
        }
        res.writeHead(200, 'OK', {'content-type': 'image/png'});
        chunkToPng(worlds.world.chunks[region.position.toString()]).pipe(res);
    } else {
        res.writeHead(200, 'OK', {'content-type': 'image/png'});
        chunkToPng(worlds.world.chunks['Point2(0, 0)']).pipe(res);
    }
}

