import { JsonController, Get, QueryParam } from "routing-controllers";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { CompetitionService } from "src/services/competition.service";
import Schema, { Rules } from "async-validator";
import { isAddress } from "ethers/lib/utils";
import BigNumber from "bignumber.js";
import Prize from "src/helpers/competitionS2Prize";

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
      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
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
      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
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
      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
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
      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  // Season 2
  @Get("/competition/leaderboard/s2/absPnl")
  async getS2AbsPnlLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
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

    let result = await this.competitionService.getS2AbsPnlLeaderboard(pageNo);

    if (result != null) {
      let userRecord = null;
      let userObj = null;
      if (user.length > 0) {
        userRecord = result.find(record => record.userAddress.toLowerCase() == user.toLowerCase());
        const rank = userRecord?.rank ?? 0;
        const prize = Prize.topGainerPrize.find(prize => prize.start <= rank && prize.end >= rank);
        userObj = {
          userAddress: userRecord?.userAddress,
          username: userRecord?.username ?? "",
          rank: userRecord?.rank?.toString() ?? "0",
          pnl: userRecord?.pnl ?? "0",
          pointPrize: prize?.points ?? 0,
          usdtPrize: prize?.usdt ?? 0
        };
      }
      for (let ranking of result) {
        const rank = ranking.rank;
        const prize = Prize.topGainerPrize.find(prize => prize.start <= rank && prize.end >= rank);
        ranking.pointPrize = prize?.points ?? 0;
        ranking.usdtPrize = prize?.usdt ?? 0;
      }

      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/s2/topFundingPayment")
  async getS2TopFundingPaymentLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
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

    let result = await this.competitionService.getS2FundingPaymentLeaderboard(pageNo);

    if (result != null) {
      let userRecord = null;
      let userObj = null;
      if (user.length > 0) {
        userRecord = result.find(record => record.userAddress.toLowerCase() == user.toLowerCase());
        const rank = userRecord?.rank ?? 0;
        const prize = Prize.topFundingPaymentPrize.find(prize => prize.start <= rank && prize.end >= rank);
        userObj = {
          userAddress: userRecord?.userAddress,
          username: userRecord?.username ?? "",
          rank: userRecord?.rank?.toString() ?? "0",
          fundingPayment: userRecord?.fundingPayment ?? "0",
          pointPrize: prize?.points ?? 0,
          usdtPrize: prize?.usdt ?? 0
        };
      }
      for (let ranking of result) {
        const rank = ranking.rank;
        const prize = Prize.topFundingPaymentPrize.find(prize => prize.start <= rank && prize.end >= rank);
        ranking.pointPrize = prize?.points ?? 0;
        ranking.usdtPrize = prize?.usdt ?? 0;
      }

      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/s2/topWeeklyVolume")
  async getS2TopWeeklyVolumeLeaderboard(
    @QueryParam("userAddress") user: string = "",
    @QueryParam("pageNo") pageNo: number = 1,
    @QueryParam("week") week: number = -1
  ) {
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

    let result =
      week < 0
        ? await this.competitionService.getS2TradedVolumeLeaderboard(pageNo)
        : await this.competitionService.getS2TradedVolumeLeaderboardByWeek(pageNo, week);

    if (result != null) {
      let userRecord = null;
      let userObj = null;
      if (user.length > 0) {
        userRecord = result.find(record => record.userAddress.toLowerCase() == user.toLowerCase());
        const rank = userRecord?.rank ?? 0;
        const prize = Prize.tradedVolumePrize.find(prize => prize.start <= rank && prize.end >= rank);
        userObj = {
          userAddress: userRecord?.userAddress,
          username: userRecord?.username ?? "",
          rank: userRecord?.rank?.toString() ?? "0",
          weeklyTradedVolume: userRecord?.weeklyTradedVolume ?? "0",
          pointPrize: prize?.points ?? 0,
          usdtPrize: prize?.usdt ?? 0
        };
      }
      for (let ranking of result) {
        const rank = ranking.rank;
        const prize = Prize.tradedVolumePrize.find(prize => prize.start <= rank && prize.end >= rank);
        ranking.pointPrize = prize?.points ?? 0;
        ranking.usdtPrize = prize?.usdt ?? 0;
      }

      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }

  @Get("/competition/leaderboard/s2/topRefereeVolume")
  async getS2TopRefereeVolumeLeaderboard(@QueryParam("userAddress") user: string = "", @QueryParam("pageNo") pageNo: number = 1) {
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

    let result = await this.competitionService.getS2RefereeTradedVolumeLeaderboard(pageNo);

    if (result != null) {
      let userRecord = null;
      let userObj = null;
      if (user.length > 0) {
        userRecord = result.find(record => record.userAddress.toLowerCase() == user.toLowerCase());
        const rank = userRecord?.rank ?? 0;
        const prize = Prize.topReferralPrize.find(prize => prize.start <= rank && prize.end >= rank);
        userObj = {
          userAddress: userRecord?.userAddress,
          username: userRecord?.username ?? "",
          rank: userRecord?.rank?.toString() ?? "0",
          totalVolume: userRecord?.totalVolume ?? "0",
          pointPrize: prize?.points ?? 0,
          usdtPrize: prize?.usdt ?? 0
        };
      }
      for (let ranking of result) {
        const rank = ranking.rank;
        const prize = Prize.topReferralPrize.find(prize => prize.start <= rank && prize.end >= rank);
        ranking.pointPrize = prize?.points ?? 0;
        ranking.usdtPrize = prize?.usdt ?? 0;
      }

      return new ApiResponse(ResponseStatus.Success).setData({ user: userObj, leaderboard: result.slice(0, 100) });
    }
    return new ApiResponse(ResponseStatus.Failure);
  }
}
