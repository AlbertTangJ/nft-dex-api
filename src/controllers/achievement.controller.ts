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

type CreateUserInfoBody = {
  userAddress: string;
  username: string;
  nonce: number;
};
@JsonController()
@Service()
export class AchievementController {
  constructor(
    private userService: UserService,
    private achievementService: AchievementService
  ) {}

  async completeAchievement(walletAddress: string, achievementId: string) {
    const user = await this.userService.findByAddress(walletAddress);
    if (!user) {
      return new ApiResponse(ResponseStatus.Failure)
        .setErrorMessage("User not found")
        .toObject();
    }

    const achievement = await this.achievementService.findAchievementById(
      achievementId
    );

    if (!achievement) {
      return new ApiResponse(ResponseStatus.Failure)
        .setErrorMessage("Achievement not found")
        .toObject();
    }

    if (
      !(await this.achievementService.isEligibleForAchievement(
        walletAddress,
        achievement
      ))
    ) {
      return new ApiResponse(ResponseStatus.Failure)
        .setErrorMessage("User is not eligible for this achievement")
        .toObject();
    }

    try {
      await this.achievementService.completeAchievement(
        walletAddress,
        achievement
      );
    } catch (e) {
      return new ApiResponse(ResponseStatus.Failure).toObject();
    }

    return new ApiResponse(ResponseStatus.Success).toObject();
  }
}
