import {
  JsonController,
  Get,
  QueryParam,
  Post,
  BodyParam,
  Authorized,
  Param,
  Body,
} from "routing-controllers";
import { AchievementService, UserService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { RepeatPeriod } from "@prisma/client";

@JsonController()
@Service()
export class AchievementController {
  constructor(
    private userService: UserService,
    private achievementService: AchievementService
  ) {}

  @Get("/achievement/referral/list")
  async referralAchievements(@QueryParam("userAddress") userAddress: string) {
    let result = await this.achievementService.getReferralAchievements(
      userAddress,
      100
    );

    let responseData = result.map((item) => {
      let obj: any = {
        userId:
          item.referralUser?.userInfo?.username?.length > 0
            ? item.referralUser.userInfo.username
            : item.referralUser.userInfo.userAddress,
        pointGained: item.pointEarned,
        status: item.achievement.title,
        createTime: item.createTime,
      };
      return obj;
    });

    return new ApiResponse(ResponseStatus.Success)
      .setData(responseData)
      .toObject();
  }

  @Get("/achievement/task/list")
  async taskList(@QueryParam("userAddress", { required: true }) userAddress: string) {
    let weeklyTasks = [];
    let promotionTasks = [];
    let oneTimeTasks = [];
    let achievementList = await this.achievementService.getUserAchievementList(userAddress);
    for (let achievement of achievementList) {
      if (achievement.code.startsWith("E")) {
        promotionTasks.push(achievement);
      } else if (achievement.repeatPeriod === RepeatPeriod.Weekly) {
        weeklyTasks.push(achievement);
      } else {
        oneTimeTasks.push(achievement);
      }
    }

    return new ApiResponse(ResponseStatus.Success)
      .setData({
        weeklyTasks,
        promotionTasks,
        oneTimeTasks
      })
      .toObject();
  }
}
