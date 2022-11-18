"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMiddlewares = void 0;
const koa_logger_1 = __importDefault(require("koa-logger"));
const koa_bodyparser_1 = __importDefault(require("koa-bodyparser"));
const constants_1 = require("./constants");
const useMiddlewares = (app) => {
    if ((0, constants_1.isProd)()) {
        app.use((0, koa_logger_1.default)());
    }
    app.use((0, koa_bodyparser_1.default)());
    return app;
};
exports.useMiddlewares = useMiddlewares;
//# sourceMappingURL=koa.middlewares.js.map