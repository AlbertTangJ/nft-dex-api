"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBN = void 0;
const ethers_1 = require("ethers");
function toBN(decimal) {
    return ethers_1.BigNumber.from(decimal.toString());
}
exports.toBN = toBN;
//# sourceMappingURL=decimalHelper.js.map