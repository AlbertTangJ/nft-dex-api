import {
    JsonController,
    Get,
    QueryParam,
    Post,
    BodyParam,
    Authorized,
    Param,
    Body,
    Res,
    Req,
} from "routing-controllers";
import { LeaderBoardService } from "../services/leaderboard.service";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";

@JsonController()
@Service()
export class LeaderBoardController {
    constructor(private leaderBoardService: LeaderBoardService) { }

    // https://campaign-api.tribe3.xyz/v1/fetch/leaderboard/list/1/30/2
    @Get("/fetch/leaderboard/list/:page/:size/:round")
    async findUser(@Param("page") page: number, @Param("size") size: number, @Param("round") round: number) {
        let result = await this.leaderBoardService.leaderBoardList(page, size, round)
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

}