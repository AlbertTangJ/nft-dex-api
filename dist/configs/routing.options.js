"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
exports.routingConfigs = void 0;
const controllers = __importStar(require("../src/controllers"));
const middlewares = __importStar(require("./routing.middlewares"));
const interceptors = __importStar(require("./interceptors"));
const utils_1 = require("./utils");
const apiResponse_1 = require("src/helpers/apiResponse");
exports.routingConfigs = {
    controllers: (0, utils_1.dictToArray)(controllers),
    middlewares: (0, utils_1.dictToArray)(middlewares),
    interceptors: (0, utils_1.dictToArray)(interceptors),
    routePrefix: '/apis',
    validation: true,
    authorizationChecker: (action, roles) => __awaiter(void 0, void 0, void 0, function* () {
        for (let i = 0; i < roles.length; i++) {
            const role = roles[i];
            if (role == 'auth-token') {
                let checkMessage = "";
                let checkTokenResult = true;
                const token = action.request.headers['auth-token'];
                const userAddress = action.request.body.userAddress.toLowerCase();
                try {
                    let decodedToken = yield global.firebaseAdmin
                        .auth()
                        .verifyIdToken(token);
                    console.log(decodedToken);
                    console.log(userAddress);
                    if (decodedToken.uid != userAddress) {
                        checkTokenResult = false;
                        checkMessage = `Failed token is not right`;
                    }
                }
                catch (error) {
                    checkMessage = error.message;
                    checkTokenResult = false;
                }
                let checkResult = { result: checkTokenResult, message: checkMessage };
                if (!checkResult.result) {
                    throw new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure).setErrorMessage(checkResult.message);
                }
            }
        }
        return true;
    }),
};
//# sourceMappingURL=routing.options.js.map