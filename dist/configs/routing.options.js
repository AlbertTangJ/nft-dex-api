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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routingConfigs = void 0;
const controllers = __importStar(require("../src/controllers"));
const middlewares = __importStar(require("./routing.middlewares"));
const interceptors = __importStar(require("./interceptors"));
const utils_1 = require("./utils");
const async_1 = __importDefault(require("async"));
const apiResponse_1 = require("src/helpers/apiResponse");
exports.routingConfigs = {
    controllers: (0, utils_1.dictToArray)(controllers),
    middlewares: (0, utils_1.dictToArray)(middlewares),
    interceptors: (0, utils_1.dictToArray)(interceptors),
    routePrefix: '/apis',
    validation: true,
    authorizationChecker: (action, roles) => __awaiter(void 0, void 0, void 0, function* () {
        let tasks = [];
        for (let i = 0; i < roles.length; i++) {
            const role = roles[i];
            if (role == 'auth-token') {
                let checkMessage = "";
                let checkTokenResult = true;
                let checkAuthToken = function (callback) {
                    const token = action.request.headers['auth-token'];
                    console.log(token);
                    const userAddress = action.request.body.userAddress;
                    try {
                        let decodedToken = global.firebaseAdmin
                            .auth()
                            .verifyIdToken(token);
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
                    callback(null, checkResult);
                };
                tasks.push(checkAuthToken);
            }
            if (role == 'username') {
                let checkUserName = function (callback) {
                    let username = action.request.body.username;
                    let checkMessage = "";
                    let checkUserNameResult = false;
                    if (username == "" || username == null) {
                        checkUserNameResult = true;
                    }
                    else {
                        var patten = /^[a-zA-Z0-9_]{5,10}$/;
                        let result = patten.test(username);
                        if (!result) {
                            checkUserNameResult = false;
                            checkMessage = "username must be 5-10 characters";
                        }
                        else {
                            checkUserNameResult = true;
                        }
                    }
                    let checkResult = { result: checkUserNameResult, message: checkMessage };
                    callback(null, checkResult);
                };
                tasks.push(checkUserName);
            }
            if (role == 'about') {
                let checkAbout = function (callback) {
                    const about = action.request.body.about;
                    let checkAboutResult = false;
                    let checkMessage = "";
                    if (about == "" || about == null) {
                        checkAboutResult = true;
                    }
                    else {
                        if (about.length >= 0 && about.length <= 200) {
                            checkAboutResult = true;
                        }
                    }
                    let checkResult = { result: checkAboutResult, message: checkMessage };
                    callback(null, checkResult);
                };
                tasks.push(checkAbout);
            }
        }
        let result = true;
        async_1.default.parallel(tasks, function (error, results) {
            console.log(results);
            for (let i = 0; i < results.length; i++) {
                let check = results[i];
                if (!check.result) {
                    result = check.result;
                    // let error: Error = new Error();
                    // error.message = check.message;
                    // error.stack = '';
                    throw new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure).setErrorMessage(check.message);
                }
            }
        });
        return result;
    }),
};
//# sourceMappingURL=routing.options.js.map