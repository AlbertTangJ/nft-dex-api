import {
  BadRequestError,
  Post,
  JsonController,
  BodyParam,
  Get,
  QueryParam,
} from "routing-controllers";
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
  getTotalAccountValue,
} from "../utils/math";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { toBN } from "src/helpers/decimalHelper";
import { PositionDetail } from "src/helpers/positionDetail";
import { GraphData } from "src/helpers/graphData";
import { TradeData, Position } from "@prisma/client";

@JsonController()
@Service()
export class ClearingHouseController {
  constructor(
    private ammService: AmmService,
    private clearingHouseService: ClearingHouseService
  ) {}

  @Get("/unrealizedPnl")
  async unrealizedPnl(
    @QueryParam("amm") amm: string,
    @QueryParam("trader") trader: string
  ) {
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

    return new ApiResponse(ResponseStatus.Success)
      .setData({ unrealizedPnl: unrealizedPnl.toString() })
      .toObject();
  }

  @Get("/position")
  async position(
    @QueryParam("amm") ammAddress: string,
    @QueryParam("trader") trader: string,
    @QueryParam("timestamp") timestamp: number
  ) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }
    let amm = await this.ammService.amm(ammAddress);

    if (!amm) {
      return new ApiResponse(ResponseStatus.Failure).setData({ error: "Amm not found" }).toObject();
    }

    let position = timestamp
      ? await this.clearingHouseService.positionAtTime(
          trader,
          ammAddress,
          timestamp
        )
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
      toBN(amm.cumulativePremiumFraction)
    );
    let marginRatio = getMarginRatio(
      position,
      toBN(amm.quoteAssetReserve),
      toBN(amm.baseAssetReserve),
      toBN(amm.cumulativePremiumFraction)
    );
    let accumulatedFundingPayment = getFundingPayment(
      toBN(position.size),
      toBN(position.lastUpdatedCumulativePremiumFraction),
      toBN(amm.cumulativePremiumFraction)
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
        position: positionDetail,
      })
      .toObject();
  }

  @Get("/allPositions")
  async allPositions(
    @QueryParam("trader") trader: string,
    @QueryParam("timestamp") timestamp: number
  ) {
    if (!trader) {
      throw new BadRequestError("trader is required");
    }
    let amms = await this.ammService.allAmms();
    let positions = timestamp
      ? await this.clearingHouseService.allPositionsAtTime(trader, timestamp)
      : await this.clearingHouseService.allPositions(trader);
    let ammReserves = timestamp
      ? await this.ammService.allAmmReservesByTime(timestamp)
      : await this.ammService.allLatestAmmReserves();
    let fundingPayments = timestamp
      ? await this.ammService.allFundingPaymentsByTime(timestamp)
      : await this.ammService.allLatestFundingPayments();
    let positionDetails: PositionDetail[] = [];
    let portfolioCollateralValue = BigNumber.from(0);
    let totalAccountValue = utils.parseEther("20");
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
        allTimePriceChangePnl = allTimePriceChangePnl.add(
          toBN(position.realizedPnl)
        );
        allTimeAccumulativeFundingPayment =
          allTimeAccumulativeFundingPayment.add(
            toBN(position.cumulativeFundingPayment)
          );
        continue;
      }
      let ammReserve = ammReserves.find(
        (reserve) => reserve.ammAddress == position.ammAddress
      );
      let fundingPayment = fundingPayments.find(
        (payment) => payment.ammAddress == position.ammAddress
      );
      let [positionNotional, unrealizedPnl] =
        getPositionNotionalAndUnrealizedPnl(
          toBN(position.openNotional),
          toBN(position.size),
          toBN(ammReserve.quoteAssetReserve),
          toBN(ammReserve.baseAssetReserve)
        );

      let remainMargin = getRemainMarginWithFundingPayment(
        position,
        unrealizedPnl,
        toBN(fundingPayment.cumulativePremiumFraction)
      );
      let marginRatio = getMarginRatio(
        position,
        toBN(ammReserve.quoteAssetReserve),
        toBN(ammReserve.baseAssetReserve),
        toBN(fundingPayment.cumulativePremiumFraction)
      );
      let accumulatedFundingPayment = getFundingPayment(
        toBN(position.size),
        toBN(position.lastUpdatedCumulativePremiumFraction),
        toBN(fundingPayment.cumulativePremiumFraction)
      );
      totalAccumulativeFundingPayment = totalAccumulativeFundingPayment.add(
        accumulatedFundingPayment
      );

      totalUnrealizedPnl = totalUnrealizedPnl.add(unrealizedPnl);

      allTimeAccumulativeFundingPayment = allTimeAccumulativeFundingPayment
        .add(toBN(position.cumulativeFundingPayment))
        .add(accumulatedFundingPayment);

      portfolioCollateralValue = portfolioCollateralValue.add(
        getPortfolioCollateralValue(
          position,
          toBN(ammReserve.quoteAssetReserve),
          toBN(ammReserve.baseAssetReserve),
          toBN(fundingPayment.cumulativePremiumFraction)
        )
      );
      totalAccountValue = totalAccountValue.add(
        getTotalAccountValue(
          position,
          toBN(ammReserve.quoteAssetReserve),
          toBN(ammReserve.baseAssetReserve),
          toBN(fundingPayment.cumulativePremiumFraction)
        )
      );
      allTimePriceChangePnl = allTimePriceChangePnl.add(
        getPriceChangePnl(
          position,
          toBN(ammReserve.quoteAssetReserve),
          toBN(ammReserve.baseAssetReserve)
        )
      );

      positionDetails.push(
        new PositionDetail(
          amms.find((a) => a.address == position.ammAddress),
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
        positions: positionDetails
          .sort((a, b) => a.getAmm().sortOrder - b.getAmm().sortOrder)
          .map((p) => p.toObject()),
        portfolioCollateralValue: portfolioCollateralValue.toString(),
        totalAccountValue: totalAccountValue.toString(),
        totalAccumulativeFundingPayment: totalAccumulativeFundingPayment
          .mul(-1)
          .toString(),
        totalUnrealizedPnl: totalUnrealizedPnl.toString(),
        allTimePriceChangePnl: allTimePriceChangePnl.toString(),
        allTimeAccumulativeFundingPayment: allTimeAccumulativeFundingPayment
          .mul(-1)
          .toString(),
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

    const supportedInterval = [
      300, 900, 1800, 3600, 7200, 21600, 43200, 86400, 172800,
    ];

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

    return await this.totalAccountValueGraph(
      trader,
      interval,
      firstPosition.timestamp
    );
  }

  async totalAccountValueGraph(
    trader: string,
    resolution: number,
    startFromTime?: number
  ) {
    const nowTs = Math.round(new Date().getTime() / 1000);
    const tsYesterday = nowTs - 1 * 24 * 3600;
    const ts7Days = nowTs - 7 * 24 * 3600;
    const ts30Days = nowTs - 30 * 24 * 3600;
    const startFrom = startFromTime
      ? startFromTime
      : resolution == 7200
      ? ts30Days
      : resolution == 1800
      ? ts7Days
      : tsYesterday;

    const startRoundTime = startFrom - (startFrom % resolution);

    let previousPositions = await this.clearingHouseService.allPositionsAtTime(
      trader,
      startRoundTime
    );
    let positions = previousPositions.concat(
      await this.clearingHouseService.allAmmPositionAfter(
        trader,
        startRoundTime
      )
    );
    let tradeData = await this.clearingHouseService.allAmmTradeDataAfter(
      startRoundTime,
      resolution
    );
    let positionMap = new Map<
      number,
      Map<string, [TradeData, Position] | null>
    >(); // Map<startRoundTime, Map<amm, [tradeData, position]>>
    let latestPositionForAmm = new Map<string, Position>();
    let latestTradeDataForAmm = new Map<string, TradeData>();
    let latestTradeDataTimestamp = 0;

    for (let data of tradeData) {
      if (!positionMap.has(data.endTimestamp)) {
        positionMap.set(data.endTimestamp, null);
      }
      for (let position of positions) {
        if (
          data.ammAddress == position.ammAddress &&
          position.timestamp <= data.endTimestamp
        ) {
          if (
            positionMap.has(data.endTimestamp) &&
            positionMap.get(data.endTimestamp)
          ) {
            positionMap
              .get(data.endTimestamp)
              .set(data.ammAddress, [data, position]);
          } else {
            positionMap.set(
              data.endTimestamp,
              new Map([[data.ammAddress, [data, position]]])
            );
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
      let portfolioCollateralValue = BigNumber.from(0);
      let positionCount = 0;

      if (tradeDataAndPositionsAtEndTime) {
        for (let [
          tradeData,
          position,
        ] of tradeDataAndPositionsAtEndTime.values()) {
          totalAccountValue = totalAccountValue.add(
            getTotalAccountValue(
              position,
              toBN(tradeData.closeQuoteAssetReserve),
              toBN(tradeData.closeBaseAssetReserve),
              toBN(tradeData.closeCumulativePremiumFaction)
            )
          );

          portfolioCollateralValue = portfolioCollateralValue.add(
            getPortfolioCollateralValue(
              position,
              toBN(tradeData.closeQuoteAssetReserve),
              toBN(tradeData.closeBaseAssetReserve),
              toBN(tradeData.closeCumulativePremiumFaction)
            )
          );
          positionCount++;
        }
      }

      if (positionCount < previousPositionCount) {
        // Missing trade data for some amm
        for (let ammAddress of latestPositionForAmm.keys()) {
          let processedAmm = tradeDataAndPositionsAtEndTime
            ? Array.from(tradeDataAndPositionsAtEndTime.values()).map(
                (data) => data[0].ammAddress
              )
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
                  toBN(tradeData.closeCumulativePremiumFaction)
                )
              );

              portfolioCollateralValue = portfolioCollateralValue.add(
                getPortfolioCollateralValue(
                  position,
                  toBN(tradeData.closeQuoteAssetReserve),
                  toBN(tradeData.closeBaseAssetReserve),
                  toBN(tradeData.closeCumulativePremiumFaction)
                )
              );
            }
          }
        }
      }

      if (
        tradeDataAndPositionsAtEndTime &&
        tradeDataAndPositionsAtEndTime.size > previousPositionCount
      ) {
        previousPositionCount = tradeDataAndPositionsAtEndTime.size;
      }

      graphDataList.push(
        new GraphData(
          endTimestamp + 1,
          totalAccountValue,
          portfolioCollateralValue,
          positionCount
        ).toObject()
      );
    }

    if (
      graphDataList.length > 0 &&
      graphDataList[graphDataList.length - 1].time < nowTs
    ) {
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
        graphData: graphDataList,
      })
      .toObject();
  }
}