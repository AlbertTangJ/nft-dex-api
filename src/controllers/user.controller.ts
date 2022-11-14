import {
  JsonController,
  Get,
  QueryParam,
} from "routing-controllers";
import { UserService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";

@JsonController()
@Service()
export class UserController {
  constructor(private userService: UserService) {}

  @Get("/user/find")
  async getUserByAddress(@QueryParam("address") address: string) {
    if (!address) {
      return new ApiResponse(ResponseStatus.Failure)
        .setErrorMessage("Missing parameters")
        .toObject();
    }
    const user = await this.userService.findByAddress(address);

    if (!user) {
      return new ApiResponse(ResponseStatus.Failure)
        .setErrorMessage("User not found")
        .toObject();
    } else {
      return new ApiResponse(ResponseStatus.Success).setData(user).toObject();
    }
  }
}
