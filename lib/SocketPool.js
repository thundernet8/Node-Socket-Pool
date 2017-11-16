"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var WrappedSocket_1 = require("./WrappedSocket");
var Utils_1 = require("./Utils");
var schedule = require("node-schedule");
var ResourceRequest = /** @class */ (function () {
    function ResourceRequest(timeout, cb) {
        var _this = this;
        this.expired = false;
        this.resolved = false;
        this.cb = cb;
        var startTime = new Date(Date.now() + timeout);
        var endTime = new Date(startTime.getTime() + 1000);
        schedule.scheduleJob({ start: startTime, end: endTime, rule: "*/1 * * * *" }, function () {
            _this.expired = true;
            if (!_this.resolved) {
                Utils_1.TimeLogger("Acquire socket connection failed as waiting for more than %s milliseconds", timeout);
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
        this.createResources(maxIdle);
    }
    SocketPool.prototype.createResources = function (count) {
        if (count === void 0) { count = 1; }
        var _a = this, maxActive = _a.maxActive, maxIdleTime = _a.maxIdleTime, host = _a.host, port = _a.port;
        var currentCount = this.getResourceCount();
        if (count + currentCount > maxActive) {
            count = Math.max(maxActive - currentCount, 0);
        }
        for (var i = 0; i < count; i++) {
            Utils_1.TimeLogger("Creating socket connection");
            var client = new WrappedSocket_1.default(host, port, maxIdleTime, this.returnResource.bind(this));
            this.resources.push(client);
            this.registerResourceEvents(client);
        }
    };
    SocketPool.prototype.removeResource = function (id) {
        var resources = this.resources;
        var resource = resources.find(function (res) { return res.getId() === id; });
        if (resource) {
            resource.removeAllListeners();
        }
        var newResources = resources.filter(function (res) { return res.getId() !== id; });
        this.resources = newResources;
    };
    SocketPool.prototype.notifyResourceAvailable = function (res) {
        var _a = this, resourceRequestList = _a.resourceRequestList, resources = _a.resources, maxIdle = _a.maxIdle;
        res.toggleIdle(true);
        if (resourceRequestList.length > 0) {
            var req = resourceRequestList.shift();
            req.resolve(res);
        }
        else {
            // 如果超过最大闲置数量，释放
            if (resources.length > maxIdle) {
                Utils_1.TimeLogger("Close redundant connection resource");
                this.removeResource(res.getId());
                res.destroy();
            }
        }
    };
    SocketPool.prototype.registerResourceEvents = function (res) {
        var _this = this;
        var _a = this, host = _a.host, port = _a.port;
        res.on("connect", function () {
            Utils_1.TimeLogger("Socket server connectted, remote address is: %s:%s", host, port);
            _this.notifyResourceAvailable(res);
        });
        res.on("timeout", function () {
            Utils_1.TimeLogger("Socket connection resource return back to idle pool as no data sending for a time up to timeout");
            _this.notifyResourceAvailable(res);
        });
        res.on("close", function () {
            Utils_1.TimeLogger("Socket server closed");
        });
        res.on("error", function (err) {
            Utils_1.TimeLogger("Socket error:", err);
            _this.removeResource(res.getId());
        });
    };
    SocketPool.prototype.getResource = function () {
        var _this = this;
        var _a = this, resources = _a.resources, maxWait = _a.maxWait;
        var idleResources = resources.filter(function (res) { return res.isIdle() && !res.destroyed && !res.connecting; });
        return new Promise(function (resolve, reject) {
            if (idleResources.length > 0) {
                var i = Math.floor(Math.random() * idleResources.length);
                var res = idleResources[i];
                res.toggleIdle(false);
                return resolve(res);
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
        // 移除应用中对WrappedSocket注册的各种监听事件，防止内存泄露
        res.removeAllListeners();
        if (!res.destroyed) {
            // 重新注册必要的生命周期监听事件
            this.registerResourceEvents(res);
            res.toggleIdle(true);
        }
        else {
            this.removeResource(res.getId());
        }
    };
    return SocketPool;
}());
exports.default = SocketPool;
