import prisma from "../helpers/client";
import { Service } from "typedi";
import { CompetitionSeason1, Position } from "@prisma/client";

const syncId: number = isNaN(Number(process.env.SYNC_ID)) ? 0 : Number(process.env.SYNC_ID);

@Service()
export class CompetitionService {
  async getAbsPnlLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY "absolutePnl" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."absolutePnl" as "pnl", 
    TRUE as "eligible"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."tradedVolume" >= 5000000000000000000
    ORDER BY "absolutePnl" DESC
    LIMIT 100
    OFFSET ${(page - 1) * 100}
    `;
  }

  async getNetConvergenceVolLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY cs."netConvergenceVolume" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."netConvergenceVolume" as "netConvergenceVol", 
    TRUE as "eligible"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."tradedVolume" >= 5000000000000000000
    ORDER BY cs."netConvergenceVolume" DESC
    LIMIT 100
    OFFSET ${(page - 1) * 100}
    `;
  }

  async getRealisedPnlLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY cs."roi" DESC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."roi" * 100 as "pnl", 
    TRUE as "eligible"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."tradedVolume" >= 5000000000000000000
    ORDER BY cs."roi" DESC
    LIMIT 100
    OFFSET ${(page - 1) * 100}
    `;
  }

  async getTopLoserLeaderboard(page: number = 1) {
    if (page < 1) {
      page = 1;
    }
    return prisma.$queryRaw<any[]>`
    SELECT row_number() OVER (ORDER BY "absolutePnl" ASC) AS "rank", 
    "username", 
    cs."userAddress", 
    cs."absolutePnl" as "pnl", 
    TRUE as "eligible"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."tradedVolume" >= 5000000000000000000
    ORDER BY "absolutePnl" ASC
    LIMIT 100
    OFFSET ${(page - 1) * 100}
    `;
  }

  async getPersonalLeaderboardRecord(userAddress: string) {
    return prisma.$queryRaw<any[]>`
    SELECT u."username", cs."userAddress", cs."absolutePnl", cs."netConvergenceVolume", cs."roi" * 100 as "roi", cs."tradedVolume"
    FROM api."CompetitionSeason1" cs 
    LEFT JOIN api."UserInfo" u 
    ON u."userAddress" = cs."userAddress"
    WHERE cs."updatedIndex" = (SELECT "updatedIndex" FROM api."CompetitionSeason1" ORDER BY "updatedIndex" DESC LIMIT 1)
    AND cs."userAddress" = ${userAddress.toLowerCase()}
    `;
  }
}
