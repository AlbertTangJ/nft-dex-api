import {
  JsonController,
  Get,
  QueryParam,
  Post,
  BodyParam,
  Authorized,
  Param,
  Body,
  Res,
  Req,
} from "routing-controllers";
import { UserService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { Client, auth } from "twitter-api-sdk";

type CreateUserInfoBody = {
  userAddress: string,
  username: string,
  nonce: number
}

@JsonController()
@Service()
export class UserController {
  constructor(private userService: UserService) {}

  @Get("/users/find")
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



  checkUserName(username: string) {
    let checkMessage = ""
    let checkUserNameResult = false
    if (username == "" || username == null) {
      checkUserNameResult = true;
    } else {
      var patten = /^[a-zA-Z0-9_]{3,30}$/;
      let result = patten.test(username);
      if (!result) {
        checkUserNameResult = false;
        checkMessage = "username must be 5-10 characters"
      } else {
        checkUserNameResult = true
      }
    }
    let check = { result: checkUserNameResult, message: checkMessage };
    if (!check.result) {
      throw new ApiResponse(ResponseStatus.UsernameWrong).setErrorMessage(check.message);
    }
  }

  checkAbout(about: string) {
    let checkAboutResult = false
    let checkMessage = ""
    if (about == "" || about == null) {
      checkAboutResult = true;
    } else {
      if (about.length >= 0 && about.length <= 200) {
        checkAboutResult = true;
      } else {
        checkMessage = "about can not over 200 characters"
        checkAboutResult = false
      }
    }
    let check = { result: checkAboutResult, message: checkMessage }
    if (!check.result) {
      throw new ApiResponse(ResponseStatus.Failure).setErrorMessage(check.message);
    }
  }


  @Authorized(["auth-token"])
  @Post("/users/update")
  async updateUser(@BodyParam("username") username: string, @BodyParam("userAddress") userAddress: string, @BodyParam("about") about: string) {
    let isUpdateUsername = false;
    if (username != "" && username != null) {
      var existUser = await this.userService.findUsersInfoByAddress(userAddress);
      if (existUser != null && existUser.username != username) {
        let checkUsernameExist = await this.userService.checkUserName(username);
        if (checkUsernameExist != null) {
          return new ApiResponse(ResponseStatus.Failure).setErrorMessage(`${username} already have user used`).toObject();
        } else {
          isUpdateUsername = true;
        }
      }
    }

    if (username == null) {
      username = ''
    }
    if (about == null) {
      about = ''
    }

    try {
      this.checkUserName(username);
      this.checkAbout(about);
    } catch (error) {
      throw error;
    }

    let currentDateTime = new Date();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    let user: any = { username: username, about: about };
    if (isUpdateUsername) {
      var currentDate = new Date();
      let currentYear = currentDate.getFullYear();
      let lastTimeUpdateYear = existUser.updateTime;
      let updateTimes = existUser.updateNameTimes + 1
      if (lastTimeUpdateYear.getFullYear() < currentYear) {
        updateTimes = 1
      }
      user = { username: username, about: about, updateNameTimes: updateTimes, updateTimestamp: currentTimestamp, updateTime: currentDateTime }
    }
    let result = await this.userService.updateUserService(userAddress, user);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData({
        id: result.id,
        userAddress: result.userAddress,
        nonce: result.nonce,
        username: result.username,
        about: result.about,
      });
    }
    return new ApiResponse(ResponseStatus.Failure).setErrorMessage(`unKnow reason`).toObject();;
  }

  async findUserByName(username: string) {
    let result = await this.userService.checkUserName(username);
    return result;
  }

  @Get("/users")
  async findUser(@QueryParam("publicAddress", { required: true }) userAddress: string) {
    let result = await this.userService.findUsersInfoByAddress(userAddress.toLowerCase());
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }


  @Post("/users")
  async createUser(@BodyParam("userAddress", { required: true }) userAddress: string) {
    let result = await this.userService.createUserInfoService(userAddress);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/following/:user/:pageNo/:pageSize")
  async following(@Param("user") user: string, @Param("pageNo") pageNo: number, @Param("pageSize") pageSize: number) {
    let result = await this.userService.followingList(user, pageNo, pageSize);
    return new ApiResponse(ResponseStatus.Success).setData(result);
  }

  @Get("/followers/:user/:pageNo/:pageSize")
  async followers(@Param("user") user: string, @Param("pageNo") pageNo: number, @Param("pageSize") pageSize: number) {
    let result = await this.userService.followList(user, pageNo, pageSize);
    return new ApiResponse(ResponseStatus.Success).setData(result);
  }

  @Authorized("auth-token")
  @Post("/users/follow")
  async follow(@BodyParam("user", { required: true }) user: string, @BodyParam("follower", { required: true }) follower: string) {
    let result = await this.userService.followUser(user, follower);
    if (result) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Authorized("auth-token")
  @Post("/users/unfollow")
  async unFollower(@BodyParam("user", { required: true }) user: string, @BodyParam("follower", { required: true }) follower: string) {
    let result = await this.userService.unFollowUser(user, follower);
    if (result) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Post("/users/auth")
  async authUser(@BodyParam("signature") signature: string, @BodyParam("publicAddress") publicAddress: string) {
    let result = await this.userService.authUserService(
      signature,
      publicAddress
    );
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData({ token: result }).toObject();
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Post("/users/event")
  async eventLog(@BodyParam("name", { required: true }) name: string, @BodyParam("params", { required: true }) event: any) {
    await this.userService.saveEvent(name, event);
    return new ApiResponse(ResponseStatus.Success).toObject();
  }
}
