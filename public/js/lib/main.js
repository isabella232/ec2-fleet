var socket = io.connect('http://localhost')
  , curStatus = false
  , instances = {}
  , statuses = {};

function Instance(data) {
    this.hostname = data.hostname;
    this.logs = ko.observableArray(data.lines);
}

function Status(data) {
    var self = this;
    self.hostname = data.hostname;
    self.res = ko.observable(data.res);
    self.status = ko.computed(function() {
        if(self.res() === true) {
            return 'running';
        } else {
            return 'not running';
        }
    });
}

/**
 * Knockout View model
 * @constructor
 */
function ViewModel() {
    var self = this;
    self.instances = ko.observableArray([]);
    self.status = ko.observableArray([]);
}

var view = new ViewModel();

$(document).ready(function(){
    ko.applyBindings(view);
});

/**
 * Socket Setup
 */
socket.on('instance',function(data){
    if(!(data.hostname in instances)) {
        instances[data.hostname] = new Instance(data);
        view.instances.push(instances[data.hostname]);
    } else {
        instances[data.hostname].logs(data.lines);
    }
});
socket.on('status', function(data) {
    if(data.res.running !== curStatus) {
        socket.emit('logs',{});
    }
    curStatus = data.res.running;
    if(data.hostname in statuses) {
        statuses[data.hostname].res(data.res);
    } else {
        statuses[data.hostname] = new Status(data);
        view.status.push(statuses[data.hostname]);
    }
});



