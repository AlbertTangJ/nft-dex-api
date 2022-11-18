"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseStatus = exports.ApiResponse = void 0;
class ApiResponse {
    constructor(code) {
        this.code = code;
    }
    setData(data) {
        this.data = data;
        return this;
    }
    setErrorMessage(msg) {
        this.errorMessage = msg;
        return this;
    }
    toObject() {
        return {
            code: this.code,
            data: this.data,
            errorMessage: this.errorMessage,
        };
    }
}
exports.ApiResponse = ApiResponse;
var ResponseStatus;
(function (ResponseStatus) {
    ResponseStatus[ResponseStatus["Success"] = 0] = "Success";
    ResponseStatus[ResponseStatus["Failure"] = 1] = "Failure";
})(ResponseStatus = exports.ResponseStatus || (exports.ResponseStatus = {}));
//# sourceMappingURL=apiResponse.js.map