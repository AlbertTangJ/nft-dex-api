import { JsonController, Get, QueryParam, Post, BodyParam, Authorized, Req } from "routing-controllers";
import { ActivityService } from "../services";
import { Service } from "typedi";
import { ApiResponse, ResponseStatus } from "src/helpers/apiResponse";
import { title } from "process";
import { Events } from "@prisma/client";




@JsonController()
@Service()
export class ActivityController {

    constructor(
        private activityService: ActivityService
    ) { }

    @Post("/activity/create")
    async createActivity(
        @BodyParam("title") title: string,
        @BodyParam("description") description: string,
        @BodyParam("startTime") startTime: number,
        @BodyParam("endTime") endTime: number) {

        this.activityService.create(title, description, startTime, endTime);
    }


    @Get("/activity/running/list")
    async activityList() {
        return await this.activityService.findRunningActivities()
    }

}