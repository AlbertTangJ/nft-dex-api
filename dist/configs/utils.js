"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.print = exports.dictToArray = void 0;
const dictToArray = (dict) => Object.keys(dict).map(name => dict[name]);
exports.dictToArray = dictToArray;
exports.print = {
    log: (text) => console.log('\x1b[37m%s \x1b[2m%s\x1b[0m', '>', text),
    danger: (text) => console.log('\x1b[31m%s \x1b[31m%s\x1b[0m', '>', text),
    tip: (text) => console.log('\x1b[36m%s \x1b[36m%s\x1b[0m', '>', text),
};
//# sourceMappingURL=utils.js.map