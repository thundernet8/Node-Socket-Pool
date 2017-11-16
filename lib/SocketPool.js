"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var WrappedSocket_1 = require("./WrappedSocket");
var node_schedule_1 = require("node-schedule");
var ResourceRequest = /** @class */ (function () {
    function ResourceRequest(timeout, cb) {
        var _this = this;
        this.expired = false;
        this.resolved = false;
        this.cb = cb;
        var startTime = new Date(Date.now() + timeout);
        var endTime = new Date(startTime.getTime() + 1000);
        node_schedule_1.default.scheduleJob({ start: startTime, end: endTime, rule: "*/1 * * * *" }, function () {
            _this.expired = true;
            if (!_this.resolved) {
                _this.cb(new Error("Request socket connection failed"));
            }
        });
    }
    ResourceRequest.prototype.isExpired = function () {
        return this.expired;
    };
    ResourceRequest.prototype.resolve = function (resource) {
        this.resolved = true;
        resource.toggleIdle(false);
        this.cb(null, resource);
    };
    return ResourceRequest;
}());
var SocketPool = /** @class */ (function () {
    function SocketPool(options) {
        this.resources = [];
        this.resourceRequestList = [];
        var host = options.host, port = options.port, maxActive = options.maxActive, maxIdle = options.maxIdle, maxIdleTime = options.maxIdleTime, maxWait = options.maxWait;
        this.host = host;
        this.port = port;
        this.maxIdle = maxIdle || 5;
        this.maxIdleTime = maxIdleTime || 5 * 60000; // 最长5min空闲连接
        this.maxActive = Math.max(maxActive || 10, this.maxIdle);
        this.maxWait = maxWait || 3000;
    }
    SocketPool.prototype.createResources = function (count) {
        var _this = this;
        if (count === void 0) { count = 1; }
        var _a = this, maxActive = _a.maxActive, maxIdleTime = _a.maxIdleTime, host = _a.host, port = _a.port, resourceRequestList = _a.resourceRequestList;
        var currentCount = this.getResourceCount();
        if (count + currentCount > maxActive) {
            count = Math.max(maxActive - currentCount, 0);
        }
        var _loop_1 = function (i) {
            var client = new WrappedSocket_1.default(host, port, maxIdleTime);
            client.on("connect", function () {
                console.log("Socket server connectted, remote address is: %s %s", host, port);
                _this.resources.push(client);
            });
            client.on("timeout", function () {
                client.toggleIdle(true);
                if (resourceRequestList.length > 0) {
                    var req = resourceRequestList.shift();
                    req.resolve(client);
                }
            });
            client.on("close", function () {
                console.log("Socket server closed");
            });
            client.on("error", function (err) {
                console.error("Socket error:", err);
                _this.removeResource(client.getId());
            });
        };
        for (var i = 0; i < count; i++) {
            _loop_1(i);
        }
    };
    SocketPool.prototype.removeResource = function (id) {
        var resources = this.resources;
        var newResources = resources.filter(function (res) { return res.getId() !== id; });
        this.resources = newResources;
    };
    SocketPool.prototype.getResource = function () {
        var _this = this;
        var resourceCount = this.getResourceCount();
        var _a = this, resources = _a.resources, maxWait = _a.maxWait;
        return new Promise(function (resolve, reject) {
            if (resourceCount > 0) {
                for (var i = 0; i < resourceCount; i++) {
                    var res = resources[i];
                    if (res.isIdle()) {
                        res.toggleIdle(false);
                        return resolve(res);
                    }
                }
            }
            else {
                if (resources.length < _this.maxActive) {
                    _this.createResources();
                }
                _this.resourceRequestList.push(new ResourceRequest(maxWait, function (err, resource) {
                    if (err || !resource) {
                        return reject(err);
                    }
                    else {
                        return resolve(resource);
                    }
                }));
            }
        });
    };
    SocketPool.prototype.getResourceCount = function () {
        var resources = this.resources;
        var validResources = resources.filter(function (res) { return !res.destroyed; });
        this.resources = validResources;
        return validResources.length;
    };
    SocketPool.prototype.returnResource = function (res) {
        if (!res.destroyed) {
            res.toggleIdle(true);
        }
        else {
            var resources = this.resources;
            this.resources = resources.filter(function (item) { return item.getId() !== res.getId(); });
        }
    };
    return SocketPool;
}());
exports.default = SocketPool;
