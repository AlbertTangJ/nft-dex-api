import prisma from "../helpers/client";
import { Service } from "typedi";
import { Prisma, Position } from "@prisma/client";

export type PositionEvent = {
  block_number: number | null
  block_timestamp: number | null
  contract_address: string | null
  transaction_hash: string | null
  log_index: number | null
  create_time: Date | null
  create_timestamp: number | null
  event_trader: string | null
  event_amm: string | null
  event_margin: Prisma.Decimal | null
  event_positionnotional: Prisma.Decimal | null
  event_exchangedpositionsize: Prisma.Decimal | null
  event_fee: Prisma.Decimal | null
  event_positionsizeafter: Prisma.Decimal | null
  event_realizedpnl: Prisma.Decimal | null
  event_unrealizedpnlafter: Prisma.Decimal | null
  event_baddebt: Prisma.Decimal | null
  event_liquidationpenalty: Prisma.Decimal | null
  event_spotprice: Prisma.Decimal | null
  event_fundingpayment: Prisma.Decimal | null
  event_amount: Prisma.Decimal | null
}

@Service()
export class ClearingHouseService {

  async currentPosition(trader: string, amm: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader,
          mode: "insensitive",
        },
        ammAddress: {
          equals: amm,
          mode: "insensitive",
        },
      },
      orderBy: {
        timestampIndex: "desc",
      },
    });
  }

  async firstPosition(trader: string) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader,
          mode: "insensitive",
        },
      },
      orderBy: {
        timestampIndex: "asc",
      },
    });
  }

  async positionAtTime(trader: string, amm: string, timestamp: number) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader,
          mode: "insensitive",
        },
        ammAddress: {
          equals: amm,
          mode: "insensitive",
        },
        timestamp: {
          lte: timestamp,
        },
      },
      orderBy: {
        timestampIndex: "desc",
      },
    });
  }

  async positionAtTimestampIndex(trader: string, amm: string, timestampIndex: number) {
    return prisma.position.findFirst({
      where: {
        userAddress: {
          equals: trader,
          mode: "insensitive",
        },
        ammAddress: {
          equals: amm,
          mode: "insensitive",
        },
        timestampIndex: {
          lte: timestampIndex,
        },
      },
      orderBy: {
        timestampIndex: "desc",
      },
    });
  }

  async allAmmPositionAfter(trader: string, timestamp: number) {
    return prisma.position.findMany({
      where: {
        userAddress: {
          equals: trader,
          mode: "insensitive",
        },
        timestamp: {
          gte: timestamp,
        },
      },
      orderBy: {
        timestampIndex: "asc",
      },
    });
  }

  async allPositions(trader: string) {
    return prisma.$queryRaw<Position[]>`SELECT * FROM api."Position" 
      where ("Position"."ammAddress", "Position"."timestampIndex") in 
      (SELECT "Position"."ammAddress", max("Position"."timestampIndex") 
      FROM api."Position" group by "ammAddress", "userAddress"
      having "userAddress" = ${trader.toLowerCase()})`;
  }

  async allPositionsAtTime(trader: string, timestamp: number) {
    return prisma.$queryRaw<Position[]>`SELECT * FROM api."Position" 
      where ("Position"."ammAddress", "Position"."timestampIndex") in 
      (SELECT "Position"."ammAddress", max("Position"."timestampIndex") 
      FROM api."Position" 
      where "Position"."timestamp" <= ${timestamp}
      group by "ammAddress", "userAddress"
      having "userAddress" = ${trader.toLowerCase()})`;
  }

  async latestAmmRecord(address: string) {
    return prisma.amm.findFirst({
      where: {
        address: {
          equals: address,
          mode: "insensitive",
        },
      },
      orderBy: {
        updateTime: "desc",
      },
    });
  }

  async positions(limit: number, offset: number) {
    return prisma.position.findMany({
      take: limit,
      skip: offset,
      orderBy: [
        {
          timestampIndex: "asc",
        },
      ],
    });
  }

  async tradeData(amm: string, resolution: number, index: number) {
    return prisma.tradeData.findFirst({
      where: {
        ammAddress: {
          equals: amm,
          mode: "insensitive",
        },
        index: {
          equals: index,
        },
        resolution: {
          equals: resolution,
        },
      },
      orderBy: [
        {
          index: "desc",
        },
      ],
    });
  }

  async previousTradeData(amm: string, resolution: number, index: number) {
    return prisma.tradeData.findFirst({
      where: {
        ammAddress: {
          equals: amm,
          mode: "insensitive",
        },
        index: {
          lt: index,
        },
        resolution: {
          equals: resolution,
        },
      },
      orderBy: [
        {
          index: "desc",
        },
      ],
    });
  }

  async allAmmTradeDataAfter(timestamp: number, resolution: number) {
    return prisma.tradeData.findMany({
      where: {
        startTimestamp: {
          gte: timestamp,
        },
        resolution: {
          equals: resolution,
        },
      },
      orderBy: [
        {
          startTimestamp: "asc",
        },
      ],
    });
  }

  async ammTradeDataByTime(timestamp: number) {
    return prisma.tradeData.findMany({
      where: {
        startTimestamp: {
          gte: timestamp,
        },
        endTimestamp: {
          lt: timestamp,
        },
      },
      orderBy: [
        {
          startTimestamp: "asc",
        },
      ],
    });
  }

  async deleteAllAdjustMarginPosition() {
    return prisma.position.deleteMany({
      where: {
        action: "AdjustMargin",
      },
    });
  }

  async positionEventsAfter(
    startAfterBlock: number,
    limit: number,
    offset: number,
    blockLimit: number
  ) {
    return prisma.$queryRaw<PositionEvent[]>`select * from (
      (select block_number as "block_number", 
      block_timestamp as "block_timestamp", 
      transaction_hash as "transaction_hash",
      contract_address as "contract_address",
      log_index as "log_index",
      create_time as "create_time",
      create_timestamp as "create_timestamp",
      event_fundingpayment as "event_fundingpayment",
      event_amm as "event_amm",
      event_trader as "event_trader",
      
      event_margin as "event_margin",
      event_positionnotional as "event_positionnotional",
      event_exchangedpositionsize as "event_exchangedpositionsize",
      event_fee as "event_fee",
      event_positionsizeafter as "event_positionsizeafter",
      event_realizedpnl as "event_realizedpnl",
      event_unrealizedpnlafter as "event_unrealizedpnlafter",
      event_baddebt as "event_baddebt",
      event_liquidationpenalty as "event_liquidationpenalty",
      event_spotprice as "event_spotprice",
      
      NULL as "event_amount"
      
      from public.clearinghouse_positionchanged)
      UNION ALL 
      (select block_number as "block_number", 
      block_timestamp as "block_timestamp", 
      transaction_hash as "transaction_hash",
      contract_address as "contract_address",
      log_index as "log_index",
      create_time as "create_time",
      create_timestamp as "create_timestamp",
      event_fundingpayment as "event_fundingpayment",
      event_amm as "event_amm",
      event_sender as "event_trader",
      
      NULL as "event_margin",
      NULL as "event_positionnotional",
      NULL as "event_exchangedpositionsize",
      NULL as "event_fee",
      NULL as "event_positionsizeafter",
      NULL as "event_realizedpnl",
      NULL as "event_unrealizedpnlafter",
      NULL as "event_baddebt",
      NULL as "event_liquidationpenalty",
      NULL as "event_spotprice",
      
      event_amount as "event_amount"
      
      from public.clearinghouse_marginchanged)
      ) results
      WHERE block_number > ${startAfterBlock}
      AND block_number <= ${blockLimit}
      ORDER BY block_timestamp ASC, log_index ASC
      limit ${limit}
      offset ${offset}
      `;
  }
  
}
