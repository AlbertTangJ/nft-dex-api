import { PrismaClient } from "@prisma/client";
import prisma from "../helpers/client";
import { Service } from "typedi";
import { utils } from "ethers";
import BigNumber from "bignumber.js";

type ReferralTradeVol = { codeOwner: string, referralCode: string, reffedUser: string, tradeVol: string, username: string }
const syncId: number = isNaN(Number(process.env.SYNC_ID)) ? 0 : Number(process.env.SYNC_ID);
(BigInt.prototype as any).toJSON = function () {
    return this.toString()
}
@Service()
export class PointsService {
    prismaClient: PrismaClient;

    constructor() {
        this.prismaClient = new PrismaClient();
    }

    async userTradeVol(user: string) {
        let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } })
        let result: any[] = await this.prismaClient.$queryRaw`SELECT uif.username AS username, uif."isBan" AS "isBan", uif."hasTraded" AS "hasTraded", uif."isInputCode" AS "isInputCode", plb."userAddress" AS "userAddress", "convergePoints", "convergeVol", "referralSelfRewardPoints", "referringRewardPoints", "tradeVol", "tradePoints", "eligibleCount", "ogPoints", total, "tradeCount"
        FROM api."UserInfo" uif 
        LEFT JOIN api."PointsLeaderBoard" plb 
        ON uif."userAddress" = plb."userAddress"
        WHERE uif."userAddress" = ${user.toLowerCase()} AND plb.season = ${currentSeason.round} AND plb."seasonStart" = ${currentSeason.seasonStart} 
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

    async pointsLeaderBoard(show: string, pageNo: number, pageSize: number) {
        let isStartRank = await this.checkIsSeason()
        let multiplierResult = await prisma.rankMultiplier.findMany();
        let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } })
        let rankNo = 0
        let pointsLeaderBoardList = []
        let results: any[] = await this.prismaClient.$queryRaw`SELECT uif.username AS username, plb."isBan" AS "isBan", 
            uif."hasTraded" AS "hasTraded", 
            uif."isInputCode" AS "isInputCode",
            uif."referralCode" AS "referralCode",
            plb."tradeCount" AS "tradeCount", 
            plb."userAddress" AS "userAddress", 
            plb."convergePoints" AS "convergePoints",
            plb."convergeVol" AS "convergeVol", 
            plb."referralSelfRewardPoints" AS "referralSelfRewardPoints",
            plb."referringRewardPoints" AS "referringRewardPoints", 
            plb."isBan" AS "isBan", 
            plb."tradeVol" AS "tradeVol", 
            plb."tradePoints" AS "tradePoints", 
            plb."eligibleCount" AS "eligibleCount",
            plb."ogPoints" AS "ogPoints", 
            plb.total AS total
            FROM api."UserInfo" uif
            LEFT JOIN api."PointsLeaderBoard" plb
            ON uif."userAddress" = plb."userAddress"
            WHERE plb.season = ${currentSeason.round} AND plb."seasonStart" = ${currentSeason.seasonStart} 
            ORDER BY plb."total" DESC
            LIMIT ${pageSize} OFFSET ${pageNo}`

        for (let index = 0; index < results.length; index++) {
            const item = results[index];
            // console.log(item)
            let userAddress = item.userAddress;
            let tradeVolPoints = item.tradePoints;
            let referralPoints = BigNumber(item.referringRewardPoints.toString()).plus(item.referralSelfRewardPoints.toString()).toString();
            let convergePoints = item.convergePoints;
            let total = item.total
            let ogPoints = item.ogPoints
            let referralCode = item.referralCode
            // console.log(`${tradeVolPoints} + ${referralPoints} + ${convergePoints} = ${total}`)
            let data = { total: parseFloat(total), multiplier: 1, username: item.username, userAddress: userAddress, isBan: item.isBan, tradeVol: item.tradeVol, referralCode: referralCode }
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
                if (showData.indexOf('og') != -1) {
                    data['og'] = parseFloat(ogPoints)
                }
            }
            pointsLeaderBoardList.push(data)
        }

        // pointsLeaderBoardList.sort(function (a, b) { return b.total - a.total })
        for (let i = 0; i < pointsLeaderBoardList.length; i++) {
            const element = pointsLeaderBoardList[i];
            if (isStartRank) {
                let isNext = element.isBan ? 0 : 1
                let rank = rankNo
                let tradeVolBigNumber = BigNumber(element.tradeVol)
                if (tradeVolBigNumber.gte(BigNumber(utils.parseEther("5").toString()))) {
                    rank = rank + isNext
                    element.rank = element.isBan ? -1 : rank + pageNo
                } else {
                    element.rank = 0
                }
                for (let a = 0; a < multiplierResult.length; a++) {
                    const multiplierItem = multiplierResult[a];
                    let startRank = multiplierItem.start_rank;
                    let endRank = multiplierItem.end_rank;
                    if (startRank <= element.rank && element.rank <= endRank) {
                        let multiplier = parseFloat(multiplierItem.multiplier.toString())
                        element.multiplier = multiplier
                        element.total = parseFloat((element.total * multiplier).toFixed(1))
                        break
                    }
                }
                rankNo = rank
            } else {
                element.multiplier = 1
                element.rank = 0
            }
        }
        // console.log(pointsLeaderBoardList)
        let finalRanks = []
        for (let i = 0; i < pointsLeaderBoardList.length; i++) {
            const point = pointsLeaderBoardList[i];
            if (point.rank != 0) {
                finalRanks.push(point)
            }
        }

        return finalRanks
    }

    // async calculateUserPoints(user: string) {
    //     let userTradeResult = await this.userTradeVol(user);
    //     let unitEth = BigNumber(utils.parseEther("1").toString())
    //     let limitEth = BigNumber(utils.parseEther("5").toString())
    //     let referredReward = 0.02
    //     let referringReward = 0.03
    //     let isInputCode = false
    //     let isTrade = false
    //     if (userTradeResult == null) {
    //         return {
    //             rank: 0,
    //             multiplier: 0,
    //             userAddress: null,
    //             username: null,
    //             referralCode: "",
    //             enterReferralUser: [],
    //             eligibleCount: 0,
    //             isInputCode: isInputCode,
    //             isTrade: isTrade,
    //             tradeVol: { vol: 0, points: 0 },
    //             referral: {
    //                 referralSelfRewardPoints: 0,
    //                 referringRewardPoints: 0
    //             }, converge: {
    //                 points: 0,
    //                 vol: 0
    //             }
    //         }
    //     }
    //     let userCurrentConvergeBigNumber = BigNumber(userTradeResult.convergeVol.toString())
    //     let userCurrentTradeVolBigNumber = BigNumber(userTradeResult.tradeVol.toString())
    //     let userCurrentTradeVol = userCurrentTradeVolBigNumber.dividedBy(unitEth);
    //     let userCurrentConvergeVol = userCurrentConvergeBigNumber.dividedBy(unitEth);
    //     let tradeVolNumber = userCurrentTradeVol.multipliedBy(10).toFixed(1);
    //     let convergeVolNumber = userCurrentConvergeVol.multipliedBy(10).toFixed(1);
    //     isInputCode = userTradeResult.isInputCode
    //     isTrade = userTradeResult.hasTraded
    //     // 找到推荐当前用户的人

    //     let userReferredResult = await this.userReferredPoints(user);
    //     // 先看当前用户够不够5个eth
    //     // null 当前用户没有推荐人 ，当前用户的2% 奖励 是需要看 当前用户的推荐人，有没有超过5个eth
    //     if (userReferredResult == null || userCurrentTradeVolBigNumber.lte(limitEth)) {
    //         referredReward = 0
    //     } else {
    //         let code = userReferredResult.referralCode
    //         let userInfo = await prisma.userInfo.findFirst({ where: { referralCode: code } })
    //         let codeOwner = userInfo.userAddress;
    //         let referredUserTradeVol = await this.userTradeVol(codeOwner);
    //         let referredUserTradeVolNumber = new BigNumber(referredUserTradeVol.tradeVol.toString());
    //         if (referredUserTradeVolNumber.lt(limitEth)) {
    //             referredReward = 0
    //         }
    //     }

    //     // 当前用户的成交量 * referredReward = 当前用户的referred奖励 , 当前用户需要trade vol >= 5
    //     let referralSelfRewardPoints = (referredReward * parseFloat(tradeVolNumber) * 10);
    //     // 
    //     let referringRewardPoints = 0
    //     let eligibleCount = 0

    //     if (userCurrentTradeVolBigNumber.gte(limitEth)) {
    //         let userReferralPoints = await this.userReferringPoints(user);
    //         for (let i = 0; i < userReferralPoints.length; i++) {
    //             const points = userReferralPoints[i].tradeVol;
    //             // let username = userReferralPoints[i].username
    //             // let userAddress = userReferralPoints[i].reffedUser
    //             if (points != null) {
    //                 let pointsBig = BigNumber(points)
    //                 if (pointsBig.gte(limitEth)) {
    //                     let currentPoints = pointsBig.dividedBy(unitEth).toFixed(1);
    //                     referringRewardPoints += (parseFloat(currentPoints) * referringReward * 10)
    //                     eligibleCount += 1
    //                 }
    //             }
    //         }
    //     }

    //     let convergeVolNumberPoints = parseFloat(convergeVolNumber) > 0 ? parseFloat(convergeVolNumber) : 0

    //     // console.log(leaderBoard)
    //     let multiplierNumber = 1
    //     // console.log(userReferralPoints)
    //     let enterReferralUser = await this.fetchReferringUser(user);
    //     let total = (parseFloat(tradeVolNumber) + referringRewardPoints + referralSelfRewardPoints + convergeVolNumberPoints) * multiplierNumber
    //     let result = {
    //         userAddress: userTradeResult.userAddress,
    //         username: userTradeResult.username,
    //         multiplier: multiplierNumber,
    //         referralCode: userTradeResult.referralCode,
    //         total: total,
    //         isInputCode: isInputCode,
    //         isTrade: isTrade,
    //         enterReferralUser: enterReferralUser,
    //         eligibleCount: eligibleCount,
    //         tradeVol: { vol: userCurrentTradeVol.toString(), points: parseFloat(tradeVolNumber) },
    //         referral: {
    //             referralSelfRewardPoints: parseFloat(referralSelfRewardPoints.toFixed(1)),
    //             referringRewardPoints: parseFloat(referringRewardPoints.toFixed(1))
    //         },
    //         converge: {
    //             points: convergeVolNumberPoints,
    //             val: userCurrentConvergeVol.toString()
    //         }
    //     }
    //     return result
    // }

    async checkIsSeason() {
        let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } })
        if (currentSeason.round == 0) {
            return false
        } else {
            return true
        }
    }

    async userPoints(user: string, show: string) {
        let multiplierResult = await prisma.rankMultiplier.findMany();
        let enterReferralUser = await this.fetchReferringUser(user);
        let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } })
        let isStartRank = await this.checkIsSeason()
        let filterIsBan = (isBan: boolean) => { return isBan ? ' AND uif."isBan"=false' : ' AND 1=1' }
        var sql = (isBan: boolean) => {
            return `SELECT "username", "isBan", "rank", "hasTraded", "referralCode", "isInputCode", "tradeCount", "userAddress", "convergePoints", "convergeVol", "referralSelfRewardPoints", "referringRewardPoints", "tradeVol", "tradePoints", "eligibleCount", "ogPoints", "total"  
                    FROM (SELECT uif.username AS username, uif."isBan" AS "isBan",  row_number() OVER (
                        ORDER BY total DESC
                    ) AS "rank",
                    uif."hasTraded" AS "hasTraded",
                    uif."referralCode" AS "referralCode", 
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
                    WHERE plb.season = ${currentSeason.round} AND plb."seasonStart" = ${currentSeason.seasonStart} ${filterIsBan(isBan)}
                    ORDER BY plb."total" DESC) nt WHERE nt."userAddress" = '${user.toLowerCase()}'`
        }
        let results: any[] = await this.prismaClient.$queryRawUnsafe(sql(true))
        let rankData = null
        if (results.length > 0) {
            rankData = results.shift()
        } else {
            results = await this.prismaClient.$queryRawUnsafe(sql(false))
            // console.log(results)
            if (results.length > 0) {
                rankData = results.shift()
            }
        }

        if (rankData == null) {
            return {
                rank: 0,
                multiplier: 0,
                total: 0,
                userAddress: user,
                username: "",
                tradeVol: { vol: 0, points: 0 },
                referral: {
                    referralSelfRewardPoints: 0,
                    referringRewardPoints: 0
                }, converge: {
                    points: 0,
                    val: 0
                },
                referralUser: {},
                eligibleCount: 0,
                referralCode: "",
                isInputCode: false,
                isTrade: false,
                isBan: false
            }
        }
        let rank = rankData.rank
        let multiplier = 1
        if (rankData.isBan) {
            rank = "-1"
        } else {
            let tradeVolBigNumber = BigNumber(rankData.tradeVol.toString())
            // console.log(tradeVolBigNumber.toString())
            if (tradeVolBigNumber.lt(BigNumber(utils.parseEther("5").toString()))) {
                rank = 0
            }
        }
        let total = parseFloat(rankData.total)
        for (let a = 0; a < multiplierResult.length; a++) {
            const multiplierItem = multiplierResult[a];
            let startRank = multiplierItem.start_rank;
            let endRank = multiplierItem.end_rank;
            if (startRank <= rank && rank <= endRank) {
                multiplier = parseFloat(multiplierItem.multiplier.toString())
                total = parseFloat((total * multiplier).toFixed(1))
                break
            }
        }
        // 5000000000000000000
        // 1000000000000000000
        if (!isStartRank) {
            rank = 0
            multiplier = 1
        }

        // let multiplierResult = await prisma.rankMultiplier.findFirst({ where: { start_rank: { lte: rank }, end_rank: { gte: rank } } })
        let result = {
            rank: parseInt(rank),
            multiplier: multiplier,
            total: total,
            userAddress: rankData.userAddress,
            username: rankData.username,
            referralUser: enterReferralUser,
            eligibleCount: parseFloat(rankData.eligibleCount),
            referralCode: rankData.referralCode,
            isBan: rankData.isBan,
            isInputCode: rankData.isInputCode,
            isTrade: rankData.isTrade,
        }

        let showData = show.split(",")
        if (showData.indexOf("tradeVol") != -1) {
            result['tradeVol'] = { vol: rankData.tradeVol, points: parseFloat(rankData.tradePoints) }
        }
        if (showData.indexOf('referral') != -1) {
            result['referral'] = {
                referralSelfRewardPoints: parseFloat(rankData.referralSelfRewardPoints),
                referringRewardPoints: parseFloat(rankData.referringRewardPoints)
            }
        }
        if (showData.indexOf('og') != -1) {
            result['og'] = parseFloat(rankData.ogPoints)
        }
        if (showData.indexOf('converge') != -1) {
            result['converge'] = {
                points: parseFloat(rankData.convergePoints),
                val: rankData.convergeVol
            }
        }

        return result
    }
}