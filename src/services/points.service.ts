import { PrismaClient } from "@prisma/client";
import prisma from "../helpers/client";
import { Service } from "typedi";
import { utils } from "ethers";
import BigNumber from "bignumber.js";

type ReferralTradeVol = { codeOwner: string, referralCode: string, reffedUser: string, tradeVol: string, username: string }
const syncId: number = isNaN(Number(process.env.SYNC_ID)) ? 0 : Number(process.env.SYNC_ID);

@Service()
export class PointsService {
    prismaClient: PrismaClient;
    constructor() {
        this.prismaClient = new PrismaClient();
    }

    async userTradeVol(user: string) {
        let currentSession = await prisma.session.findFirst({ where: { sessionEnd: 0 } })
        let result: any[] = await this.prismaClient.$queryRaw`SELECT uif.username AS username, uif."isBan" AS "isBan", uif."hasTraded" AS "hasTraded", uif."isInputCode" AS "isInputCode", plb."userAddress" AS "userAddress", "convergePoints", "convergeVol", "referralSelfRewardPoints", "referringRewardPoints", "tradeVol", "tradePoints", "eligibleCount", "ogPoints", total, "tradeCount"
        FROM api."UserInfo" uif 
        LEFT JOIN api."PointsLeaderBoard" plb 
        ON uif."userAddress" = plb."userAddress"
        WHERE uif."userAddress" = ${user.toLowerCase()} AND plb.session = ${currentSession.round} AND plb."sessionStart" = ${currentSession.sessionStart} 
        ORDER BY plb."total" DESC`
        if (result.length > 0) {
            return result.shift()
        }

        return {}
    }

    // 获取当前用户输入了谁的code
    async fetchReferringUser(user: string) {
        let refererResult = await prisma.referralEvents.findFirst({ where: { userAddress: user.toLowerCase() } })
        if (refererResult != null) {
            let code = refererResult.referralCode
            let userInfo = await prisma.userInfo.findFirst({ where: { referralCode: code } })
            if (userInfo != null) {
                return { username: userInfo.username, userAddress: userInfo.userAddress };
            }
        }
        return {};
    }

    async userReferringPoints(user: string) {
        let result: ReferralTradeVol[] = await this.prismaClient.$queryRaw<ReferralTradeVol[]>`SELECT reu."username" AS username, u."userAddress" AS "codeOwner", r."referralCode" AS code, r."userAddress" AS "reffedUser", u."totalTradingVolume" AS "tradeVol", u."netConvergenceVolume" AS "convergeVol"
            FROM "UserInfo" AS u 
            LEFT JOIN "ReferralEvents" AS r 
            ON u."referralCode" = r."referralCode"
            LEFT JOIN "UserInfo" AS reu
			ON r."userAddress" = reu."userAddress"
            WHERE u."userAddress" = ${user.toLowerCase()} AND u."totalTradingVolume" > 0`;
        return result
    }

    async userReferredPoints(user: string) {
        let result = await prisma.referralEvents.findFirst({ where: { userAddress: user.toLowerCase() } });
        return result;
    }

    async pointsLeaderBoard(show: string) {
        let currentSession = await prisma.session.findFirst({ where: { sessionEnd: 0 } })
        let rankNo = 0
        let pointsLeaderBoardList = []
        let results: any[] = await this.prismaClient.$queryRaw`SELECT uif.username AS username, uif."isBan" AS "isBan", 
         uif."hasTraded" AS "hasTraded", 
         uif."isInputCode" AS "isInputCode",
         plb."tradeCount" AS "tradeCount", 
         plb."userAddress" AS "userAddress", 
         plb."convergePoints" AS "convergePoints",
         plb."convergeVol" AS "convergeVol", 
         plb."referralSelfRewardPoints" AS "referralSelfRewardPoints",
         plb."referringRewardPoints" AS "referringRewardPoints", 
         plb."tradeVol" AS "tradeVol", 
         plb."tradePoints" AS "tradePoints", 
         plb."eligibleCount" AS "eligibleCount",
         plb."ogPoints" AS "ogPoints", 
         plb.total AS total
        FROM api."UserInfo" uif 
        LEFT JOIN api."PointsLeaderBoard" plb 
        ON uif."userAddress" = plb."userAddress"
        WHERE plb.session = ${currentSession.round} AND plb."sessionStart" = ${currentSession.sessionStart}
        ORDER BY plb."total" DESC`
        for (let index = 0; index < results.length; index++) {
            const item = results[index];
            // console.log(item)
            let userAddress = item.userAddress;
            let tradeVolPoints = item.tradePoints;
            let referralPoints = BigNumber(item.referringRewardPoints.toString()).plus(item.referralSelfRewardPoints.toString()).toString();
            let convergePoints = item.convergePoints;
            let total = item.total
            // console.log(`${tradeVolPoints} + ${referralPoints} + ${convergePoints} = ${total}`)
            let data = { total: total.toFixed(1), multiplier: 1, username: item.username, userAddress: userAddress, isBan: item.isBan, tradeVol: item.tradeVol }
            if (show != null) {
                let showData = show.split(",")
                if (showData.indexOf("tradeVol") != -1) {
                    data['tradeVolPoints'] = parseFloat(tradeVolPoints)
                }

                if (showData.indexOf('referral') != -1) {
                    data['referralPoints'] = parseFloat(referralPoints)
                }

                if (showData.indexOf('converge') != -1) {
                    data['convergePoints'] = parseFloat(convergePoints)
                }
            }
            pointsLeaderBoardList.push(data)
        }
        pointsLeaderBoardList.sort(function (a, b) { return b.total - a.total })

        for (let i = 0; i < pointsLeaderBoardList.length; i++) {
            const element = pointsLeaderBoardList[i];
            let isNext = element.isBan ? 0 : 1
            let rank = rankNo + isNext
            let tradeVolBigNumber = BigNumber(element.tradeVol)
            if (tradeVolBigNumber.gte(BigNumber(utils.parseEther("5").toString()))) {
                element.rank = element.isBan ? -1 : rank
            } else {
                element.rank = 0
            }
            let multiplierResult = await prisma.rankMultiplier.findFirst({ where: { start_rank: { lte: element.rank }, end_rank: { gte: element.rank } } })
            if (multiplierResult != null) {
                let multiplier = parseFloat(multiplierResult.multiplier.toString())
                element.multiplier = multiplier
                element.total = parseFloat((element.total * multiplier).toFixed(1))
            }
            rankNo = rank

        }
        return pointsLeaderBoardList
    }

    async calculateUserPoints(user: string) {
        let userTradeResult = await this.userTradeVol(user);
        let unitEth = BigNumber(utils.parseEther("1").toString())
        let limitEth = BigNumber(utils.parseEther("5").toString())
        let referredReward = 0.02
        let referringReward = 0.03
        let isInputCode = false
        let isTrade = false
        if (userTradeResult == null) {
            return {
                rank: 0,
                multiplier: 0,
                userAddress: null,
                username: null,
                referralCode: "",
                enterReferralUser: [],
                eligibleCount: 0,
                isInputCode: isInputCode,
                isTrade: isTrade,
                tradeVol: { vol: 0, points: 0 },
                referral: {
                    referralSelfRewardPoints: 0,
                    referringRewardPoints: 0
                }, converge: {
                    points: 0,
                    vol: 0
                }
            }
        }
        let userCurrentConvergeBigNumber = BigNumber(userTradeResult.convergeVol.toString())
        let userCurrentTradeVolBigNumber = BigNumber(userTradeResult.tradeVol.toString())
        let userCurrentTradeVol = userCurrentTradeVolBigNumber.dividedBy(unitEth);
        let userCurrentConvergeVol = userCurrentConvergeBigNumber.dividedBy(unitEth);
        let tradeVolNumber = userCurrentTradeVol.multipliedBy(10).toFixed(1);
        let convergeVolNumber = userCurrentConvergeVol.multipliedBy(10).toFixed(1);
        isInputCode = userTradeResult.isInputCode
        isTrade = userTradeResult.hasTraded
        // 找到推荐当前用户的人
        
        let userReferredResult = await this.userReferredPoints(user);
        // 先看当前用户够不够5个eth
        // null 当前用户没有推荐人 ，当前用户的2% 奖励 是需要看 当前用户的推荐人，有没有超过5个eth
        if (userReferredResult == null || userCurrentTradeVolBigNumber.lte(limitEth)) {
            referredReward = 0
        } else {
            let code = userReferredResult.referralCode
            let userInfo = await prisma.userInfo.findFirst({ where: { referralCode: code } })
            let codeOwner = userInfo.userAddress;
            let referredUserTradeVol = await this.userTradeVol(codeOwner);
            let referredUserTradeVolNumber = new BigNumber(referredUserTradeVol.tradeVol.toString());
            if (referredUserTradeVolNumber.lt(limitEth)) {
                referredReward = 0
            }
        }

        // 当前用户的成交量 * referredReward = 当前用户的referred奖励 , 当前用户需要trade vol >= 5
        let referralSelfRewardPoints = (referredReward * parseFloat(tradeVolNumber) * 10);
        // 
        let referringRewardPoints = 0
        let eligibleCount = 0

        if (userCurrentTradeVolBigNumber.gte(limitEth)) {
            let userReferralPoints = await this.userReferringPoints(user);
            for (let i = 0; i < userReferralPoints.length; i++) {
                const points = userReferralPoints[i].tradeVol;
                // let username = userReferralPoints[i].username
                // let userAddress = userReferralPoints[i].reffedUser
                if (points != null) {
                    let pointsBig = BigNumber(points)
                    if (pointsBig.gte(limitEth)) {
                        let currentPoints = pointsBig.dividedBy(unitEth).toFixed(1);
                        referringRewardPoints += (parseFloat(currentPoints) * referringReward * 10)
                        eligibleCount += 1
                    }
                }
            }
        }

        let convergeVolNumberPoints = parseFloat(convergeVolNumber) > 0 ? parseFloat(convergeVolNumber) : 0

        // console.log(leaderBoard)
        let multiplierNumber = 1
        // console.log(userReferralPoints)
        let enterReferralUser = await this.fetchReferringUser(user);
        let total = (parseFloat(tradeVolNumber) + referringRewardPoints + referralSelfRewardPoints + convergeVolNumberPoints) * multiplierNumber
        let result = {
            userAddress: userTradeResult.userAddress,
            username: userTradeResult.username,
            multiplier: multiplierNumber,
            referralCode: userTradeResult.referralCode,
            total: total,
            isInputCode: isInputCode,
            isTrade: isTrade,
            enterReferralUser: enterReferralUser,
            eligibleCount: eligibleCount,
            tradeVol: { vol: userCurrentTradeVol.toString(), points: parseFloat(tradeVolNumber) },
            referral: {
                referralSelfRewardPoints: parseFloat(referralSelfRewardPoints.toFixed(1)),
                referringRewardPoints: parseFloat(referringRewardPoints.toFixed(1))
            },
            converge: {
                points: convergeVolNumberPoints,
                val: userCurrentConvergeVol.toString()
            }
        }

        return result
    }

    async fetchUserRank(user: string, show: string) {
        let userOrders = await this.pointsLeaderBoard(show);
        let rank = null
        for (let i = 0; i < userOrders.length; i++) {
            const userOrder = userOrders[i];
            if (userOrder.userAddress.toLowerCase() == user.toLowerCase()) {
                rank = userOrder
            }
        }

        return rank
    }

    async userPoints(user: string, show: string) {
        let points = await this.calculateUserPoints(user);
        let rankData = await this.fetchUserRank(user, show);
        if (rankData == null) {
            return {
                rank: 0,
                multiplier: 0,
                total: 0,
                userAddress: points.userAddress,
                username: points.username,
                tradeVol: { vol: 0, points: 0 },
                referral: {
                    referralSelfRewardPoints: 0,
                    referringRewardPoints: 0
                }, converge: {
                    points: 0,
                    val: 0
                },
                referralUser: points.enterReferralUser,
                eligibleCount: points.eligibleCount,
                referralCode: points.referralCode,
                isInputCode: points.isInputCode,
                isTrade: points.isTrade,
                isBan: false
            }
        }
        let result = {
            rank: rankData.rank,
            multiplier: rankData.multiplier,
            total: rankData.total,
            userAddress: points.userAddress,
            username: points.username,
            referralUser: points.enterReferralUser,
            eligibleCount: points.eligibleCount,
            referralCode: points.referralCode,
            isBan: rankData.isBan,
            isInputCode: points.isInputCode,
            isTrade: points.isTrade,
        }

        let showData = show.split(",")
        if (showData.indexOf("tradeVol") != -1) {
            result['tradeVol'] = points.tradeVol
        }
        if (showData.indexOf('referral') != -1) {
            result['referral'] = points.referral
        }
        if (showData.indexOf('og') != -1) {
            result['og'] = 0
        }
        if (showData.indexOf('converge') != -1) {
            result['converge'] = points.converge
        }

        return result
    }
}