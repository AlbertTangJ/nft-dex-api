import { BigNumber, utils } from "ethers";
import { Amm, Position } from "prisma/generated/dataClient";
import { toBN } from "./decimalHelper";

export class PositionDetail {
  constructor(
    private amm: Amm,
    private position: Position,
    private unrealizedPnl: BigNumber,
    private accumulatedFundingPayment: BigNumber,
    private marginRatio: BigNumber,
    private positionNotional: BigNumber,
    private remainMargin: BigNumber
  ) {}

  getAmm() {
    return this.amm;
  }

  toObject() {
    let entryPrice = toBN(this.position.openNotional)
      .mul(utils.parseEther("1"))
      .div(toBN(this.position.size).abs());
    let liquidationPrice = BigNumber.from(0);
    if (this.position.size.eq(0)) {
      liquidationPrice = BigNumber.from(0);
    } else if (this.position.size.lt(0)) {
      // SHORT
      liquidationPrice = entryPrice.mul(utils.parseEther("1")).div(
        utils
          .parseEther("1")
          .add(toBN(this.amm.maintenanceMarginRatio))
          .sub(this.marginRatio)
          .add(
            this.unrealizedPnl
              .mul(utils.parseEther("1"))
              .div(this.positionNotional)
          )
      );
    } else {
      // LONG
      liquidationPrice = entryPrice.mul(utils.parseEther("1")).div(
        utils
          .parseEther("1")
          .sub(toBN(this.amm.maintenanceMarginRatio))
          .add(this.marginRatio)
          .sub(
            this.unrealizedPnl
              .mul(utils.parseEther("1"))
              .div(this.positionNotional)
          )
      );
    }

    let leverage = this.remainMargin.isZero()
      ? utils.parseEther("1")
      : this.positionNotional.mul(utils.parseEther("1")).div(this.remainMargin);

    return {
      pair: this.amm.name,
      currentPrice: this.amm.quoteAssetReserve
        .mul(utils.parseEther("1").toString())
        .div(this.amm.baseAssetReserve)
        .round()
        .toString(),
      initMarginRatio: this.amm.initMarginRatio.toString(),
      maintenanceMarginRatio: this.amm.maintenanceMarginRatio.toString(),
      ammAddress: this.position.ammAddress,
      userAddress: this.position.userAddress,
      margin: this.position.margin.toString(),
      openNotional: this.position.positionNotional.toString(),
      size: this.position.size.toString(),
      timestamp: this.position.timestamp,
      timestampIndex: this.position.timestampIndex.toString(),
      positionNotional: this.positionNotional.toString(),
      unrealizedPnl: this.unrealizedPnl.toString(),
      totalPnL: this.unrealizedPnl
        .sub(this.accumulatedFundingPayment)
        .toString(),
      accumulatedFundingPayment: this.accumulatedFundingPayment
        .mul(-1)
        .toString(),
      marginRatio: this.marginRatio.toString(),
      remainMargin: this.remainMargin.toString(),
      currentNotional: this.remainMargin.add(this.unrealizedPnl).toString(),
      entryPrice: entryPrice.toString(),
      liquidationPrice: liquidationPrice.toString(),
      leverage: leverage.toString()
    };
  }
}
