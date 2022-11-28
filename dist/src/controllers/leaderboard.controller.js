"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
exports.LeaderBoardController = void 0;
const routing_controllers_1 = require("routing-controllers");
const leaderboard_service_1 = require("../services/leaderboard.service");
const typedi_1 = require("typedi");
const apiResponse_1 = require("src/helpers/apiResponse");
let LeaderBoardController = class LeaderBoardController {
    constructor(leaderBoardService) {
        this.leaderBoardService = leaderBoardService;
    }
    // https://campaign-api.tribe3.xyz/v1/fetch/leaderboard/list/1/30/2
    leaderBoardList(page, size, round) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.leaderBoardService.leaderBoardList(page, size, round);
            if (result != null) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure);
        });
    }
    userRanking(userAddress, round) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.leaderBoardService.fetchRangingByUser(userAddress, round);
            if (result != null) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure);
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)("/fetch/leaderboard/list/:page/:size/:round"),
    __param(0, (0, routing_controllers_1.Param)("page")),
    __param(1, (0, routing_controllers_1.Param)("size")),
    __param(2, (0, routing_controllers_1.Param)("round")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Number]),
    __metadata("design:returntype", Promise)
], LeaderBoardController.prototype, "leaderBoardList", null);
__decorate([
    (0, routing_controllers_1.Get)("/fetch/user/ranking/:userAddress/:round"),
    __param(0, (0, routing_controllers_1.Param)("userAddress")),
    __param(1, (0, routing_controllers_1.Param)("round")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], LeaderBoardController.prototype, "userRanking", null);
LeaderBoardController = __decorate([
    (0, routing_controllers_1.JsonController)(),
    (0, typedi_1.Service)(),
    __metadata("design:paramtypes", [leaderboard_service_1.LeaderBoardService])
], LeaderBoardController);
exports.LeaderBoardController = LeaderBoardController;
//# sourceMappingURL=leaderboard.controller.js.map