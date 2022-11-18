"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const koa_1 = __importDefault(require("koa"));
const typedi_1 = require("typedi");
const routing_options_1 = require("./routing.options");
const koa_middlewares_1 = require("./koa.middlewares");
const routing_controllers_1 = require("routing-controllers");
const createServer = () => __awaiter(void 0, void 0, void 0, function* () {
    const koa = new koa_1.default();
    (0, koa_middlewares_1.useMiddlewares)(koa);
    (0, routing_controllers_1.useContainer)(typedi_1.Container);
    const app = (0, routing_controllers_1.useKoaServer)(koa, routing_options_1.routingConfigs);
    return app;
});
exports.default = createServer;
//# sourceMappingURL=application.js.map