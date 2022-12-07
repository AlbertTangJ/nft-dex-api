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
    return new ApiResponse(ResponseStatus.Success).setData(result).toObject();
  }
}
