import { PrismaClient } from "@prisma/client";
import { Service } from "typedi";


@Service()
export class LeaderBoardService {
    // positions(first: ${start}, skip:${skip}) {
    //     trader
    //     realizedPnl
    //     fundingPayment
    //     fee
    //     badDebt
    //     liquidationPenalty
    // }
    // SELECT sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS “user”, pnl.realizedpnl AS realizedpnl, rewards.update_timestamp AS updatetimestamp, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
    // FROM rewards JOIN pnl ON pnl.user_address = rewards.user_address
    // WHERE rewards.round = %(round_1)s AND pnl.round = 2 GROUP BY rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty, rewards.update_timestamp
    // HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 ORDER BY total DESC
    // LIMIT 20 OFFSET 0
    // {‘round_1’: 1, ‘round_2’: 1, ‘param_1’: 0, ‘param_2’: 20, ‘param_3’: 0}
    prismaClient: PrismaClient;
    constructor() {
        this.prismaClient = new PrismaClient();
    }

    async leaderBoardList(page: number, size: number, round: number) {
        let result = await this.prismaClient.$queryRaw`SELECT sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS address, pnl.realizedpnl AS realizedpnl, rewards.update_timestamp AS updatetimestamp, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
                                                       FROM public.rewards JOIN public.pnl ON pnl.user_address = rewards.user_address
                                                       WHERE rewards.round = ${round} AND pnl.round = ${round} GROUP BY rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty, rewards.update_timestamp
                                                       HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 ORDER BY total DESC
                                                       LIMIT ${size} OFFSET ${page}`;
        return result;
    }


}
