'use strict';

var program = require('commander');
var TChannel = require('tchannel');
var Ringpop = require('ringpop');
var Point2 = require('ndim/point2');
var WorldService = require('./world-service');

function main() {
    program
        .version(require('./package.json').version)
        .usage('[options]')
        .option('-l, --listen <listen>', 'Host and port on which server listens (also node\'s identity in cluster)')
        .option('-h, --hosts <hosts>', 'Seed file of list of hosts to join')
        .parse(process.argv);

    var listen = program.listen;

    if (!listen) {
        console.error('Error: listen arg is required');
        process.exit(1);
    }

    var channel = new TChannel({
        logger: createLogger('tchannel'),
    });

    var listenParts = listen.split(':');
    channel.listen(+listenParts[1], listenParts[0], onListening);

    function onListening() {

        var ringpop = new Ringpop({
            app: 'gol',
            hostPort: channel.hostPort,
            logger: createLogger('ringpop'),
            channel: channel.makeSubChannel({
                serviceName: 'ringpop'
            })
        });

        ringpop.setupChannel();
        ringpop.bootstrap(program.hosts);

        var worldService = new WorldService({
            address: channel.hostPort,
            ringpop: ringpop,
            logger: createLogger('world'),
            channel: channel.makeSubChannel({
                serviceName: 'gol'
            }),
            size: new Point2(512, 512),
            chunkSize: new Point2(32, 32),
            replicas: 3
        });

        worldService.start();

        setTimeout(function () {
            process.exit();
        }, Math.random() * 60 * 1000 + 60 * 1000);

    }

}

function createLogger(name) {
    return {
        debug: function noop() {},
        info: enrich('info', 'log'),
        warn: enrich('warn', 'error'),
        error: enrich('error', 'error')
    };

    function enrich(level, method) {
        return function log() {
            var args = Array.prototype.slice.call(arguments);
            args[0] = name + ' ' + level + ' ' + args[0];
            console[method].apply(console, args);
        };
    }
}

if (require.main === module) {
    main();
}
