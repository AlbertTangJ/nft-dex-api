import { Service } from "typedi";
import prisma from "../helpers/client";
import { Achievement, Prisma, User } from "@prisma/client";
import { UserService } from "./user.service";
import { select } from "async";

@Service()
export class AchievementService {
  constructor(private userService: UserService) {}

  async findAchievementByCode(achievementCode: string) {
    return prisma.achievement.findFirst({
      where: {
        code: achievementCode,
        enabled: true
      }
    });
  }

  async findUserAchievementByCodeAndReferredUser(achievementCode: string, userAddress: string) {
    return prisma.userAchievement.findFirst({
      where: {
        referralUserAddress: userAddress.toLocaleLowerCase(),
        achievement: {
          code: achievementCode
        }
      }
    });
  }

  async findCompletedAchievementById(achievementId: string) {
    return prisma.userAchievement.findMany({
      where: {
        achievementId
      }
    });
  }

  async findUserCompletedAchievementById(userAddress: string, achievementId: string) {
    return prisma.userAchievement.findMany({
      where: {
        userAddress: {
          equals: userAddress,
          mode: "insensitive"
        },
        achievementId
      }
    });
  }

  async findCompletedAchievementByTxHash(achievementId: string, txHash: string) {
    return prisma.userAchievement.findMany({
      where: {
        achievementId,
        txHash
      }
    });
  }

  async findCompletedAchievementByIdAfter(achievementId: string, date: Date) {
    return prisma.userAchievement.findMany({
      where: {
        achievementId,
        createTime: {
          gte: date
        }
      }
    });
  }

  async findUserCompletedAchievementByIdAfter(userAddress: string, achievementId: string, date: Date) {
    return prisma.userAchievement.findMany({
      where: {
        userAddress: {
          equals: userAddress,
          mode: "insensitive"
        },
        achievementId,
        createTime: {
          gte: date
        }
      }
    });
  }

  async getReferralAchievements(userAddress: string, limit: number) {
    return prisma.userAchievement.findMany({
      take: limit,
      where: {
        userAddress: userAddress.toLowerCase(),
        hidden: false,
        achievement: {
          referralRelated: true
        }
      },
      select: {
        pointEarned: true,
        createTime: true,
        achievement: {
          select: {
            title: true
          }
        },
        referralUser: {
          select: {
            userInfo: {
              select: {
                username: true,
                userAddress: true
              }
            }
          }
        }
      },
      orderBy: {
        createTime: "desc"
      }
    });
  }

  async hideReferralAchievements(achievementCode: string, userAddress: string, referralUserAddress: string) {
    return prisma.userAchievement.updateMany({
      data: { hidden: true },
      where: {
        userAddress: userAddress.toLowerCase(),
        referralUserAddress: referralUserAddress.toLowerCase(),
        achievement: {
          code: achievementCode
        }
      }
    });
  }

  private async completeAchievementInternal(
    walletAddress: string,
    achievement: Achievement,
    referralUserAddress?: string,
    txHash?: string
  ) {
    const now = new Date();
    const nowTimestamp = Math.floor(now.getTime() / 1000);
    return await prisma.$transaction(async tx => {
      const updatedUserInfos = await tx.userInfo.updateMany({
        data: {
          points: {
            increment: achievement.referralRelated ? 0 : achievement.points
          },
          referralPoints: {
            increment: achievement.referralRelated ? achievement.points : 0
          },
          updateTime: now,
          updateTimestamp: nowTimestamp
        },
        where: {
          userAddress: walletAddress.toLowerCase()
        }
      });

      const updatedAchievements = await tx.achievement.updateMany({
        data: {
          latestCompletedTime: now,
          updateTime: now
        },
        where: {
          id: achievement.id,
          latestCompletedTime: achievement.latestCompletedTime
        }
      });

      if (updatedUserInfos.count === 0 || updatedAchievements.count === 0) {
        throw new Error(`Please try again.`);
      }

      const completedAchievement = tx.userAchievement.create({
        data: {
          userAddress: walletAddress.toLowerCase(),
          achievementId: achievement.id,
          pointEarned: achievement.points,
          createTime: now,
          updateTime: now,
          referralUserAddress: referralUserAddress ? referralUserAddress.toLowerCase() : null,
          txHash
        }
      });

      return completedAchievement;
    });
  }

  async isEligibleForAchievement(walletAddress: string, achievement: Achievement, txHash?: string) {
    const repeatPeriod = achievement.repeatPeriod;
    const repeatCount = achievement.redeemLimit;

    if (repeatCount === 0) return true; // No limit

    let startDate: Date;

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

    if (txHash) {
      let completedAchievementWithTxHash = await this.findCompletedAchievementByTxHash(achievement.id, txHash);
      if (completedAchievementWithTxHash.length > 0) return false;
    }

    let completedAchievements = [];

    if (achievement.isGlobal) {
      completedAchievements = await (startDate
        ? this.findCompletedAchievementByIdAfter(achievement.id, startDate)
        : this.findCompletedAchievementById(achievement.id));
    } else {
      completedAchievements = await (startDate
        ? this.findUserCompletedAchievementByIdAfter(walletAddress, achievement.id, startDate)
        : this.findUserCompletedAchievementById(walletAddress, achievement.id));
    }

    return completedAchievements.length < repeatCount;
  }

  async completeAchievement(walletAddress: string, achievementCode: string, referralUserAddress?: string, txHash?: string) {
    const user = await this.userService.findByAddress(walletAddress);
    if (!user) {
      throw new Error(`User not found.`);
    }

    const achievement = await this.findAchievementByCode(achievementCode);

    if (!achievement) {
      throw new Error(`Achievement not found.`);
    }

    if (!(await this.isEligibleForAchievement(walletAddress, achievement, txHash))) {
      throw new Error(`Not eligible for this achievement.`);
    }

    await this.completeAchievementInternal(walletAddress, achievement, referralUserAddress, txHash);
  }
}
