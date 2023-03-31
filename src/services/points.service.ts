import { PrismaClient } from "@prisma/client";
import { Service } from "typedi";
import { format } from 'date-fns'
import { uuidv4 } from "@firebase/util";

type TradeVol = { codeOwner: string, referralCode: string, reffedUser: string, tradeVol: string }

@Service()
export class PointsService {
    prismaClient: PrismaClient;
    constructor() {
        this.prismaClient = new PrismaClient();
    }

    async userTradeVol(user: string) {
        let result: TradeVol = await this.prismaClient.$queryRaw<TradeVol>`SELECT u."userAddress" AS "codeOwner", r."referralCode" AS code, r."userAddress" AS "reffedUser", s.trade_vol as "tradeVol" 
            FROM "UserInfo" AS u 
            LEFT JOIN "ReferralEvents" AS r 
            ON u."referralCode" = r."referralCode"
            LEFT JOIN (SELECT "userAddress", sum("positionNotional") AS trade_vol FROM "Position" WHERE action='Trade' GROUP BY "userAddress") s
            ON r."userAddress" = s."userAddress"
            WHERE u."userAddress" = ${user}`;

        console.log(result)
        // let rewards = []
        // let lastUpdateTime = await this.prismaClient.$queryRaw`SELECT update_timestamp FROM public.rewards ORDER BY update_timestamp DESC LIMIT 1`;
    }
}