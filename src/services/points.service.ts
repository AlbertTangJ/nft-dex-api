import { PrismaClient } from "@prisma/client";
import prisma from "../helpers/client";
import { Service } from "typedi";
import { utils } from "ethers";
import BigNumber from "bignumber.js";

type ReferralTradeVol = { codeOwner: string, referralCode: string, reffedUser: string, tradeVol: string, username: string }

@Service()
export class PointsService {
    prismaClient: PrismaClient;
    constructor() {
        this.prismaClient = new PrismaClient();
    }

    async userTradeVol(user: string) {
        let result = await prisma.userInfo.findFirst({ where: { userAddress: user.toLowerCase() } })
        return result
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
        let users = await prisma.userInfo.findMany({ where: { totalTradingVolume: { gt: 0 } } })
        let pointsLeaderBoardList = []
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            let userAddress = user.userAddress;
            let userPoints = await this.calculateUserPoints(userAddress);
            let tradeVolPoints = userPoints.tradeVol.points;
            let referralPoints = userPoints.referral.referringRewardPoints + userPoints.referral.referralSelfRewardPoints;
            let convergePoints = userPoints.converge.points;
            let total = tradeVolPoints + referralPoints + convergePoints
            // console.log(`${tradeVolPoints} + ${referralPoints} + ${convergePoints} = ${total}`)
            let data = { total: total.toFixed(1), multiplier: 1, username: user.username, userAddress: user.userAddress, isBan: user.isBan }
            if (show != null) {
                let showData = show.split(",")
                if (showData.indexOf("tradeVol") != -1) {
                    data['tradeVolPoints'] = tradeVolPoints
                }

                if (showData.indexOf('referral') != -1) {
                    data['referralPoints'] = referralPoints
                }

                if (showData.indexOf('converge') != -1) {
                    data['convergePoints'] = convergePoints
                }
            }

            pointsLeaderBoardList.push(data)
        }
        pointsLeaderBoardList.sort(function (a, b) { return b.total - a.total })
        let rankNo = 0
        for (let i = 0; i < pointsLeaderBoardList.length; i++) {
            const element = pointsLeaderBoardList[i];
            let isNext = element.isBan ? 0 : 1
            let rank = rankNo + isNext
            element.rank = element.isBan ? -1 : rank
            let multiplierResult = await prisma.rankMultiplier.findFirst({ where: { start_rank: { lte: rank }, end_rank: { gte: rank } } })
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
                    points: 0
                }
            }
        }
        let userCurrentConvergeBigNumber = BigNumber(userTradeResult.netConvergenceVolume.toString())
        let userCurrentTradeVolBigNumber = BigNumber(userTradeResult.totalTradingVolume.toString())
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
            let referredUserTradeVolNumber = new BigNumber(referredUserTradeVol.totalTradingVolume.toString());
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
            tradeVol: { vol: userCurrentTradeVol.toNumber(), points: parseFloat(tradeVolNumber) },
            referral: {
                referralSelfRewardPoints: parseFloat(referralSelfRewardPoints.toFixed(1)),
                referringRewardPoints: parseFloat(referringRewardPoints.toFixed(1))
            },
            converge: {
                points: convergeVolNumberPoints,
                val: parseFloat(userCurrentConvergeVol.toString())
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