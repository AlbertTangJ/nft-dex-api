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

  
}
