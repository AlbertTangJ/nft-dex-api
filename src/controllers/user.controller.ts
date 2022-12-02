import {
  JsonController,
  Get,
  QueryParam,
  Post,
  BodyParam,
  Authorized
} from "routing-controllers";
import { UserService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { isAddress } from "ethers/lib/utils";
import Schema, { Rules } from 'async-validator';

type CreateUserInfoBody = {
  userAddress: string,
  username: string,
  nonce: number
}

@JsonController()
@Service()
export class UserController {
  private followListValidator: Schema;

  constructor(private userService: UserService) {
    const followListAPICheck: Rules = {
      user: {
        type: "string",
        required: true,
        message: "need to right user address",
        validator: (rule: any, value: any) => {
          if (value == '') {
            return true
          } else {
            return isAddress(value)
          }
        },
      },
      viewer: {
        type: "string",
        required: true,
        message: "need to right viewer address",
        validator: (rule: any, value: any) => isAddress(value),
      }
    }

    this.followListValidator = new Schema(followListAPICheck);
  }

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
      // 说移除一年改3次的限制, DB相关数据保留
      // else {
      //   if (updateTimes > 3) {
      //     return new ApiResponse(ResponseStatus.Failure).setErrorMessage(`can not change username over 3 times pre year`).toObject();;
      //   }
      // }
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

  @Post("/users/search")
  async search(@BodyParam("keyword") keyword: string) {
    let result = await this.userService.searchAddressUsername(keyword);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/users")
  async findUser(@QueryParam("publicAddress", { required: true }) userAddress: string) {
    if (isAddress(userAddress)) {
      let result = await this.userService.findUsersInfoByAddress(userAddress.toLowerCase());
      if (result != null) {
        return new ApiResponse(ResponseStatus.Success).setData(result);
      }
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/test")
  async test() {
    await this.userService.test()
  }

  @Post("/users")
  async createUser(@BodyParam("userAddress", { required: true }) userAddress: string) {
    let result = await this.userService.createUserInfoService(userAddress);
    if (result != null) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Post("/following/list")
  async following(@BodyParam("user", { required: true }) user: string, @BodyParam("targetUser", { required: true }) targetUser: string, @BodyParam("pageNo") pageNo: number = 1, @BodyParam("pageSize") pageSize: number = 30) {
    try {
      await this.followListValidator.validate({ user: user, viewer: targetUser }, (errors) => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            throw { result: ResponseStatus.Failure, message: error.message };
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
    }

    let result = await this.userService.followingList(user, targetUser, pageNo, pageSize);
    return new ApiResponse(ResponseStatus.Success).setData(result);
  }

  @Post("/followers/list")
  async followers(@BodyParam("user", { required: true }) user: string, @BodyParam("targetUser", { required: true }) targetUser: string, @BodyParam("pageNo") pageNo: number = 1, @BodyParam("pageSize") pageSize: number = 30) {
    try {
      await this.followListValidator.validate({ user: user, viewer: targetUser }, (errors) => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            throw { result: ResponseStatus.Failure, message: error.message };
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
    }
    let result = await this.userService.followersList(user, targetUser, pageNo, pageSize);
    return new ApiResponse(ResponseStatus.Success).setData(result);
  }

  // @Authorized("auth-token")
  @Post("/users/follow")
  async follow(@BodyParam("userAddress", { required: true }) user: string, @BodyParam("followerAddress", { required: true }) follower: string) {
    let result = await this.userService.followUser(user, follower);
    if (result) {
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  // @Authorized("auth-token")
  @Post("/users/unfollow")
  async unFollower(@BodyParam("userAddress", { required: true }) user: string, @BodyParam("followerAddress", { required: true }) follower: string) {
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

  @Authorized("auth-token")
  @Post("/users/referral/code")
  async inputReferralCode(@BodyParam("code", { required: true }) code: string, @BodyParam("userAddress", { required: true }) userAddress: string) {
    let result = await this.userService.inputReferralCode(code, userAddress);
    if (result == null) {
      return new ApiResponse(ResponseStatus.Failure).toObject();
    }
    return new ApiResponse(ResponseStatus.Success).setData(result).toObject();
  }
}
