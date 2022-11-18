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
const utils_1 = require("./configs/utils");
const constants_1 = __importDefault(require("./configs/constants"));
const application_1 = __importDefault(require("./configs/application"));
const bootstrap_1 = require("./configs/bootstrap");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
module.exports = (() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        global.firebaseAdmin = firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(require("./serviceAccountKey.json"))
        });
        const app = yield (0, application_1.default)();
        return app.listen(constants_1.default.PORT, () => {
            utils_1.print.log(`server listening on ${constants_1.default.PORT}, in ${constants_1.default.ENV_LABEL} mode.`);
            (0, bootstrap_1.bootstrapAfter)();
        });
    }
    catch (e) {
        console.log(e);
    }
}))();
//# sourceMappingURL=app.js.map