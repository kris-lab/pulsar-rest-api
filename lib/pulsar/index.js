var PulsarTask = require('./task');
var events = require('events');
var util = require('util');
var _ = require('underscore');

module.exports = (function () {

    /**
     * @param {Object} db
     * @param {Object} config
     * @constructor
     */
    var Pulsar = function (db, config) {
        this.db = db;
        this.config = config || {};

        this.taskQueue = [];

        events.EventEmitter.call(this);
    }

    util.inherits(Pulsar, events.EventEmitter);

    Pulsar.prototype.onCreate = function (task) {
        this.emit("create", task);
    }

    Pulsar.prototype.createTask = function (app, env, action, callback) {
        var self = this;
        var taskId = this.db.getUniqueTaskID();

        var task = new PulsarTask(taskId, app, env, action, this.config);
        this.taskQueue[taskId] = task;

        this.db.saveTask(task, callback);

        this.onCreate(task);

        task.on('change', function () {
            self.db.updateTask(task, function () {
            });
        });

        task.on('close', function () {
            delete self.taskQueue[task.id];
        });

        if (!callback) {
            return task;
        }
    }

    Pulsar.prototype.getTask = function (taskId, callback) {
        if(this.taskQueue[taskId]) {
            callback(null, this.taskQueue[taskId]);
            return;
        }
        this.db.getTask(taskId, function(err, result) {
            if(!result) {
                callback(Error("Cannot find task"), null);
                return;
            }
            var task = new PulsarTask(result.data);
            callback(null, task);
        });
    }

    Pulsar.prototype.getTaskList = function (callback) {
        return this.db.getTaskList(function (err, results) {
            var taskList = _.map(_.values(results), function (task) {
                return task.data
            });
            callback(taskList);
        });
    }

    return Pulsar;

})()
