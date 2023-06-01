import { JsonController, Get, QueryParam, Param } from "routing-controllers";
import { PointsService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { CompetitionService } from "src/services/competition.service";

@JsonController()
@Service()
export class CompetitionController {
    constructor(private competitionService: CompetitionService) {}

    @Get("/competition/leaderboard/absPnl")
    async getAbsPnlLeaderboard(@QueryParam("pageNo") pageNo: number = 1) {
        let result = await this.competitionService.getAbsPnlLeaderboard(pageNo);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/competition/leaderboard/netConvergenceVol")
    async getNetConvergenceVolLeaderboard(@QueryParam("pageNo") pageNo: number = 1) {
        let result = await this.competitionService.getNetConvergenceVolLeaderboard(pageNo);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/competition/leaderboard/realisedPnl")
    async getRealisedPnlLeaderboard(@QueryParam("pageNo") pageNo: number = 1) {
        let result = await this.competitionService.getRealisedPnlLeaderboard(pageNo);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/competition/leaderboard/topLoser")
    async getTopLoserLeaderboard(@QueryParam("pageNo") pageNo: number = 1) {
        let result = await this.competitionService.getTopLoserLeaderboard(pageNo);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

}