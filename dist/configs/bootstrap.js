"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapAfter = exports.bootstrapBefore = void 0;
const utils_1 = require("./utils");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
// "before" will trigger before the app lift.
const bootstrapBefore = () => {
    // const result = dotenv.config({ path: join(__dirname, "../.env") });
    // 先构造出.env*文件的绝对路径
    const appDirectory = fs_1.default.realpathSync(process.cwd());
    const resolveApp = (relativePath) => path_1.default.resolve(appDirectory, relativePath);
    const pathsDotenv = resolveApp(".env");
    // 按优先级由高到低的顺序加载.env文件
    const run_env = process.env.NODE_ENV;
    if (run_env == 'LOCAL') {
        var result = dotenv_1.default.config({ path: `${pathsDotenv}.local` }); // 加载.env.local    
    }
    else if (run_env == 'DEVELOPMENT') {
        var result = dotenv_1.default.config({ path: `${pathsDotenv}.development` }); // 加载.env.development    
    }
    else if (run_env == 'PRODUCTION') {
        var result = dotenv_1.default.config({ path: `${pathsDotenv}.campaign` });
    }
    else {
        var result = dotenv_1.default.config({ path: `${pathsDotenv}` }); // 加载.env
    }
    if (result.error) {
        utils_1.print.danger('Environment variable not loaded: not found ".env" file.');
        return {};
    }
    // solve ncc path link.
    client_1.Prisma.Decimal.set({ rounding: client_1.Prisma.Decimal.ROUND_FLOOR, toExpPos: 1000, toExpNeg: -1000 });
    utils_1.print.log(".env loaded.");
    return result.parsed;
};
exports.bootstrapBefore = bootstrapBefore;
// "after" will trigger after the "container" mounted..
const bootstrapAfter = () => { };
exports.bootstrapAfter = bootstrapAfter;
//# sourceMappingURL=bootstrap.js.map