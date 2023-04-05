import { JsonController, Get, QueryParam, Post, BodyParam, Authorized, Req, Param } from "routing-controllers";
import { PointsService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";


@JsonController()
@Service()
export class PointsController {
    constructor(private pointService: PointsService) {

    }

    @Get("/fetch/:user/trade/vol")
    async fetchTradeVol(@Param("user") user: string) {
        let result = await this.pointService.userTradeVol(user);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/fetch/points/rank")
    async fetchPointsLeaderBoard(@QueryParam("show") show: string) {
        let result = await this.pointService.pointsLeaderBoard(show);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/fetch/:user/points")
    async fetchPoints(@Param("user") user: string, @QueryParam("show") show: string) {
        console.log(user)
        let result = await this.pointService.userPoints(user, show);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }
}