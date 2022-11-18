"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProd = exports.CURRENT_ENV = void 0;
const bootstrap_1 = require("../bootstrap");
const development_1 = __importDefault(require("./development"));
const staging_1 = __importDefault(require("./staging"));
const production_1 = __importDefault(require("./production"));
const local_1 = __importDefault(require("./local"));
const envs_1 = require("./envs");
const parsedEnvs = (0, bootstrap_1.bootstrapBefore)();
const getCurrentEnv = () => {
    var _a;
    const env = (_a = process.env) === null || _a === void 0 ? void 0 : _a.NODE_ENV;
    console.log(env);
    if (typeof env === 'undefined') {
        console.warn(`/n> ENV is not set, fallback to ${envs_1.ENVS.DEVELOPMENT}.`);
    }
    const upperCaseEnv = `${env}`.toUpperCase();
    if (upperCaseEnv === envs_1.ENVS.PRODUCTION)
        return envs_1.ENVS.PRODUCTION;
    if (upperCaseEnv === envs_1.ENVS.STAGING)
        return envs_1.ENVS.STAGING;
    if (upperCaseEnv === envs_1.ENVS.LOCAL)
        return envs_1.ENVS.LOCAL;
    return envs_1.ENVS.DEVELOPMENT;
};
const getCurrentConstants = (ident) => {
    var _a;
    let constants = development_1.default;
    const source = ident === envs_1.ENVS.PRODUCTION
        ? production_1.default
        : ident === envs_1.ENVS.STAGING
            ? staging_1.default
            : ident === envs_1.ENVS.LOCAL
                ? local_1.default : development_1.default;
    Object.keys(development_1.default).forEach(key => {
        const sourceValue = source[key];
        const processValue = process.env[key];
        const parsedValue = parsedEnvs[key];
        if (typeof sourceValue !== 'undefined') {
            constants[key] = sourceValue;
        }
        if (typeof processValue !== 'undefined') {
            constants[key] = processValue;
        }
        if (typeof parsedValue !== 'undefined') {
            constants[key] = parsedValue;
        }
    });
    constants.ENV_LABEL = (_a = source.ENV_LABEL) !== null && _a !== void 0 ? _a : "";
    return constants;
};
exports.CURRENT_ENV = getCurrentEnv();
const isProd = () => exports.CURRENT_ENV === envs_1.ENVS.PRODUCTION;
exports.isProd = isProd;
const CONSTANTS = getCurrentConstants(exports.CURRENT_ENV);
exports.default = CONSTANTS;
//# sourceMappingURL=index.js.map