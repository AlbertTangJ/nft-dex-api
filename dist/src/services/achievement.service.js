"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
exports.AchievementService = void 0;
const typedi_1 = require("typedi");
const client_1 = __importDefault(require("../helpers/client"));
let AchievementService = class AchievementService {
    findAchievementById(achievementId) {
        return __awaiter(this, void 0, void 0, function* () {
            return client_1.default.achievement.findFirst({
                where: {
                    id: achievementId,
                    enabled: true,
                },
            });
        });
    }
    findCompletedAchievementById(achievementId) {
        return __awaiter(this, void 0, void 0, function* () {
            return client_1.default.userAchievement.findMany({
                where: {
                    achievementId,
                },
            });
        });
    }
    findUserCompletedAchievementById(userAddress, achievementId) {
        return __awaiter(this, void 0, void 0, function* () {
            return client_1.default.userAchievement.findMany({
                where: {
                    userAddress: {
                        equals: userAddress,
                        mode: "insensitive",
                    },
                    achievementId,
                },
            });
        });
    }
    findCompletedAchievementByIdAfter(achievementId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return client_1.default.userAchievement.findMany({
                where: {
                    achievementId,
                    createTime: {
                        gte: date,
                    },
                },
            });
        });
    }
    findUserCompletedAchievementByIdAfter(userAddress, achievementId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return client_1.default.userAchievement.findMany({
                where: {
                    userAddress: {
                        equals: userAddress,
                        mode: "insensitive",
                    },
                    achievementId,
                    createTime: {
                        gte: date,
                    },
                },
            });
        });
    }
    completeAchievement(walletAddress, achievement) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            // const nowTimestamp = Math.floor(now.getTime() / 1000);
            // return await prisma.$transaction(async (tx) => {
            //   const updatedUserInfos = await tx.userInfo.updateMany({
            //     data: {
            //       points: {
            //         increment: achievement.points,
            //       },
            //       updateTime: now,
            //       updateTimestamp: nowTimestamp,
            //     },
            //     where: {
            //       userAddress: walletAddress,
            //     },
            //   });
            //   const updatedAchievements = await tx.achievement.updateMany({
            //     data: {
            //       latestCompletedTime: now,
            //       updateTime: now,
            //     },
            //     where: {
            //       id: achievement.id,
            //       latestCompletedTime: achievement.latestCompletedTime,
            //     },
            //   });
            //   if (updatedUserInfos.count === 0 || updatedAchievements.count === 0) {
            //     throw new Error(`Please try again.`);
            //   }
            //   const completedAchievement = tx.userAchievement.create({
            //     data: {
            //       userAddress: walletAddress,
            //       achievementId: achievement.id,
            //       pointEarned: achievement.points,
            //       createTime: now,
            //       updateTime: now,
            //     },
            //   });
            //   return completedAchievement;
            // });
        });
    }
    isEligibleForAchievement(walletAddress, achievement) {
        return __awaiter(this, void 0, void 0, function* () {
            const repeatPeriod = achievement.repeatPeriod;
            const repeatCount = achievement.redeemLimit;
            let startDate;
            switch (repeatPeriod) {
                case "None":
                    startDate = null;
                    break;
                case "Daily":
                    startDate = new Date();
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case "Weekly":
                    startDate = new Date();
                    startDate.setDate(startDate.getDate() - startDate.getDay());
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case "Monthly":
                    startDate = new Date();
                    startDate.setDate(1);
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case "Yearly":
                    startDate = new Date();
                    startDate.setMonth(0);
                    startDate.setDate(1);
                    startDate.setHours(0, 0, 0, 0);
                    break;
                default:
                    break;
            }
            let completedAchievements = [];
            if (achievement.isGlobal) {
                completedAchievements = yield (startDate
                    ? this.findCompletedAchievementByIdAfter(achievement.id, startDate)
                    : this.findCompletedAchievementById(achievement.id));
            }
            else {
                completedAchievements = yield (startDate
                    ? this.findUserCompletedAchievementByIdAfter(walletAddress, achievement.id, startDate)
                    : this.findUserCompletedAchievementById(walletAddress, achievement.id));
            }
            return completedAchievements.length < repeatCount;
        });
    }
};
AchievementService = __decorate([
    (0, typedi_1.Service)()
], AchievementService);
exports.AchievementService = AchievementService;
//# sourceMappingURL=achievement.service.js.map