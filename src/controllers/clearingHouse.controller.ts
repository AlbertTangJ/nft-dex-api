import { BadRequestError, Post, JsonController, BodyParam, Get, QueryParam } from "routing-controllers";
import { AmmService, ClearingHouseService } from "../services";
import { Service } from "typedi";
import { BigNumber, utils } from "ethers";
import {
  getFundingPayment,
  getMarginRatio,
  getPortfolioCollateralValue,
  getPositionNotionalAndUnrealizedPnl,
  getPriceChangePnl,
  getRemainMarginWithFundingPayment,
  getTotalAccountValue
} from "../utils/math";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { toBN } from "src/helpers/decimalHelper";
import { PositionDetail } from "src/helpers/positionDetail";
import { GraphData } from "src/helpers/graphData";
import { TradeData, Position, AmmFundingPayment } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime";

@JsonController()
@Service()
export class ClearingHouseController {
  constructor(private ammService: AmmService, private clearingHouseService: ClearingHouseService) {}

  @Get("/unrealizedPnl")
  async unrealizedPnl(@QueryParam("amm") amm: string, @QueryParam("trader") trader: string) {
    if (!amm || !trader) {
      throw new BadRequestError("amm/trader is required");
    }
    let position = await this.clearingHouseService.currentPosition(trader, amm);
    let ammReserve = await this.ammService.latestAmmReserves(amm);
    if (!position || position.size.eq(0)) {
      return new ApiResponse(ResponseStatus.Failure).toObject();
    }

    let [_, unrealizedPnl] = getPositionNotionalAndUnrealizedPnl(
      toBN(position.openNotional),
      toBN(position.size),
      toBN(ammReserve.quoteAssetReserve),
      toBN(ammReserve.baseAssetReserve)
    );

    return new ApiResponse(ResponseStatus.Success).setData({ unrealizedPnl: unrealizedPnl.toString() }).toObject();
  }

  @Get("/position")
  async position(@QueryParam("amm") ammAddress: string, @QueryParam("trader") trader: string, @QueryParam("timestamp") timestamp: number) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }
    trader = trader.toLowerCase();
    ammAddress = ammAddress.toLowerCase();
    let amm = await this.ammService.amm(ammAddress);

    if (!amm) {
      return new ApiResponse(1).setData({ error: "Amm not found" }).toObject();
    }

    let position = timestamp
      ? await this.clearingHouseService.positionAtTime(trader, ammAddress, timestamp)
      : await this.clearingHouseService.currentPosition(trader, ammAddress);

    let [positionNotional, unrealizedPnl] = getPositionNotionalAndUnrealizedPnl(
      toBN(position.openNotional),
      toBN(position.size),
      toBN(amm.quoteAssetReserve),
      toBN(amm.baseAssetReserve)
    );

    let remainMargin = getRemainMarginWithFundingPayment(
      position,
      unrealizedPnl,
      toBN(position.size.gt(0) ? amm.cumulativePremiumFractionLong : amm.cumulativePremiumFractionShort)
    );
    let marginRatio = getMarginRatio(
      position,
      toBN(amm.quoteAssetReserve),
      toBN(amm.baseAssetReserve),
      toBN(position.size.gt(0) ? amm.cumulativePremiumFractionLong : amm.cumulativePremiumFractionShort)
    );
    let accumulatedFundingPayment = getFundingPayment(
      toBN(position.size),
      toBN(position.lastUpdatedCumulativePremiumFraction),
      toBN(position.size.gt(0) ? amm.cumulativePremiumFractionLong : amm.cumulativePremiumFractionShort)
    );

    let positionDetail = new PositionDetail(
      amm,
      position,
      unrealizedPnl,
      accumulatedFundingPayment,
      marginRatio,
      positionNotional,
      remainMargin
    ).toObject();

    return new ApiResponse(ResponseStatus.Success)
      .setData({
        position: positionDetail
      })
      .toObject();
  }

  @Get("/allPositions")
  async allPositions(@QueryParam("trader") trader: string, @QueryParam("timestamp") timestamp: number) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }
    let amms = await this.ammService.allAmms();
    let positions = timestamp
      ? await this.clearingHouseService.allPositionsAtTime(trader, timestamp)
      : await this.clearingHouseService.allPositions(trader);
    let ammReserves = timestamp ? await this.ammService.allAmmReservesByTime(timestamp) : await this.ammService.allLatestAmmReserves();
    let fundingPayments = timestamp
      ? await this.ammService.allFundingPaymentsByTime(timestamp)
      : await this.ammService.allLatestFundingPayments();
    let initialTethValue = timestamp
      ? await this.clearingHouseService.getTethBalanceHistoryByTime(trader, timestamp)
      : await this.clearingHouseService.getLatestTethBalanceHistory(trader);

    let positionDetails: PositionDetail[] = [];
    let portfolioCollateralValue = BigNumber.from(0);
    let totalAccountValue = initialTethValue ? BigNumber.from(initialTethValue.balance.toString()) : utils.parseEther("20");
    let totalAccumulativeFundingPayment = BigNumber.from(0);
    let totalUnrealizedPnl = BigNumber.from(0);
    let allTimePriceChangePnl = BigNumber.from(0);
    let allTimeAccumulativeFundingPayment = BigNumber.from(0);

    for (let position of positions) {
      if (position.size.equals(0)) {
        totalAccountValue = totalAccountValue
          .add(toBN(position.cumulativeRealizedPnl))
          .sub(toBN(position.cumulativeFee))
          .sub(toBN(position.cumulativeFundingPayment))
          .sub(toBN(position.cumulativeLiquidationPenalty))
          .sub(toBN(position.cumulativeFullLiquidationRealizedPnl))
          .add(toBN(position.cumulativeFullLiquidationFundingPayment));
        allTimePriceChangePnl = allTimePriceChangePnl.add(toBN(position.realizedPnl));
        allTimeAccumulativeFundingPayment = allTimeAccumulativeFundingPayment.add(toBN(position.cumulativeFundingPayment));
        // if (
        //   position.ammAddress == "0x5b16022F803D63Fb2D2258C5b35dd6221217F156"
        // ) {
        //   console.log(
        //     BigNumber.from(0)
        //       .add(toBN(position.cumulativeRealizedPnl))
        //       .sub(toBN(position.cumulativeFee))
        //       .sub(toBN(position.cumulativeFundingPayment))
        //       .sub(toBN(position.cumulativeLiquidationPenalty))
        //       .add(BigNumber.from("7075834652536223634"))
        //       .toString()
        //   );
        // }
        continue;
      }
      let ammReserve = ammReserves.find(reserve => reserve.ammAddress.toLowerCase() == position.ammAddress.toLowerCase());
      let fundingPayment = fundingPayments.find(payment => payment.ammAddress.toLowerCase() == position.ammAddress.toLowerCase());
      let [positionNotional, unrealizedPnl] = getPositionNotionalAndUnrealizedPnl(
        toBN(position.openNotional),
        toBN(position.size),
        toBN(ammReserve.quoteAssetReserve),
        toBN(ammReserve.baseAssetReserve)
      );

      let remainMargin = getRemainMarginWithFundingPayment(
        position,
        unrealizedPnl,
        toBN(
          fundingPayment
            ? position.size.gt(0)
              ? fundingPayment.cumulativePremiumFractionLong
              : fundingPayment.cumulativePremiumFractionShort
            : new Decimal(0)
        )
      );
      let marginRatio = getMarginRatio(
        position,
        toBN(ammReserve.quoteAssetReserve),
        toBN(ammReserve.baseAssetReserve),
        toBN(
          fundingPayment
            ? position.size.gt(0)
              ? fundingPayment.cumulativePremiumFractionLong
              : fundingPayment.cumulativePremiumFractionShort
            : new Decimal(0)
        )
      );
      let accumulatedFundingPayment = getFundingPayment(
        toBN(position.size),
        toBN(position.lastUpdatedCumulativePremiumFraction),
        toBN(
          fundingPayment
            ? position.size.gt(0)
              ? fundingPayment.cumulativePremiumFractionLong
              : fundingPayment.cumulativePremiumFractionShort
            : new Decimal(0)
        )
      );
      totalAccumulativeFundingPayment = totalAccumulativeFundingPayment.add(accumulatedFundingPayment);

      totalUnrealizedPnl = totalUnrealizedPnl.add(unrealizedPnl);

      allTimeAccumulativeFundingPayment = allTimeAccumulativeFundingPayment
        .add(toBN(position.cumulativeFundingPayment))
        .add(accumulatedFundingPayment);

      portfolioCollateralValue = portfolioCollateralValue.add(
        getPortfolioCollateralValue(
          position,
          toBN(ammReserve.quoteAssetReserve),
          toBN(ammReserve.baseAssetReserve),
          toBN(
            fundingPayment
              ? position.size.gt(0)
                ? fundingPayment.cumulativePremiumFractionLong
                : fundingPayment.cumulativePremiumFractionShort
              : new Decimal(0)
          )
        )
      );
      totalAccountValue = totalAccountValue.add(
        getTotalAccountValue(
          position,
          toBN(ammReserve.quoteAssetReserve),
          toBN(ammReserve.baseAssetReserve),
          toBN(
            fundingPayment
              ? position.size.gt(0)
                ? fundingPayment.cumulativePremiumFractionLong
                : fundingPayment.cumulativePremiumFractionShort
              : new Decimal(0)
          )
        )
      );
      // if (position.ammAddress == "0x5b16022F803D63Fb2D2258C5b35dd6221217F156") {
      //   console.log(
      //     "why",
      //     getTotalAccountValue(
      //       position,
      //       toBN(ammReserve.quoteAssetReserve),
      //       toBN(ammReserve.baseAssetReserve),
      //       toBN(fundingPayment.cumulativePremiumFraction)
      //     ).toString()
      //   );
      // }
      allTimePriceChangePnl = allTimePriceChangePnl.add(
        getPriceChangePnl(position, toBN(ammReserve.quoteAssetReserve), toBN(ammReserve.baseAssetReserve))
      );

      positionDetails.push(
        new PositionDetail(
          amms.find(a => a.address.toLowerCase() == position.ammAddress.toLowerCase()),
          position,
          unrealizedPnl,
          accumulatedFundingPayment,
          marginRatio,
          positionNotional,
          remainMargin
        )
      );
    }

    return new ApiResponse(ResponseStatus.Success)
      .setData({
        positions: positionDetails.sort((a, b) => a.getAmm().sortOrder - b.getAmm().sortOrder).map(p => p.toObject()),
        portfolioCollateralValue: portfolioCollateralValue.toString(),
        totalAccountValue: totalAccountValue.toString(),
        totalAccumulativeFundingPayment: totalAccumulativeFundingPayment.mul(-1).toString(),
        totalUnrealizedPnl: totalUnrealizedPnl.toString(),
        allTimePriceChangePnl: allTimePriceChangePnl.toString(),
        allTimeAccumulativeFundingPayment: allTimeAccumulativeFundingPayment.mul(-1).toString()
      })
      .toObject();
  }

  @Get("/dailyAccountValueGraph")
  async dailyAccountValueGraph(@QueryParam("trader") trader: string) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }
    return await this.totalAccountValueGraph(trader, 300);
  }

  @Get("/weeklyAccountValueGraph")
  async weeklyAccountValueGraph(@QueryParam("trader") trader: string) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }
    return await this.totalAccountValueGraph(trader, 1800);
  }

  @Get("/monthlyAccountValueGraph")
  async monthlyAccountValueGraph(@QueryParam("trader") trader: string) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }
    return await this.totalAccountValueGraph(trader, 7200);
  }

  @Get("/allTimeAccountValueGraph")
  async allTimeAccountValueGraph(@QueryParam("trader") trader: string) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }
    let firstPosition = await this.clearingHouseService.firstPosition(trader);

    const supportedInterval = [300, 900, 1800, 3600, 7200, 21600, 43200, 86400, 172800];

    let interval = 172800;

    if (firstPosition) {
      const nowTs = Math.round(new Date().getTime() / 1000);
      let timeDiff = nowTs - firstPosition.timestamp;

      for (let i = 0; i < supportedInterval.length; i++) {
        if (timeDiff / 360 <= supportedInterval[i]) {
          interval = supportedInterval[i];
          break;
        }
      }
    } else {
      return new ApiResponse(ResponseStatus.Success).toObject();
    }

    return await this.totalAccountValueGraph(trader, interval, firstPosition.timestamp);
  }

  async totalAccountValueGraph(trader: string, resolution: number, startFromTime?: number) {
    const nowTs = Math.round(new Date().getTime() / 1000);
    const tsYesterday = nowTs - 1 * 24 * 3600;
    const ts7Days = nowTs - 7 * 24 * 3600;
    const ts30Days = nowTs - 30 * 24 * 3600;
    const startFrom = startFromTime ? startFromTime : resolution == 7200 ? ts30Days : resolution == 1800 ? ts7Days : tsYesterday;

    const startRoundTime = startFrom - (startFrom % resolution);

    let previousPositions = await this.clearingHouseService.allPositionsAtTime(trader, startRoundTime);
    let positions = previousPositions.concat(await this.clearingHouseService.allAmmPositionAfter(trader, startRoundTime));
    let tradeData = await this.clearingHouseService.allAmmTradeDataAfter(startRoundTime, resolution);
    let tethBalanceHistories = await this.clearingHouseService.allTethBalanceHistory(trader);

    let positionMap = new Map<number, Map<string, [TradeData, Position] | null>>(); // Map<startRoundTime, Map<amm, [tradeData, position]>>
    let latestPositionForAmm = new Map<string, Position>();
    let latestTradeDataForAmm = new Map<string, TradeData>();
    let latestTradeDataTimestamp = 0;

    for (let data of tradeData) {
      if (!positionMap.has(data.endTimestamp)) {
        positionMap.set(data.endTimestamp, null);
      }
      for (let position of positions) {
        if (data.ammAddress == position.ammAddress && position.timestamp <= data.endTimestamp) {
          if (positionMap.has(data.endTimestamp) && positionMap.get(data.endTimestamp)) {
            positionMap.get(data.endTimestamp).set(data.ammAddress, [data, position]);
          } else {
            positionMap.set(data.endTimestamp, new Map([[data.ammAddress, [data, position]]]));
          }
          latestPositionForAmm.set(data.ammAddress, position);
          latestTradeDataForAmm.set(data.ammAddress, data);
          latestTradeDataTimestamp = data.endTimestamp;
        }
      }
    }

    let graphDataList: any[] = [];

    let previousPositionCount = 0;

    for (let endTimestamp of positionMap.keys()) {
      let tradeDataAndPositionsAtEndTime = positionMap.get(endTimestamp);
      let totalAccountValue = utils.parseEther("20");

      if (tethBalanceHistories.length > 0) {
        for (let tethBalanceHistory of tethBalanceHistories) {
          if (tethBalanceHistory.timestamp <= endTimestamp) {
            totalAccountValue = BigNumber.from(tethBalanceHistory.balance.toString());
          }
        }
      }

      let portfolioCollateralValue = BigNumber.from(0);
      let positionCount = 0;

      if (tradeDataAndPositionsAtEndTime) {
        for (let [tradeData, position] of tradeDataAndPositionsAtEndTime.values()) {
          totalAccountValue = totalAccountValue.add(
            getTotalAccountValue(
              position,
              toBN(tradeData.closeQuoteAssetReserve),
              toBN(tradeData.closeBaseAssetReserve),
              toBN(position.size.gt(0) ? tradeData.closeCumulativePremiumFactionLong : tradeData.closeCumulativePremiumFactionShort)
            )
          );

          portfolioCollateralValue = portfolioCollateralValue.add(
            getPortfolioCollateralValue(
              position,
              toBN(tradeData.closeQuoteAssetReserve),
              toBN(tradeData.closeBaseAssetReserve),
              toBN(position.size.gt(0) ? tradeData.closeCumulativePremiumFactionLong : tradeData.closeCumulativePremiumFactionShort)
            )
          );
          positionCount++;
        }
      }

      if (positionCount < previousPositionCount) {
        // Missing trade data for some amm
        for (let ammAddress of latestPositionForAmm.keys()) {
          ammAddress = ammAddress.toLowerCase();
          let processedAmm = tradeDataAndPositionsAtEndTime
            ? Array.from(tradeDataAndPositionsAtEndTime.values()).map(data => data[0].ammAddress)
            : [];
          if (!processedAmm.includes(ammAddress)) {
            let tradeData = latestTradeDataForAmm.get(ammAddress);
            let position = latestPositionForAmm.get(ammAddress);
            if (tradeData.endTimestamp <= endTimestamp) {
              positionCount++;
              totalAccountValue = totalAccountValue.add(
                getTotalAccountValue(
                  position,
                  toBN(tradeData.closeQuoteAssetReserve),
                  toBN(tradeData.closeBaseAssetReserve),
                  toBN(position.size.gt(0) ? tradeData.closeCumulativePremiumFactionLong : tradeData.closeCumulativePremiumFactionShort)
                )
              );

              portfolioCollateralValue = portfolioCollateralValue.add(
                getPortfolioCollateralValue(
                  position,
                  toBN(tradeData.closeQuoteAssetReserve),
                  toBN(tradeData.closeBaseAssetReserve),
                  toBN(position.size.gt(0) ? tradeData.closeCumulativePremiumFactionLong : tradeData.closeCumulativePremiumFactionShort)
                )
              );
            }
          }
        }
      }

      if (tradeDataAndPositionsAtEndTime && tradeDataAndPositionsAtEndTime.size > previousPositionCount) {
        previousPositionCount = tradeDataAndPositionsAtEndTime.size;
      }

      graphDataList.push(new GraphData(endTimestamp + 1, totalAccountValue, portfolioCollateralValue, positionCount).toObject());
    }

    if (graphDataList.length > 0 && graphDataList[graphDataList.length - 1].time < nowTs) {
      // Missing latest trader data for all amm from DB (i.e. no one trade for all amm in certain time)
      let startTime = graphDataList[graphDataList.length - 1].time;
      let missingGraphDataCount = Math.ceil((nowTs - startTime) / resolution);

      for (let i = 0; i < missingGraphDataCount; i++) {
        graphDataList.push(
          new GraphData(
            startTime + resolution * (i + 1),
            graphDataList[graphDataList.length - 1].totalAccountValue,
            graphDataList[graphDataList.length - 1].portfolioCollateralValue,
            graphDataList[graphDataList.length - 1].positionCount
          ).toObject()
        );
        startTime = startTime + resolution;
      }
    }

    return new ApiResponse(ResponseStatus.Success)
      .setData({
        graphData: graphDataList
      })
      .toObject();
  }

  @Get("/fundingPaymentHistory")
  async fundingPaymentHistory(@QueryParam("trader") trader: string, @QueryParam("amm") amm: string) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }
    if (!amm) {
      throw new BadRequestError("amm is required");
    }

    const currentPositionHistory = await this.clearingHouseService.getCurrentPositionHistory(trader, amm);
    if (
      currentPositionHistory.length == 0 ||
      currentPositionHistory.find(position => {
        position.size.eq(0);
      })
    ) {
      return new ApiResponse(ResponseStatus.Failure).toObject();
    }

    let fundingPaymentPnlHistory = [];

    let total: Decimal = new Decimal(0);

    const fundingPaymentHistory = await this.ammService.allFundingPaymentsAfter(amm, currentPositionHistory[0].timestampIndex);
    let currentPositionHistoryIndex = 0;
    for (let i = 0; i < fundingPaymentHistory.length; i++) {
      const fundingPayment = fundingPaymentHistory[i];
      let position = currentPositionHistory[currentPositionHistoryIndex];
      while (
        currentPositionHistory[currentPositionHistoryIndex + 1] &&
        currentPositionHistory[currentPositionHistoryIndex + 1].timestampIndex < fundingPayment.timestampIndex
      ) {
        currentPositionHistoryIndex++;
        position = currentPositionHistory[currentPositionHistoryIndex];
      }

      let fundingPaymentPnl = (
        position.size.gt(0)
          ? position.size.mul(fundingPayment.premiumFractionLong).div(1e18).round()
          : position.size.mul(fundingPayment.premiumFractionShort).div(1e18).round()
      ).mul(-1);

      total = total.add(fundingPaymentPnl);
      fundingPaymentPnlHistory.push({
        timestamp: fundingPayment.timestamp,
        fundingPaymentPnl
      });
    }

    return new ApiResponse(ResponseStatus.Success)
      .setData({
        fundingPaymentPnlHistory: fundingPaymentPnlHistory.reverse(),
        total
      })
      .toObject();
  }

  @Get("/tradeHistory")
  async tradeHistory(@QueryParam("trader") trader: string) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }

    const tradeHistory = await this.clearingHouseService.getTradeHistory(trader, 500, 0);
    const processedTradeHistory = [];

    for (let history of tradeHistory) {
      let data: any = {
        txHash: history.txHash,
        entryPrice: history.openNotional.mul(1e18).div(history.size.abs()).round(),
        ammAddress: history.ammAddress,
        timestamp: history.timestamp,
        amount: history.amount,
        collateralChange: history.margin.sub(history.previousMargin)
      };

      if (history.action == "Trade" || history.action == "Liquidation") {
        if (history.action == "Trade"  && history.exchangedPositionSize.mul(history.size).isNeg() && history.liquidationPenalty.eq(0)) {
          //Partial close
          data.collateralChange = new Decimal(0);
        }

        data.type = "trade";
        data.exchangedPositionSize = history.exchangedPositionSize;
        data.positionSizeAfter = history.size;
        data.positionNotional = history.positionNotional;
        data.fee = history.fee;
        data.realizedPnl = history.realizedPnl;
        data.amount = history.amount;
        data.fundingPayment = history.size.eq(0) ? history.positionCumulativeFundingPayment.mul(-1) : new Decimal(0);
        data.notionalChange = history.openNotional.sub(history.previousOpenNotional);
        data.liquidationPenalty = history.liquidationPenalty;
      } else if (history.action == "AdjustMargin") {
        data.type = "adjust";
      }
      processedTradeHistory.push(data);
    }

    return new ApiResponse(ResponseStatus.Success)
      .setData({
        tradeHistory: processedTradeHistory
      })
      .toObject();
  }

  @Get("/lastUpdatedBlock")
  async lastUpdatedBlock() {
    const lastUpdatedBlock = await this.clearingHouseService.getLatestUpdatedPositionBlockNumber();
    return new ApiResponse(ResponseStatus.Success)
      .setData({
        lastUpdatedBlock
      })
      .toObject();
  }
}
