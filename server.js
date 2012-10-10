var express = require('express')
  , app = express()
  , routes = require('./routes')
  , util = require('util')
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , fleet = require('./lib/fleet')
  , csv = require('csv')
  , request = require('superagent')
  , _ = require('underscore')
  , config = require('./config/aws-config.json');

server.listen(3000, function(){
    console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
});

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/components'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

app.get('/', routes.index);


io.configure('development',function(){
    io.set('log level',2);
});

io.sockets.on('connection', function (socket) {
    var socket = socket;

    socket.on('logs',function(){
        siegeLogs(socket);
    });

    siegeLogs(socket);
    status(socket);
    setInterval(function() {
        status(socket);
    },500);
});

function siegeLogs(socket) {
    var regions = fleet.loadRegions();
    regions.on('error',function(err){
        console.log(err);
    })

    regions.on('instance',function(inst) {
        if(!inst.dnsName) {
            console.log('invalid instance name');
            return;
        }
        request
          .get('http://' + inst.dnsName + ':' + config.controlPort + '/log')
          .end(function(res){
              var lines = [];
              csv()
                .from(res.text)
                .on('record',function(data){
                    if(util.isArray(data)) {
                        lines.push(data);
                    }
                })
                .on('end',function(){
                    socket.emit('instance',{
                        id: inst.instanceId,
                        hostname: inst.dnsName +'\t',
                        lines: lines[lines.length-1]
                    });
                });
          });
    });

    regions.eachInstance();
}

function status(socket) {
    var regions = fleet.loadRegions();

    regions.on('instance', function(inst){
        emitStatus(inst, socket);
    });

    regions.eachInstance();
}

function emitStatus(inst, socket) {
    request
      .get('http://' + inst.dnsName + ':' + config.controlPort)
      .end(function(res){
          socket.emit('status',{
              hostname: inst.dnsName,
              res: res.body.siege
          });
      });
}