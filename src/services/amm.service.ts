import { AmmFundingPayment, AmmReserve, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime";
import { Service } from "typedi";
import prisma from "../helpers/client";


@Service()
export class AmmService {
  async amm(address: string) {
    return prisma.amm.findFirst({
      where: {
        address: {
          equals: address,
          mode: "insensitive",
        },
      },
    });
  }

  async create(session: Prisma.AmmCreateInput) {
    return prisma.amm.create({
      data: session,
    });
  }

  async updateByAddress(address: string, data: Prisma.AmmUpdateInput) {
    return prisma.amm.updateMany({
      where: {
        address: {
          equals: address,
          mode: "insensitive",
        },
      },
      data,
    });
  }

  async allAmms() {
    return prisma.amm.findMany({
      orderBy: {
        sortOrder: "asc",
      },
    });
  }

  async createManyAmmReserve(data: Prisma.AmmReserveCreateManyInput[]) {
    return prisma.ammReserve.createMany({
      data: data,
    });
  }

  async createManyFundingPayment(
    data: Prisma.AmmFundingPaymentCreateManyInput[]
  ) {
    return prisma.ammFundingPayment.createMany({
      data: data,
    });
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

  async firstAmmReserves(address: string) {
    return prisma.ammReserve.findFirst({
      where: {
        ammAddress: {
          equals: address,
        },
      },
      orderBy: {
        timestampIndex: "asc",
      },
    });
  }

  async latestAmmReserves(address: string) {
    return prisma.ammReserve.findFirst({
      where: {
        ammAddress: {
          equals: address,
        },
      },
      orderBy: {
        timestampIndex: "desc",
      },
    });
  }

  async ammReservesAfter(address: string, timestamp) {
    return prisma.ammReserve.findMany({
      where: {
        ammAddress: {
          equals: address,
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

  async ammReservesAtTime(address: string, timestamp) {
    return prisma.ammReserve.findFirst({
      where: {
        ammAddress: {
          equals: address,
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

  async allLatestAmmReserves() {
    return prisma.$queryRaw<AmmReserve[]>`SELECT * FROM api."AmmReserve" 
   where ("AmmReserve"."ammAddress", "AmmReserve"."timestampIndex") in 
   (SELECT "AmmReserve"."ammAddress", max("AmmReserve"."timestampIndex") 
   FROM api."AmmReserve" 
   group by "ammAddress")`;
  }

  async allAmmReservesByTime(timestamp: number) {
    return prisma.$queryRaw<AmmReserve[]>`SELECT * FROM api."AmmReserve" 
   where ("AmmReserve"."ammAddress", "AmmReserve"."timestampIndex") in 
   (SELECT "AmmReserve"."ammAddress", max("AmmReserve"."timestampIndex") 
   FROM api."AmmReserve"
   where timestamp <= ${timestamp} 
   group by "ammAddress")`;
  }

  async allLatestFundingPayments() {
    return prisma.$queryRaw<
      AmmFundingPayment[]
    >`SELECT * FROM api."AmmFundingPayment" 
    where ("AmmFundingPayment"."ammAddress", "AmmFundingPayment"."timestampIndex") in 
    (SELECT "AmmFundingPayment"."ammAddress", max("AmmFundingPayment"."timestampIndex") 
    FROM api."AmmFundingPayment" 
    group by "ammAddress")`;
  }

  async allFundingPaymentsByTime(timestamp: number) {
    return prisma.$queryRaw<
      AmmFundingPayment[]
    >`SELECT * FROM api."AmmFundingPayment" 
    where ("AmmFundingPayment"."ammAddress", "AmmFundingPayment"."timestampIndex") in 
    (SELECT "AmmFundingPayment"."ammAddress", max("AmmFundingPayment"."timestampIndex") 
    FROM api."AmmFundingPayment"
    where timestamp <= ${timestamp} 
    group by "ammAddress")`;
  }

  async ammReserveByTimestampIndex(
    address: string,
    timestampIndex: Prisma.Decimal
  ) {
    return prisma.ammReserve.findFirst({
      where: {
        ammAddress: {
          equals: address,
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

  async ammFundingPaymentByTimestampIndex(
    address: string,
    timestampIndex: Prisma.Decimal
  ) {
    return prisma.ammFundingPayment.findFirst({
      where: {
        ammAddress: {
          equals: address,
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

  async ammFundingPaymentsInRange(
    address: string,
    startTimestampIndex: Prisma.Decimal,
    endTimestampIndex: Prisma.Decimal
  ) {
    return prisma.ammFundingPayment.findMany({
      where: {
        ammAddress: {
          equals: address,
        },
        timestampIndex: {
          gte: startTimestampIndex,
          lte: endTimestampIndex,
        },
      },
      orderBy: {
        timestampIndex: "desc",
      },
    });
  }

  async ammFundingPaymentsBefore(
    address: string,
    timestampIndex: Decimal
  ) {
    return prisma.ammFundingPayment.findMany({
      where: {
        ammAddress: {
          equals: address,
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
}
