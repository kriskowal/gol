'use strict';

var assert = require('assert');
var fs = require('fs');
var Point2 = require('ndim/point2');
var Region2 = require('ndim/region2');
var chunkToPng = require('./png');
var quadkeyIntoRegion = require('./quadkey-from-string');
var Carousel = require('./carousel');
var World = require('./world');

function Backdrop() { }

Backdrop.prototype.get = function get() {
    return Math.random() < 0.3;
};

var size = new Point2(256, 256);

var args = {
    size: size,
    chunkSize: size,
    backdrop: new Backdrop()
};

var worlds = new Carousel({
    create: function createWorld() {
        return new World(args);
    }
});

var start = Date.now();
setInterval(function () {
    worlds.iterate();
}, 16);

var http = require('http');

var server = http.createServer(handleRequest);
server.listen(6007);

function handleRequest(req, res) {
    console.log(req.method, req.url);
    var match = /^\/i(\d+)\/q([0-3]*)\.png$/.exec(req.url);
    if (req.url === '/now.json') {
        res.writeHead(200, 'OK', {'content-type': 'application/json'});
        var duration = Date.now() - start;
        var iteration = worlds.value.iteration;
        res.end(JSON.stringify({
            iteration: iteration,
            duration: duration,
            frequency: iteration / duration,
            period: duration / iteration
        }));
    } else if (req.url === '/favicon.ico') {
        res.writeHead(404, 'No favicon for you', {'content-type': 'text/plain'});
        res.end('No favicon for you');
    } else if (match) {
        var iteration = +match[1];
        var quadkey = match[2];
        var world = worlds.get(iteration);
        if (!world) {
            res.writeHead(404, 'Not found', {'content-type': 'text/plain'});
            return res.end('Not found iteration ' + iteration);
        }
        var region = new Region2(new Point2(), new Point2());
        quadkeyIntoRegion(quadkey, region, world.size);
        if (!world.chunks[region.position.toString()]) {
            res.writeHead(404, 'Not found', {'content-type': 'text/plain'});
            return res.end('Not found ' + region.position);
        }
        res.writeHead(200, 'OK', {'content-type': 'image/png'});
        chunkToPng(world.chunks[region.position.toString()]).pipe(res);
    } else if (req.url === '/0.png') {
        res.writeHead(200, 'OK', {'content-type': 'image/png'});
        chunkToPng(worlds.value.chunks['Point2(0, 0)']).pipe(res);
    } else {
        res.writeHead(404, 'Not found', {'content-type': 'text/plain'});
        return res.end('Not found iteration ' + iteration);
    }
}

