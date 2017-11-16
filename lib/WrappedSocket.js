"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var net = require("net");
var WrappedSocket = /** @class */ (function (_super) {
    __extends(WrappedSocket, _super);
    function WrappedSocket(host, port, idleTimeout) {
        var _this = _super.call(this) || this;
        _this.idle = true;
        _this.setTimeout(idleTimeout);
        _this.connect(port, host);
        _this.resourceId = Symbol();
        return _this;
        // events
    }
    WrappedSocket.prototype.getId = function () {
        return this.resourceId;
    };
    WrappedSocket.prototype.isIdle = function () {
        return this.idle;
    };
    WrappedSocket.prototype.toggleIdle = function (idle) {
        this.idle = idle;
    };
    // return socket connection to pool instead of close directly
    WrappedSocket.prototype.release = function () {
        //TODO
    };
    return WrappedSocket;
}(net.Socket));
exports.default = WrappedSocket;
