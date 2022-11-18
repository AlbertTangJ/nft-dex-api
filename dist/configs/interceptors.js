"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoAssignJSONInterceptor = void 0;
const routing_controllers_1 = require("routing-controllers");
const typedi_1 = require("typedi");
let AutoAssignJSONInterceptor = class AutoAssignJSONInterceptor {
    intercept(action, content) {
        if (typeof content === 'object')
            return JSON.stringify(Object.assign({ message: 'ok' }, content));
        return JSON.stringify({ message: content });
    }
};
AutoAssignJSONInterceptor = __decorate([
    (0, routing_controllers_1.Interceptor)(),
    (0, typedi_1.Service)()
], AutoAssignJSONInterceptor);
exports.AutoAssignJSONInterceptor = AutoAssignJSONInterceptor;
//# sourceMappingURL=interceptors.js.map