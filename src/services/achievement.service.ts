import { Service } from "typedi";
import prisma from "../helpers/client";
import { Achievement, Prisma, User } from "@prisma/client";

@Service()
export class AchievementService {
  async findAchievementById(achievementId: string) {
    return prisma.achievement.findFirst({
      where: {
        id: achievementId,
        enabled: true,
      },
    });
  }

  async findCompletedAchievementById(achievementId: string) {
    return prisma.userAchievement.findMany({
      where: {
        achievementId,
      },
    });
  }

  async findUserCompletedAchievementById(
    userAddress: string,
    achievementId: string
  ) {
    return prisma.userAchievement.findMany({
      where: {
        userAddress: {
          equals: userAddress,
          mode: "insensitive",
        },
        achievementId,
      },
    });
  }

  async findCompletedAchievementByIdAfter(achievementId: string, date: Date) {
    return prisma.userAchievement.findMany({
      where: {
        achievementId,
        createTime: {
          gte: date,
        },
      },
    });
  }

  async findUserCompletedAchievementByIdAfter(
    userAddress: string,
    achievementId: string,
    date: Date
  ) {
    return prisma.userAchievement.findMany({
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
  }

  async completeAchievement(walletAddress: string, achievement: Achievement) {
    const now = new Date();
    const nowTimestamp = Math.floor(now.getTime() / 1000);
    return await prisma.$transaction(async (tx) => {
      const updatedUserInfos = await tx.userInfo.updateMany({
        data: {
          points: {
            increment: achievement.points,
          },
          updateTime: now,
          updateTimestamp: nowTimestamp,
        },
        where: {
          userAddress: walletAddress,
        },
      });

      const updatedAchievements = await tx.achievement.updateMany({
        data: {
          latestCompletedTime: now,
          updateTime: now,
        },
        where: {
          id: achievement.id,
          latestCompletedTime: achievement.latestCompletedTime,
        },
      });

      if (updatedUserInfos.count === 0 || updatedAchievements.count === 0) {
        throw new Error(`Please try again.`);
      }

      const completedAchievement = tx.userAchievement.create({
        data: {
          userAddress: walletAddress,
          achievementId: achievement.id,
          pointEarned: achievement.points,
          createTime: now,
          updateTime: now,
        },
      });

      return completedAchievement;
    });
  }

  async isEligibleForAchievement(
    walletAddress: string,
    achievement: Achievement
  ) {
    const repeatPeriod = achievement.repeatPeriod;
    const repeatCount = achievement.redeemLimit;

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

    let completedAchievements = [];

    if (achievement.isGlobal) {
      completedAchievements = await (startDate
        ? this.findCompletedAchievementByIdAfter(achievement.id, startDate)
        : this.findCompletedAchievementById(achievement.id));
    } else {
      completedAchievements = await (startDate
        ? this.findUserCompletedAchievementByIdAfter(
            walletAddress,
            achievement.id,
            startDate
          )
        : this.findUserCompletedAchievementById(walletAddress, achievement.id));
    }

    return completedAchievements.length < repeatCount;
  }
}
