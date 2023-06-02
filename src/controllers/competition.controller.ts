import { JsonController, Get, QueryParam, Param } from "routing-controllers";
import { PointsService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { CompetitionService } from "src/services/competition.service";
import Schema, { Rules } from "async-validator";
import { isAddress } from "ethers/lib/utils";
import { CompetitionSeason1 } from "@prisma/client";
import BigNumber from "bignumber.js";

@JsonController()
@Service()
export class CompetitionController {
  private userAddressValidator: Schema;
  constructor(private competitionService: CompetitionService) {
    const pointsParamsCheck: Rules = {
      user: {
        type: "string",
        required: false,
        message: "Invalid user address",
        validator: (rule: any, value: any) => {
          if (value == "" || value == undefined) {
            return true;
          } else {
            return isAddress(value);
          }
        }
      }
    };

    this.userAddressValidator = new Schema(pointsParamsCheck);
  }

  @Get("/competition/leaderboard/absPnl")
  async getAbsPnlLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getAbsPnlLeaderboard(pageNo);

    if (result != null) {
      let userRecord = null;
      let userRank = 0;
      let userObj = null;
      if (user.length > 0) {
        userRecord = (await this.competitionService.getPersonalLeaderboardRecord(user))[0] ?? null;
        if (userRecord) {
          userRank = result.find(record => record.userAddress == userRecord?.userAddress)?.rank ?? 0;
        }
        userObj = {
          userAddress: user.toLowerCase(),
          username: userRecord?.username ?? "",
          rank: userRank.toString(),
          pnl: userRecord?.absolutePnl ?? "0",
          tradeVol: userRecord?.tradedVolume ?? "0",
          eligible: new BigNumber(userRecord?.tradedVolume ?? "0").gte(new BigNumber("5e18"))
        };
      }
      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/netConvergenceVol")
  async getNetConvergenceVolLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getNetConvergenceVolLeaderboard(pageNo);
    if (result != null) {
      let userRecord = null;
      let userRank = 0;
      let userObj = null;
      if (user.length > 0) {
        userRecord = (await this.competitionService.getPersonalLeaderboardRecord(user))[0] ?? null;
        if (userRecord) {
          userRank = result.find(record => record.userAddress == userRecord?.userAddress)?.rank ?? 0;
        }
        userObj = {
          userAddress: user.toLowerCase(),
          username: userRecord?.username ?? "",
          rank: userRank.toString(),
          netConvergenceVol: userRecord?.netConvergenceVolume ?? "0",
          tradeVol: userRecord?.tradedVolume ?? "0",
          eligible: new BigNumber(userRecord?.tradedVolume ?? "0").gte(new BigNumber("5e18"))
        };
      }
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/realisedPnl")
  async getRealisedPnlLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getRealisedPnlLeaderboard(pageNo);
    if (result != null) {
      if (user.length > 0) {
        let userRecord = null;
        let userRank = 0;
        let userObj = null;
        if (user.length > 0) {
          userRecord = (await this.competitionService.getPersonalLeaderboardRecord(user))[0] ?? null;
          if (userRecord) {
            userRank = result.find(record => record.userAddress == userRecord?.userAddress)?.rank ?? 0;
          }
          userObj = {
            userAddress: user.toLowerCase(),
            username: userRecord?.username ?? "",
            rank: userRank.toString(),
            pnl: userRecord?.roi ?? "0",
            tradeVol: userRecord?.tradedVolume ?? "0",
            eligible: new BigNumber(userRecord?.tradedVolume ?? "0").gte(new BigNumber("5e18"))
          };
        }
      }
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/topLoser")
  async getTopLoserLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
    try {
      await this.userAddressValidator.validate({ user }, errors => {
        if (errors) {
          for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
          }
        }
      });
    } catch (error) {
      return new ApiResponse(ResponseStatus.Failure);
    }

    let result = await this.competitionService.getTopLoserLeaderboard(pageNo);
    if (result != null) {
      let userRecord = null;
      let userRank = 0;
      let userObj = null;
      if (user.length > 0) {
        userRecord = (await this.competitionService.getPersonalLeaderboardRecord(user))[0] ?? null;
        if (userRecord) {
          userRank = result.find(record => record.userAddress == userRecord?.userAddress)?.rank ?? 0;
        }
        userObj = {
          userAddress: user.toLowerCase(),
          username: userRecord?.username ?? "",
          rank: userRank.toString(),
          pnl: userRecord?.absolutePnl ?? "0",
          tradeVol: userRecord?.tradedVolume ?? "0",
          eligible: new BigNumber(userRecord?.tradedVolume ?? "0").gte(new BigNumber("5e18"))
        };
      }
      return new ApiResponse(ResponseStatus.Success).setData(result);
    }
    return new ApiResponse(ResponseStatus.Failure);
  }
}
