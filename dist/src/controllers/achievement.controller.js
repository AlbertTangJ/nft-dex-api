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
exports.AchievementController = void 0;
const routing_controllers_1 = require("routing-controllers");
const services_1 = require("../services");
const typedi_1 = require("typedi");
const apiResponse_1 = require("src/helpers/apiResponse");
let AchievementController = class AchievementController {
    constructor(userService, achievementService) {
        this.userService = userService;
        this.achievementService = achievementService;
    }
    completeAchievement(walletAddress, achievementId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userService.findByAddress(walletAddress);
            if (!user) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure)
                    .setErrorMessage("User not found")
                    .toObject();
            }
            const achievement = yield this.achievementService.findAchievementById(achievementId);
            if (!achievement) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure)
                    .setErrorMessage("Achievement not found")
                    .toObject();
            }
            if (!(yield this.achievementService.isEligibleForAchievement(walletAddress, achievement))) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure)
                    .setErrorMessage("User is not eligible for this achievement")
                    .toObject();
            }
            try {
                yield this.achievementService.completeAchievement(walletAddress, achievement);
            }
            catch (e) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure).toObject();
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).toObject();
        });
    }
};
AchievementController = __decorate([
    (0, routing_controllers_1.JsonController)(),
    (0, typedi_1.Service)(),
    __metadata("design:paramtypes", [services_1.UserService,
        services_1.AchievementService])
], AchievementController);
exports.AchievementController = AchievementController;
//# sourceMappingURL=achievement.controller.js.map