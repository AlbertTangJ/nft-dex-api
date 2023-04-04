import { PrismaClient } from "@prisma/client";
import prisma from "../helpers/client";
import { Service } from "typedi";
import { utils } from "ethers";
import BigNumber from "bignumber.js";
import { LeaderBoardService } from "./leaderboard.service";

type ReferralTradeVol = { codeOwner: string, referralCode: string, reffedUser: string, tradeVol: string }
type TradeVol = { codeOwner: string, referralCode: string, reffedUser: string, tradeVol: string }

@Service()
export class PointsService {
    prismaClient: PrismaClient;
    constructor() {
        this.prismaClient = new PrismaClient();
    }

    async userTradeVol(user: string) {
        // let rewards = []
        let tradeVol: TradeVol[] = await this.prismaClient.$queryRaw<TradeVol[]>`SELECT "userAddress", sum("positionNotional") AS "tradeVol" FROM "Position" WHERE action='Trade' AND "userAddress" = ${user.toLocaleLowerCase()} GROUP BY "userAddress";`;
        if (tradeVol.length > 0) {
            return tradeVol.shift()
        }
        return null
    }

    async userReferringPoints(user: string) {
        let result: ReferralTradeVol[] = await this.prismaClient.$queryRaw<ReferralTradeVol[]>`SELECT u."userAddress" AS "codeOwner", r."referralCode" AS code, r."userAddress" AS "reffedUser", s.trade_vol as "tradeVol" 
            FROM "UserInfo" AS u 
            LEFT JOIN "ReferralEvents" AS r 
            ON u."referralCode" = r."referralCode"
            LEFT JOIN (SELECT "userAddress", sum("positionNotional") AS trade_vol FROM "Position" WHERE action='Trade' GROUP BY "userAddress") s
            ON r."userAddress" = s."userAddress"
            WHERE u."userAddress" = ${user}`;
        return result
    }

    async userReferredPoints(user: string) {
        let result = await prisma.referralEvents.findFirst({ where: { userAddress: user.toLowerCase() } });
        return result;
    }


    async userPoints(user: string) {
        let userTradeResult = await this.userTradeVol(user);
        let unitEth = BigNumber(utils.parseEther("1").toString())
        let limitEth = BigNumber(utils.parseEther("5").toString())
        let referredReward = 0.02
        let referringReward = 0.03
        if (userTradeResult == null) {
            return {
                rank: 0,
                multiplier: 0,
                tradeVol: { vol: 0, points: 0 },
                referral: {
                    referralSelfRewardPoints: 0,
                    referringRewardPoints: 0
                }
            }
        }
        let userCurrentTradeVol = BigNumber(userTradeResult.tradeVol).dividedBy(Math.pow(10, 18));
        let tradeVolNumber = userCurrentTradeVol.multipliedBy(10).toFixed(2);
        // 找到推荐当前用户的人
        let userReferredResult = await this.userReferredPoints(user);
        // null 当前用户没有推荐人 ，当前用户的2% 奖励 是需要看 当前用户的推荐人，有没有超过5个eth
        if (userReferredResult == null) {
            referredReward = 0
        } else {
            let code = userReferredResult.referralCode
            let userInfo = await prisma.userInfo.findFirst({ where: { referralCode: code } })
            let codeOwner = userInfo.userAddress;
            let referredUserTradeVol = await this.userTradeVol(codeOwner);

            let referredUserTradeVolNumber = new BigNumber(referredUserTradeVol.tradeVol);
            if (referredUserTradeVolNumber.lt(limitEth)) {
                referredReward = 0
            }
        }
        // 当前用户的成交量 * referredReward = 当前用户的referred奖励
        let referralSelfRewardPoints = referredReward * parseFloat(tradeVolNumber);
        // 
        let referringRewardPoints = 0
        let userReferralPoints = await this.userReferringPoints(user);
        for (let i = 0; i < userReferralPoints.length; i++) {
            const points = userReferralPoints[i].tradeVol;
            if (points != null) {
                let pointsBig = BigNumber(points)
                if (pointsBig.gte(limitEth)) {
                    let currentPoints = BigNumber(points).dividedBy(Math.pow(10, 18)).multipliedBy(10).toFixed(2);
                    referringRewardPoints += parseFloat(currentPoints) * referringReward
                }
            }
        }
        let multiplierNumber = 1
        let leaderBoardService = new LeaderBoardService()
        let leaderBoard = await leaderBoardService.fetchRangingByUser(user, 3)
        let rank = leaderBoard.rank
        if (rank != null) {
            let multiplierResult = await prisma.rank_multiplier.findFirst({ where: { start_rank: { lte: parseInt(rank) }, end_rank: { gte: parseInt(rank) } } })
            if (multiplierResult != null) {
                multiplierNumber = parseFloat(multiplierResult.multiplier.toString())
            }
        }

        // // console.log(userReferralPoints)
        let result = {
            rank: rank,
            multiplier: multiplierNumber,
            tradeVol: { vol: parseFloat(userCurrentTradeVol.toFixed(2)), points: parseFloat(tradeVolNumber) },
            referral: {
                referralSelfRewardPoints: referralSelfRewardPoints,
                referringRewardPoints: referringRewardPoints
            }
        }
        return result
    }
}