import { PrismaClient } from "@prisma/client";
import { Service } from "typedi";
type Reward = { address: string, username: string, unrealizedpnl: string, fundingpayment: string, realizedpnl: string, updatetimestamp: number, total: string }

@Service()
export class LeaderBoardService {

    prismaClient: PrismaClient;
    constructor() {
        this.prismaClient = new PrismaClient();
    }

    async leaderBoardList(page: number, size: number, round: number) {
        if (page <= 0) {
            page = 1;
        }
        page = page - 1;
        let result: Reward[] = await this.prismaClient.$queryRaw`SELECT username, sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS address, userinfo.username AS username, pnl.realizedpnl AS realizedpnl, rewards.update_timestamp AS updatetimestamp, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
                                                       FROM public.rewards JOIN public.pnl ON pnl.user_address = rewards.user_address JOIN api."UserInfo" as userinfo ON userinfo."userAddress" = pnl.user_address
                                                       WHERE rewards.round = ${round} AND pnl.round = ${round} GROUP BY username, rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty, rewards.update_timestamp
                                                       HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 ORDER BY total DESC
                                                       LIMIT ${size} OFFSET ${page}`;
        let rewards = []
        let i = (page * size) + 1
        for (let a = 0; a < result.length; a++) {
            const reward: Reward = result[a];
            const item = { "address": reward.address, "username": reward.username, "total": reward.total, "updatetime": reward.updatetimestamp, "rank": i }
            rewards.push(item)
            i = i + 1
        }
        return rewards;
    }

    async fetchRangingByUser(userAddress: string, round: number) {
        let result: Reward[] = await this.prismaClient.$queryRaw`SELECT username, sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS address, userinfo.username AS username, pnl.realizedpnl AS realizedpnl, rewards.update_timestamp AS updatetimestamp, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
                                                       FROM public.rewards JOIN public.pnl ON pnl.user_address = rewards.user_address JOIN api."UserInfo" as userinfo ON userinfo."userAddress" = pnl.user_address
                                                       WHERE rewards.round = ${round} AND pnl.round = ${round} GROUP BY username, rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty, rewards.update_timestamp
                                                       HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 ORDER BY total DESC`;
        let userRanking = null
        for (let i = 0; i < result.length; i++) {
            const reward: Reward = result[i];
            if (reward.address == userAddress) {
                const item = { "address": reward.address, "username": reward.username, "total": reward.total, "updatetime": reward.updatetimestamp, "rank": i }
                userRanking = item;
                break
            }
        }
        if (userRanking == null) {
            userRanking = { "address": userAddress, "username": null, "total": '0', "rank": null }
        }

        return userRanking
    }

}
