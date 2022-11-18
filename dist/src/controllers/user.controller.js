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
    updateUser(username, userAddress, about) {
        return __awaiter(this, void 0, void 0, function* () {
            if (username != "") {
                const exist_user = yield this.userService.findUsersInfoByAddress(userAddress);
                if (exist_user.username != username) {
                    let check_username_exist = yield this.userService.checkUserName(username);
                    if (check_username_exist != null) {
                        return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure).setErrorMessage(`${username} already have user used`).toObject();
                    }
                }
            }
            let user = { username: username, about: about };
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
    follow(user, follower) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.userService.followUser(user, follower);
            if (result) {
                return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Success).setData(result);
            }
            return new apiResponse_1.ApiResponse(apiResponse_1.ResponseStatus.Failure);
        });
    }
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
};
__decorate([
    (0, routing_controllers_1.Get)("/user/find"),
    __param(0, (0, routing_controllers_1.QueryParam)("address")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserByAddress", null);
__decorate([
    (0, routing_controllers_1.Authorized)(["auth-token", "username", "about"]),
    (0, routing_controllers_1.Post)("/user/update"),
    __param(0, (0, routing_controllers_1.BodyParam)("username")),
    __param(1, (0, routing_controllers_1.BodyParam)("userAddress")),
    __param(2, (0, routing_controllers_1.BodyParam)("about")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUser", null);
__decorate([
    (0, routing_controllers_1.Get)("/user"),
    __param(0, (0, routing_controllers_1.QueryParam)("publicAddress", { required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findUser", null);
__decorate([
    (0, routing_controllers_1.Post)("/user"),
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
    (0, routing_controllers_1.Authorized)("auth-token"),
    (0, routing_controllers_1.Post)("/user/follow"),
    __param(0, (0, routing_controllers_1.BodyParam)("user", { required: true })),
    __param(1, (0, routing_controllers_1.BodyParam)("follower", { required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "follow", null);
__decorate([
    (0, routing_controllers_1.Authorized)("auth-token"),
    (0, routing_controllers_1.Post)("/user/unfollow"),
    __param(0, (0, routing_controllers_1.BodyParam)("user", { required: true })),
    __param(1, (0, routing_controllers_1.BodyParam)("follower", { required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "unFollower", null);
__decorate([
    (0, routing_controllers_1.Post)("/user/auth"),
    __param(0, (0, routing_controllers_1.BodyParam)("signature")),
    __param(1, (0, routing_controllers_1.BodyParam)("publicAddress")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "authUser", null);
UserController = __decorate([
    (0, routing_controllers_1.JsonController)(),
    (0, typedi_1.Service)(),
    __metadata("design:paramtypes", [services_1.UserService])
], UserController);
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map