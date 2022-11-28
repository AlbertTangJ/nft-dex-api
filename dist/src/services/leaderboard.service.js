"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderBoardService = void 0;
const client_1 = require("@prisma/client");
const typedi_1 = require("typedi");
let LeaderBoardService = class LeaderBoardService {
    constructor() {
        this.prismaClient = new client_1.PrismaClient();
    }
    leaderBoardList(page, size, round) {
        return __awaiter(this, void 0, void 0, function* () {
            if (page <= 0) {
                page = 1;
            }
            page = page - 1;
            let result = yield this.prismaClient.$queryRaw `SELECT username, sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS address, userinfo.username AS username, pnl.realizedpnl AS realizedpnl, rewards.update_timestamp AS updatetimestamp, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
                                                       FROM public.rewards JOIN public.pnl ON pnl.user_address = rewards.user_address JOIN api."UserInfo" as userinfo ON userinfo."userAddress" = pnl.user_address
                                                       WHERE rewards.round = ${round} AND pnl.round = ${round} GROUP BY username, rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty, rewards.update_timestamp
                                                       HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 ORDER BY total DESC
                                                       LIMIT ${size} OFFSET ${page}`;
            let rewards = [];
            let i = (page * size) + 1;
            for (let a = 0; a < result.length; a++) {
                const reward = result[a];
                const item = { "address": reward.address, "username": reward.username, "total": reward.total, "updatetime": reward.updatetimestamp, "rank": i };
                rewards.push(item);
                i = i + 1;
            }
            return rewards;
        });
    }
    fetchRangingByUser(userAddress, round) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.prismaClient.$queryRaw `SELECT username, sum(rewards.amm_pnl) AS unrealizedpnl, sum(rewards.funding_payment) AS fundingpayment, rewards.user_address AS address, userinfo.username AS username, pnl.realizedpnl AS realizedpnl, rewards.update_timestamp AS updatetimestamp, (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty AS total
                                                       FROM public.rewards JOIN public.pnl ON pnl.user_address = rewards.user_address JOIN api."UserInfo" as userinfo ON userinfo."userAddress" = pnl.user_address
                                                       WHERE rewards.round = ${round} AND pnl.round = ${round} GROUP BY username, rewards.user_address, pnl.realizedpnl, pnl.funding_payment, pnl.bad_debt, pnl.fee, pnl.liquidation_penalty, rewards.update_timestamp
                                                       HAVING (((((sum(rewards.amm_pnl) - sum(rewards.funding_payment)) + pnl.realizedpnl) - pnl.funding_payment) + pnl.bad_debt) - pnl.fee) - pnl.liquidation_penalty != 0 ORDER BY total DESC`;
            let userRanking = null;
            for (let i = 0; i < result.length; i++) {
                const reward = result[i];
                if (reward.address == userAddress) {
                    const item = { "address": reward.address, "username": reward.username, "total": reward.total, "updatetime": reward.updatetimestamp, "rank": i };
                    userRanking = item;
                    break;
                }
            }
            if (userRanking == null) {
                userRanking = { "address": userAddress, "username": null, "total": '0', "rank": null };
            }
            return userRanking;
        });
    }
};
LeaderBoardService = __decorate([
    (0, typedi_1.Service)(),
    __metadata("design:paramtypes", [])
], LeaderBoardService);
exports.LeaderBoardService = LeaderBoardService;
//# sourceMappingURL=leaderboard.service.js.map