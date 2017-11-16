"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require("moment");
var isDev = process.env.NODE_ENV !== "production";
function TimeLogger(template) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (isDev) {
        console.log.apply(console, ["[" + moment().format("YYYY-MM-DD HH:mm:ss") + "] " + template].concat(args));
    }
}
exports.TimeLogger = TimeLogger;
