import { JsonController, Get, QueryParam, Post, BodyParam, Authorized, Req, Param } from "routing-controllers";
import { PointsService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";


@JsonController()
@Service()
export class PointsController {
    constructor(private pointService: PointsService) {

    }

    @Post("/points/user/trade/vol")
    async fetchTradeVol(@Param("user") user: string) {
        let result = await this.pointService.userTradeVol(user);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }
}