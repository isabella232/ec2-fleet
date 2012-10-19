var util = require('util')
  , config = require('../config/aws-config.json')
  , aws2js = require('aws2js')
  , async = require('async')
  , request = require('superagent')
  , EventEmitter = require('events').EventEmitter;

exports.loadRegions = function() {
    return new Regions();
}

function Regions() {
    EventEmitter.call(this);
    this.clients = [];
}

util.inherits(Regions, EventEmitter);

exports.Regions = Regions;

/**
 * Initialize all regions
 * Each region requires a separate client
 */
Regions.prototype.init = function() {
    var source = this;
    async.forEach(config.regions, function(region, cb){
        try {
            source.clients.push(new Client(region));
            cb(null);
        } catch(err) {
            cb(err);
        }
    }, function(err){
        if(err) source.error(err);
    });
}

/**
 * Asyncronously get all instances from all regions
 * Emits an instance event
 * @param cb
 */
Regions.prototype.eachInstance = function() {
    var source = this;
    if(source.clients.length === 0) {
        source.init();
    }
    async.forEach(this.clients, function(client, acb){
        client.getInstances(function(err, instance){
            if(typeof instance !== 'undefined') {
                source.emit('instance', instance);
            } else {
                console.log(err);
            }
            acb(err);
        });
    }, function(err){
        if(err) {
            source.error(err);
        }
    });
}

Regions.prototype.error = function(err) {
    if(this.listeners('error').length !== 0) {
        this.emit('error',err);
    } else {
        console.log(err);
    }
}

function Client(region) {
    EventEmitter.call(this);
    this.region = region;
    this.client;
    this.instances = [];
    this.init();
}

util.inherits(Client, EventEmitter);

exports.Client = Client;

Client.prototype.init = function(region) {
    if(this.client) {
        return this.client;
    }

    var client = this.client = aws2js.load('ec2');
    client.region = region || config.regions[0] || "us-east-1";

    this.setRegion();
    this.setCredentials();
}

Client.prototype.getInstances = function(cb) {
    var source = this;
    source.client.request("DescribeInstances", function(err, res) {
        if (err) {
            console.log('describe instances 94');
            return cb(err);
        }
        res = source.normalizeResponse(res);

        async.forEach(res.reservationSet, function(reservation, acb){
            async.forEach(reservation.instancesSet, function(instance, acb){
                source.isValidInstance(instance, cb);
                acb(null);
            }, function(err) {
                acb(err);
            });
        },function(err){
            if(err) {
                console.log('108');
                source.emit('error', err);
            }
        });
    });
}

Client.prototype.normalizeResponse = function(obj, key) { // Handles quirks of xml-to-js transformation ('item', empty objects)
    if (typeof obj == 'object') {
        var keys = Object.keys(obj);
        if (keys.length === 0) {
            if (key && (key.slice(-3) === "Set" || key.slice(-1) === "s")) // Heuristic to determine empty arrays from empty strings.
                return [];
            return "";
        }
        if (keys.length === 1 && keys[0] === 'item') {
            if (!Array.isArray(obj.item)) obj.item = [obj.item];
            return this.normalizeResponse(obj.item);
        }
        for (var i = 0; i < keys.length; i++)
            obj[keys[i]] = this.normalizeResponse(obj[keys[i]], keys[i]);
    }
    return obj;
}

Client.prototype.validateKeys = function() {
    if(typeof config.accessKeyId !== 'string' || config.accessKeyId.length !== 20 ||
       typeof config.accessKeySecret !== 'string' || config.accessKeySecret.length !== 40) {
        throw new Error("Please provide AWS Access Keys in 'aws-config.json' file.");
    }
}

/**
 * Validates instance
 * @param instance
 */
Client.prototype.isValidInstance = function(instance, cb) {
    var tags = {}
      , goodStates = ["pending", "running", "shutting-down"];
    // Check instance is in good state.
    // Possible instance states: pending | running | shutting-down | terminated | stopping | stopped
    if (goodStates.indexOf(instance.instanceState.name) < 0) {
        return;
    }

    // Check instance tags. All tags given in config must be the same.
    if(config.instanceTags && Array.isArray(instance.tagSet)) {
        instance.tagSet.forEach(function(item) {tags[item.key] = item.value;});
        for (var key in config.instanceTags) {
            if (config.instanceTags[key] !== tags[key]) {
                return;
            }
        }
    }
    cb(null, instance);
}

Client.prototype.setRegion = function() {
    if(!(this.region in config.regionInstances)) {
        throw new Error("Unknown AWS region: "+ this.region + ". Must be one of: " + Object.keys(config.regionInstances));
    }
    this.client.setRegion(this.region);
}

Client.prototype.setCredentials = function() {
    this.validateKeys();
    this.client.setCredentials(config.accessKeyId, config.accessKeySecret);
}

function Status() {
    EventEmitter.call(this);
}

util.inherits(Status, EventEmitter);

exports.Status = Status;