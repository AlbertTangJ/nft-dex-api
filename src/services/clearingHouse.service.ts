import prisma from "../helpers/client";
import { Service } from "typedi";
import { Prisma, Position } from "@prisma/client";

export type PositionEvent = {
  block_number: number | null;
  block_timestamp: number | null;
  contract_address: string | null;
  transaction_hash: string | null;
  log_index: number | null;
  create_time: Date | null;
  create_timestamp: number | null;
  event_trader: string | null;
  event_amm: string | null;
  event_margin: Prisma.Decimal | null;
  event_positionnotional: Prisma.Decimal | null;
  event_exchangedpositionsize: Prisma.Decimal | null;
  event_fee: Prisma.Decimal | null;
  event_positionsizeafter: Prisma.Decimal | null;
  event_realizedpnl: Prisma.Decimal | null;
  event_unrealizedpnlafter: Prisma.Decimal | null;
  event_baddebt: Prisma.Decimal | null;
  event_liquidationpenalty: Prisma.Decimal | null;
  event_spotprice: Prisma.Decimal | null;
  event_fundingpayment: Prisma.Decimal | null;
  event_amount: Prisma.Decimal | null;
};

@Service()
export class ClearingHouseService {
  async createPosition(data: Prisma.PositionCreateInput) {
    return prisma.position.create({
      data
    });
  }

  async createManyPositions(data: Prisma.PositionCreateManyInput[]) {
    return prisma.position.createMany({
      data
    });
  }

  async createManyTradeData(data: Prisma.TradeDataCreateManyInput[]) {
    return prisma.tradeData.createMany({
      data
    });
  }

  async updateTradeData(id: number, data: Prisma.TradeDataUpdateInput) {
    return prisma.tradeData.update({
      where: {
        id
      },
      data
    });
  }

  async currentPosition(trader: string, amm: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        },
        ammAddress: {
          equals: amm.toLowerCase()
        }
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async firstPosition(trader: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        }
      },
      orderBy: {
        timestampIndex: "asc"
      }
    });
  }

  async positionAtTime(trader: string, amm: string, timestamp: number) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        },
        ammAddress: {
          equals: amm.toLowerCase()
        },
        timestamp: {
          lte: timestamp
        }
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async positionAtTimestampIndex(trader: string, amm: string, timestampIndex: number) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        },
        ammAddress: {
          equals: amm.toLowerCase()
        },
        timestampIndex: {
          lte: timestampIndex
        }
      },
      orderBy: {
        timestampIndex: "desc"
      }
    });
  }

  async allAmmPositionAfter(trader: string, timestamp: number) {
    return prisma.position.findMany({
      where: {
        userAddress: {
          equals: trader.toLowerCase()
        },
        timestamp: {
          gte: timestamp
        }
      },
      orderBy: {
        timestampIndex: "asc"
      }
    });
  }

  async allPositions(trader: string) {
    trader = trader.toLowerCase();
    return prisma.$queryRaw<Position[]>`SELECT * FROM api."Position" 
      WHERE ("Position"."ammAddress", "Position"."timestampIndex") in 
      (SELECT "Position"."ammAddress", max("Position"."timestampIndex") 
      FROM api."Position" group by "ammAddress", "userAddress"
      having "userAddress" = ${trader})`;
  }

  async allPositionsAtTime(trader: string, timestamp: number) {
    trader = trader.toLowerCase();
    return prisma.$queryRaw<Position[]>`SELECT * FROM api."Position" 
      WHERE ("Position"."ammAddress", "Position"."timestampIndex") in 
      (SELECT "Position"."ammAddress", max("Position"."timestampIndex") 
      FROM api."Position" 
      WHERE "Position"."timestamp" <= ${timestamp}
      group by "ammAddress", "userAddress"
      having "userAddress" = ${trader})`;
  }

  async latestAmmRecord(address: string) {
    return prisma.amm.findFirst({
      where: {
        address: {
          equals: address.toLowerCase()
        }
      },
      orderBy: {
        updateTime: "desc"
      }
    });
  }

  async positions(limit: number, offset: number) {
    return prisma.position.findMany({
      take: limit,
      skip: offset,
      orderBy: [
        {
          timestampIndex: "asc"
        }
      ]
    });
  }

  async tradeData(amm: string, resolution: number, index: number) {
    return prisma.tradeData.findFirst({
      where: {
        ammAddress: {
          equals: amm.toLowerCase()
        },
        index: {
          equals: index
        },
        resolution: {
          equals: resolution
        }
      },
      orderBy: [
        {
          index: "desc"
        }
      ]
    });
  }

  async previousTradeData(amm: string, resolution: number, index: number) {
    return prisma.tradeData.findFirst({
      where: {
        ammAddress: {
          equals: amm.toLowerCase()
        },
        index: {
          lt: index
        },
        resolution: {
          equals: resolution
        }
      },
      orderBy: [
        {
          index: "desc"
        }
      ]
    });
  }

  async allAmmTradeDataAfter(timestamp: number, resolution: number) {
    return prisma.tradeData.findMany({
      where: {
        startTimestamp: {
          gte: timestamp
        },
        resolution: {
          equals: resolution
        }
      },
      orderBy: [
        {
          startTimestamp: "asc"
        }
      ]
    });
  }

  async ammTradeDataByTime(timestamp: number) {
    return prisma.tradeData.findMany({
      where: {
        startTimestamp: {
          gte: timestamp
        },
        endTimestamp: {
          lt: timestamp
        }
      },
      orderBy: [
        {
          startTimestamp: "asc"
        }
      ]
    });
  }

  async deleteAllAdjustMarginPosition() {
    return prisma.position.deleteMany({
      where: {
        action: "AdjustMargin"
      }
    });
  }

  async allTethBalanceHistory(userAddress: string) {
    return prisma.tethBalanceHistory.findMany({
      where: {
        userAddress: userAddress.toLowerCase()
      },
      orderBy: {
        timestamp: "asc"
      }
    });
  }

  async getLatestTethBalanceHistory(userAddress: string) {
    return prisma.tethBalanceHistory.findFirst({
      where: {
        userAddress: userAddress.toLowerCase()
      },
      orderBy: {
        timestamp: "desc"
      }
    });
  }

  async getTethBalanceHistoryByTime(userAddress: string, timestamp: number) {
    return prisma.tethBalanceHistory.findFirst({
      where: {
        userAddress: userAddress.toLowerCase(),
        timestamp: {
          lte: timestamp
        }
      },
      orderBy: {
        timestamp: "desc"
      }
    });
  }

  async createManyTethBalanceHistory(addresses: string[], amounts: string[]) {
    const data = addresses.map((address, index) => {
      return {
        userAddress: address.toLowerCase(),
        balance: amounts[index],
        timestamp: 1600000000
      };
    });
    return prisma.tethBalanceHistory.createMany({
      data
    });
  }

  async getCurrentPositionHistory(trader: string, amm: string) {
    return prisma.$queryRaw<Position[]>`SELECT * FROM api."Position" 
    WHERE "Position"."batchId" =
    (SELECT "Position"."batchId" FROM api."Position"
    WHERE "userAddress" = ${trader.toLowerCase()}
    AND "ammAddress" = ${amm.toLowerCase()}
    ORDER BY "Position"."timestampIndex" desc
    LIMIT 1
    )
    AND "action" != 'AdjustMargin'
    ORDER BY "Position"."timestampIndex" asc`;
  }

  async getLatestTradeRecord(trader: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: trader.toLowerCase(),
        action: "Trade"
      }
    });
  }

  async getLatestPartialCloseRecord(trader: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: trader.toLowerCase(),
        action: "Trade",
        OR: [
          {
            size: {
              gt: 0
            },
            exchangedPositionSize: {
              lt: 0
            }
          },
          {
            size: {
              lt: 0
            },
            exchangedPositionSize: {
              gt: 0
            }
          }
        ]
      }
    });
  }

  async getTradeHistory(trader: string, limit: number, offset: number) {
    return prisma.position.findMany({
      where: {
        userAddress: trader.toLowerCase()
      },
      orderBy: {
        timestampIndex: "desc"
      },
      take: limit,
      skip: offset
    });
  }

  async getLatestUpdatedPositionBlockNumber() {
    let record = await prisma.aggregateJob.findFirst({});
    return record ? record.positionChangedEventLastUpdatedBlockNumber : 0;
  }
}
