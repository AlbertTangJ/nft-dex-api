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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
exports.UserController = void 0;
const routing_controllers_1 = require("routing-controllers");
const services_1 = require("../services");
const typedi_1 = require("typedi");
const apiResponse_1 = require("src/helpers/apiResponse");
let UserController = class UserController {
    constructor(userService) {
        this.userService = userService;
    }
    getUserByAddress(address) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!address) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure)
                    .setErrorMessage("Missing parameters")
                    .toObject();
            }
            const user = yield this.userService.findByAddress(address);
            if (!user) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure)
                    .setErrorMessage("User not found")
                    .toObject();
            }
            else {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(user).toObject();
            }
        });
    }
    checkUserName(username) {
        let checkMessage = "";
        let checkUserNameResult = false;
        if (username == "" || username == null) {
            checkUserNameResult = true;
        }
        else {
            var patten = /^[a-zA-Z0-9_]{3,30}$/;
            let result = patten.test(username);
            if (!result) {
                checkUserNameResult = false;
                checkMessage = "username must be 5-10 characters";
            }
            else {
                checkUserNameResult = true;
            }
        }
        let check = { result: checkUserNameResult, message: checkMessage };
        if (!check.result) {
            throw new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.UsernameWrong).setErrorMessage(check.message);
        }
    }
    checkAbout(about) {
        let checkAboutResult = false;
        let checkMessage = "";
        if (about == "" || about == null) {
            checkAboutResult = true;
        }
        else {
            if (about.length >= 0 && about.length <= 200) {
                checkAboutResult = true;
            }
            else {
                checkMessage = "about can not over 200 characters";
                checkAboutResult = false;
            }
        }
        let check = { result: checkAboutResult, message: checkMessage };
        if (!check.result) {
            throw new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure).setErrorMessage(check.message);
        }
    }
    updateUser(username, userAddress, about) {
        return __awaiter(this, void 0, void 0, function* () {
            let isUpdateUsername = false;
            if (username != "" && username != null) {
                var existUser = yield this.userService.findUsersInfoByAddress(userAddress);
                if (existUser != null && existUser.username != username) {
                    let checkUsernameExist = yield this.userService.checkUserName(username);
                    if (checkUsernameExist != null) {
                        return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure).setErrorMessage(`${username} already have user used`).toObject();
                    }
                    else {
                        isUpdateUsername = true;
                    }
                }
            }
            if (username == null) {
                username = '';
            }
            if (about == null) {
                about = '';
            }
            try {
                this.checkUserName(username);
                this.checkAbout(about);
            }
            catch (error) {
                throw error;
            }
            let currentDateTime = new Date();
            let currentTimestamp = Math.floor(Date.now() / 1000);
            let user = { username: username, about: about };
            if (isUpdateUsername) {
                var currentDate = new Date();
                let currentYear = currentDate.getFullYear();
                let lastTimeUpdateYear = existUser.updateTime;
                let updateTimes = existUser.updateNameTimes + 1;
                if (lastTimeUpdateYear.getFullYear() < currentYear) {
                    updateTimes = 1;
                }
                // 说移除一年改3次的限制, DB相关数据保留
                // else {
                //   if (updateTimes > 3) {
                //     return new ApiResponse(ResponseStatus.Failure).setErrorMessage(`can not change username over 3 times pre year`).toObject();;
                //   }
                // }
                user = { username: username, about: about, updateNameTimes: updateTimes, updateTimestamp: currentTimestamp, updateTime: currentDateTime };
            }
            let result = yield this.userService.updateUserService(userAddress, user);
            if (result != null) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData({
                    id: result.id,
                    userAddress: result.userAddress,
                    nonce: result.nonce,
                    username: result.username,
                    about: result.about,
                });
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure).setErrorMessage(`unKnow reason`).toObject();
            ;
        });
    }
    findUserByName(username) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.checkUserName(username);
            return result;
        });
    }
    search(keyword, userAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.searchAddressUsername(keyword, userAddress);
            if (result != null) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure);
        });
    }
    findUser(userAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.findUsersInfoByAddress(userAddress.toLowerCase());
            if (result != null) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure);
        });
    }
    createUser(userAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.createUserInfoService(userAddress);
            if (result != null) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure);
        });
    }
    following(user, pageNo, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.followingList(user, pageNo, pageSize);
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
        });
    }
    followers(user, pageNo, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.followList(user, pageNo, pageSize);
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
        });
    }
    // @Authorized("auth-token")
    follow(user, follower) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.followUser(user, follower);
            if (result) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure);
        });
    }
    // @Authorized("auth-token")
    unFollower(user, follower) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.unFollowUser(user, follower);
            if (result) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure);
        });
    }
    authUser(signature, publicAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.authUserService(signature, publicAddress);
            if (result != null) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData({ token: result }).toObject();
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure);
        });
    }
    eventLog(name, event) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.userService.saveEvent(name, event);
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).toObject();
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)("/users/find"),
    __param(0, (0, routing_controllers_1.QueryParam)("address")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserByAddress", null);
__decorate([
    (0, routing_controllers_1.Authorized)(["auth-token"]),
    (0, routing_controllers_1.Post)("/users/update"),
    __param(0, (0, routing_controllers_1.BodyParam)("username")),
    __param(1, (0, routing_controllers_1.BodyParam)("userAddress")),
    __param(2, (0, routing_controllers_1.BodyParam)("about")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUser", null);
__decorate([
    (0, routing_controllers_1.Post)("/users/search"),
    __param(0, (0, routing_controllers_1.BodyParam)("keyword")),
    __param(1, (0, routing_controllers_1.BodyParam)("userAddress")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "search", null);
__decorate([
    (0, routing_controllers_1.Get)("/users"),
    __param(0, (0, routing_controllers_1.QueryParam)("publicAddress", { required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findUser", null);
__decorate([
    (0, routing_controllers_1.Post)("/users"),
    __param(0, (0, routing_controllers_1.BodyParam)("userAddress", { required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "createUser", null);
__decorate([
    (0, routing_controllers_1.Get)("/following/:user/:pageNo/:pageSize"),
    __param(0, (0, routing_controllers_1.Param)("user")),
    __param(1, (0, routing_controllers_1.Param)("pageNo")),
    __param(2, (0, routing_controllers_1.Param)("pageSize")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "following", null);
__decorate([
    (0, routing_controllers_1.Get)("/followers/:user/:pageNo/:pageSize"),
    __param(0, (0, routing_controllers_1.Param)("user")),
    __param(1, (0, routing_controllers_1.Param)("pageNo")),
    __param(2, (0, routing_controllers_1.Param)("pageSize")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "followers", null);
__decorate([
    (0, routing_controllers_1.Post)("/users/follow"),
    __param(0, (0, routing_controllers_1.BodyParam)("userAddress", { required: true })),
    __param(1, (0, routing_controllers_1.BodyParam)("followerAddress", { required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "follow", null);
__decorate([
    (0, routing_controllers_1.Post)("/users/unfollow"),
    __param(0, (0, routing_controllers_1.BodyParam)("userAddress", { required: true })),
    __param(1, (0, routing_controllers_1.BodyParam)("followerAddress", { required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "unFollower", null);
__decorate([
    (0, routing_controllers_1.Post)("/users/auth"),
    __param(0, (0, routing_controllers_1.BodyParam)("signature")),
    __param(1, (0, routing_controllers_1.BodyParam)("publicAddress")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "authUser", null);
__decorate([
    (0, routing_controllers_1.Post)("/users/event"),
    __param(0, (0, routing_controllers_1.BodyParam)("name", { required: true })),
    __param(1, (0, routing_controllers_1.BodyParam)("params", { required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "eventLog", null);
UserController = __decorate([
    (0, routing_controllers_1.JsonController)(),
    (0, typedi_1.Service)(),
    __metadata("design:paramtypes", [services_1.UserService])
], UserController);
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map