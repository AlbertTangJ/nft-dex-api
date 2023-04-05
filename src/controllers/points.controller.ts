import { JsonController, Get, QueryParam, Param } from "routing-controllers";
import { PointsService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import Schema, { Rules } from "async-validator";
import { isAddress } from "ethers/lib/utils";

@JsonController()
@Service()
export class PointsController {
    private userAddressValidator: Schema;
    constructor(private pointService: PointsService) {
        const pointsParamsCheck: Rules = {
            user: {
                type: "string",
                required: false,
                message: "need to right user address",
                validator: (rule: any, value: any) => {
                    if (value == "" || value == undefined) {
                        return true;
                    } else {
                        return isAddress(value);
                    }
                }
            },
            show: {
                type: "string",
                required: true,
                message: "need to show params",
                validator: (rule: any, value: any) => {
                    if (value == "" || value == undefined) {
                        return true;
                    } else {
                        let showData = value.split(",")
                        if (showData.indexOf("tradeVol") != -1 || showData.indexOf('referral') != -1 || showData.indexOf('og') != -1 || showData.indexOf('converge') != -1) {
                            return true
                        } else {
                            return false
                        }
                    }
                }
            }
        };

        this.userAddressValidator = new Schema(pointsParamsCheck);
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
        try {
            await this.userAddressValidator.validate({ show: show }, errors => {
                if (errors) {
                    for (let i = 0; i < errors.length; i++) {
                        const error = errors[i];
                        throw new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
                    }
                }
            });
        } catch (error) {
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
        }
        let result = await this.pointService.pointsLeaderBoard(show);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }

    @Get("/fetch/:user/points")
    async fetchPoints(@Param("user") user: string, @QueryParam("show") show: string) {
        try {
            await this.userAddressValidator.validate({ user: user, show: show }, errors => {
                if (errors) {
                    for (let i = 0; i < errors.length; i++) {
                        const error = errors[i];
                        throw new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
                    }
                }
            });
        } catch (error) {
            return new ApiResponse(ResponseStatus.Failure).setErrorMessage(error.message);
        }
        let result = await this.pointService.userPoints(user.toLowerCase(), show);
        if (result != null) {
            return new ApiResponse(ResponseStatus.Success).setData(result);
        }
        return new ApiResponse(ResponseStatus.Failure);
    }
}