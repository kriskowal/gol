'use strict';

var Command = require('shon/command');

var TChannel = require('tchannel');
var Ringpop = require('ringpop');
var Point2 = require('ndim/point2');
var Ring = require('./ring');
var Game = require('./game');
var path = require('path');
var toobusy = require('toobusy');
var assert = require('assert');

var timers = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setImmediate: setImmediate,
    now: Date.now
};

var command = new Command('gol', {
//     version: '[-v|--version]* Display program version',
//     help: '[--help]* Display usage information',
    address: '[-l|--listen] <address> Host and port on which server listens (also node\'s identity in cluster',
    web: '[-w|--web-port] <port> :number Port for web service',
    peers: '[-P|--peers] <peers> Seed file of list of peers'
});

// command.version.handler = require('shon/version')(__dirname);
// command.help.handler = require('shon/help')(command);

command.address.converter = function convert(address, iterator, delegate) {
    var parts = address.split(':');
    if (parts.length !== 2) {
        delegate.error('Invalid: address');
        return null;
    }
    var port = parseInt(parts[1], 10);
    if (port !== port) {
        delegate.error('Invalid: port not a number');
        return null;
    }
    return {
        host: parts[0],
        port: +parts[1]
    };
};

function main() {
    var config = command.exec();

    var channel = new TChannel({
        logger: createLogger('tchannel'),
    });

    channel.listen(config.address.port, config.address.host, onListening);

    function onListening() {

        var golChannel = channel.makeSubChannel({
            serviceName: 'gol'
        });

        var golAsThrift = new channel.TChannelAsThrift({
            channel: golChannel,
            entryPoint: path.join(__dirname, 'gol.thrift')
        })

        golAsThrift.register('Gol::setChunk', null, function (ctx, req, head, body, cb) {
            game.receiveChunk(body.generation, body.quadkey, body.chunk, req.hostPort);
            cb(null, {ok: true, body: null, headers: null});
        });

        function sendChunk(request, callback) {
            golAsThrift.request({
                hostPort: ring.addresses[request.peer],
                serviceName: 'gol',
                hasNoParent: true,
                headers: {
                    cn: 'gol'
                },
                timeout: 1000
            }).send('Gol::setChunk', null, request, callback);
        }

        var chunkSize = new Point2(64, 64);
        var size = chunkSize.scale(16);

        var game = new Game({
            size: size,
            chunkSize: chunkSize,
            timers: timers,
            sendChunk: sendChunk
        });

        var ring = new Ring({
            hash: null,
            delegate: game,
            address: channel.hostPort,
            replicas: 1
        });

        var ringpopChannel = channel.makeSubChannel({
            serviceName: 'ringpop'
        });

        var ringpop = new Ringpop({
            app: 'gol',
            hostPort: channel.hostPort,
            logger: createLogger('ringpop'),
            channel: ringpopChannel,
            Ring: function () {
                return ring;
            }
        });

        ringpop.setupChannel();
        ringpop.bootstrap(config.peers);

        golChannel.peers = ringpopChannel.peers;

        game.start();

        process.stdout.write(CLEAR_SCREEN + HIDE_CURSOR);
        setInterval(function () {
            process.stdout.write(RESCAN);
            logGeneration(game, game.generation);
            logGeneration(game, game.generation.prev);
            logGeneration(game, game.generation.prev.prev);

            console.log(CLEAR_LINE + ring.address + ' in ' + ring.addresses.join(' '));
            console.log(CLEAR_LINE + 'checksum', ring.checksum);
            console.log(CLEAR_LINE + 'request queue', game.requestQueue.length, game.concurrentRequests);
            console.log(CLEAR_LINE + (game.lastError ? game.lastError.message : 'no error'));
            console.log(CLEAR_LINE + 'toobusy', toobusy());
        }, 100);

    }

}

var HIDE_CURSOR = '\x1b[?25l';
var CLEAR_LINE = '\x1b[K';
var CLEAR_SCREEN = '\x1b[2J';
var RESCAN = '\x1b[H';

function logGeneration(game, generation) {
    console.log(CLEAR_LINE + 'generation', generation.number, 'needs', count(generation.prev.neededChunks));
    process.stdout.write(game.range.render(null, generation.completedChunks, generation.neededChunks) + CLEAR_LINE);
    console.log(CLEAR_LINE + 'progress +%d/-%d %s', count(generation.completedChunks), count(generation.neededChunks), generation.complete ? 'complete' : 'incomplete', generation.duration);
}

function createLogger(name) {
    return {
        debug: function noop() {},
        info: enrich('info', 'log'),
        warn: enrich('warn', 'error'),
        error: enrich('error', 'error')
    };

    function enrich(level, method) {
        return function noop() {} // XXX
        return function log() {
            var args = Array.prototype.slice.call(arguments);
            args[0] = name + ' ' + level + ' ' + args[0];
            console[method].apply(console, args);
        };
    }
}

function count(object) {
    var num = 0;
    for (var name in object) {
        if (hasOwnProperty.call(object, name)) {
            num++;
        }
    }
    return num;
}

if (require.main === module) {
    main();
}
