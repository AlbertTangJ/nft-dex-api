"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeaderMiddleware = void 0;
const routing_controllers_1 = require("routing-controllers");
const typedi_1 = require("typedi");
let HeaderMiddleware = class HeaderMiddleware {
    use(context, next) {
        return __awaiter(this, void 0, void 0, function* () {
            context.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,DELETE,PATCH');
            context.set('Access-Control-Allow-Origin', context.request.header.origin || context.request.origin);
            context.set('Access-Control-Allow-Headers', ['content-type']);
            context.set('Access-Control-Allow-Credentials', 'true');
            context.set('Content-Type', 'application/json; charset=utf-8');
            return next();
        });
    }
};
HeaderMiddleware = __decorate([
    (0, routing_controllers_1.Middleware)({ type: 'before' }),
    (0, typedi_1.Service)()
], HeaderMiddleware);
exports.HeaderMiddleware = HeaderMiddleware;
//# sourceMappingURL=routing.middlewares.js.map