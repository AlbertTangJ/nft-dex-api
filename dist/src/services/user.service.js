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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const typedi_1 = require("typedi");
const client_1 = __importDefault(require("../helpers/client"));
const eth_sig_util_1 = require("eth-sig-util");
const ethereumjs_util_1 = require("ethereumjs-util");
let UserService = class UserService {
    constructor() { }
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return client_1.default.user.create({
                data: data,
            });
        });
    }
    findByAddress(userAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield client_1.default.user.findUnique({
                where: {
                    userAddress: userAddress
                },
            });
        });
    }
    // 获取follow 我的所有人
    followList(userAddress, pageNo, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            let fansList = yield client_1.default.userFollowing.findMany({
                where: {
                    userAddress: userAddress.toLowerCase(),
                },
                take: pageSize,
                skip: pageNo
            });
            let result = [];
            for (let i = 0; i < fansList.length; i++) {
                const follower = fansList[i];
                result.push({
                    id: follower.id,
                    userAddress: follower.userAddress,
                    followerAddress: follower.followerAddress,
                    status: follower.status,
                });
            }
            return result;
        });
    }
    followingList(userAddress, pageNo, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            if (pageNo > 0) {
                pageNo = pageNo - 1;
                pageNo = pageNo * pageSize;
            }
            let followList = yield client_1.default.$queryRaw `SELECT "UserFollowing"."userAddress", "UserFollowing"."followerAddress", "UserInfo"."followers", "UserInfo"."ranking" FROM "api"."UserFollowing" JOIN "api"."UserInfo" ON "api"."UserFollowing"."userAddress" = "api"."UserInfo"."userAddress" WHERE "UserInfo"."userAddress"=${userAddress.toLowerCase()} LIMIT ${pageSize} OFFSET ${pageNo}`;
            return followList;
        });
    }
    followUser(userAddress, followerAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let haveFollowed = yield client_1.default.userFollowing.findUnique({
                where: {
                    userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
                }
            });
            if (haveFollowed == null) {
                let currentDateTime = new Date()
                    .toISOString();
                let currentTimestamp = Math.floor(Date.now() / 1000);
                let follow = {
                    status: 1,
                    createTimestamp: currentTimestamp,
                    updateTime: currentDateTime,
                    updateTimestamp: currentTimestamp,
                    userAddress: userAddress.toLowerCase(),
                    followerAddress: followerAddress.toLowerCase()
                };
                let result = yield client_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    let result = yield tx.userFollowing.create({ data: follow });
                    if (result != null) {
                        let resultUserInfo = yield tx.userInfo.findUnique({
                            where: {
                                userAddress: userAddress.toLowerCase()
                            }
                        });
                        let followers = resultUserInfo.followers + 1;
                        let updateFollowers = yield tx.userInfo.update({
                            where: { userAddress: userAddress.toLowerCase() },
                            data: { followers: followers }
                        });
                        return updateFollowers;
                    }
                }));
                return result;
            }
            return haveFollowed;
        });
    }
    unFollowUser(userAddress, followerAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let haveFollowed = yield client_1.default.userFollowing.findUnique({
                where: {
                    userAddress_followerAddress: {
                        userAddress: userAddress.toLowerCase(),
                        followerAddress: followerAddress.toLowerCase(),
                    }
                },
            });
            if (haveFollowed != null) {
                let result = yield client_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    let result = yield tx.userFollowing.delete({
                        where: {
                            userAddress_followerAddress: {
                                userAddress: userAddress.toLowerCase(),
                                followerAddress: followerAddress.toLowerCase(),
                            }
                        }
                    });
                    if (result != null) {
                        let userInfo = yield tx.userInfo.findUnique({ where: { userAddress: userAddress.toLowerCase() } });
                        let followers = userInfo.followers - 1;
                        let userUpdateResult = yield tx.userInfo.update({ where: { userAddress: userAddress.toLowerCase() }, data: { followers: followers } });
                        return userUpdateResult;
                    }
                }));
                return result;
            }
            return haveFollowed;
        });
    }
    saveEvent(name, params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield client_1.default.userEventsLog.create({ data: { name: name, event: params } });
        });
    }
    authUserService(signature, publicAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            // let that = this;
            let accessToken = yield client_1.default.userInfo.findUnique({
                where: { userAddress: publicAddress },
            })
                ////////////////////////////////////////////////////
                // Step 1: Get the user with the given publicAddress
                ////////////////////////////////////////////////////
                .then((user) => {
                if (!user) {
                    throw new Error(`User with publicAddress ${publicAddress} is not found`);
                }
                return user;
            })
                ////////////////////////////////////////////////////
                // Step 2: Verify digital signature
                ////////////////////////////////////////////////////
                .then((user) => {
                if (!user.nonce) {
                    // Should not happen, we should have already sent the response
                    throw new Error('User is not defined in "Verify digital signature".');
                }
                const msg = `\x19Ethereum Signed Message:\nHi there! Welcome to Tribe3!\n\nClick to log in to access your very own profile on Tribe3. Please note that this will not execute any blockchain transaction nor it will cost you any gas fee.\n\nYour Nonce: ${user.nonce}`;
                // We now are in possession of msg, publicAddress and signature. We
                // will use a helper from eth-sig-util to extract the address from the signature
                const msgBufferHex = (0, ethereumjs_util_1.bufferToHex)(Buffer.from(msg, "utf8"));
                const address = (0, eth_sig_util_1.recoverPersonalSignature)({
                    data: msgBufferHex,
                    sig: signature,
                });
                // The signature verification is successful if the address found with
                // sigUtil.recoverPersonalSignature matches the initial publicAddress
                if (address.toLowerCase() === publicAddress.toLowerCase()) {
                    return user;
                }
                else {
                    // Should not happen, we should have already sent the response
                    throw new Error("Signature verification failed");
                }
            })
                ////////////////////////////////////////////////////
                // Step 3: Generate a new nonce for the user
                ////////////////////////////////////////////////////
                .then((user) => __awaiter(this, void 0, void 0, function* () {
                user.nonce = Math.floor(Math.random() * 10000);
                const result = yield client_1.default.userInfo.update({
                    where: { userAddress: user.userAddress },
                    data: { nonce: user.nonce }
                });
                return result;
            }))
                ////////////////////////////////////////////////////
                // Step 4: Create JWT
                ////////////////////////////////////////////////////
                .then((user) => __awaiter(this, void 0, void 0, function* () {
                console.log(user);
                const firebaseToken = yield global.firebaseAdmin
                    .auth()
                    .createCustomToken(user.userAddress);
                return firebaseToken;
            }));
            return accessToken;
        });
    }
    updateByAddress(userAddress, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return client_1.default.user.update({
                where: {
                    userAddress,
                },
                data,
            });
        });
    }
    findUsersInfoByAddress(updateUserAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let userInfo = yield client_1.default.userInfo.findFirst({
                where: {
                    userAddress: updateUserAddress.toLowerCase()
                },
            });
            return userInfo;
        });
    }
    checkUserName(username) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateUserInfo = yield client_1.default.userInfo.findFirst({
                where: { username: username },
            });
            return updateUserInfo;
        });
    }
    searchAddressUsername(keyword, userAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield client_1.default.userInfo.findMany({
                where: {
                    OR: [
                        {
                            username: {
                                contains: keyword,
                            },
                        },
                        {
                            userAddress: { contains: keyword }
                        },
                    ],
                },
            });
            return result;
        });
    }
    updateUserService(userAddress, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield client_1.default.userInfo.update({
                where: { userAddress: userAddress.toLowerCase() },
                data: data
            });
            return result;
        });
    }
    createUserInfoService(regUserAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            let userAddress = regUserAddress.toLowerCase();
            console.log(userAddress);
            let existUser = yield this.findUsersInfoByAddress(userAddress);
            if (existUser != null) {
                return existUser;
            }
            let currentDateTime = new Date()
                .toISOString();
            let currentTimestamp = Math.floor(Date.now() / 1000);
            let createUser = {
                userAddress: regUserAddress.toLowerCase(),
                createTimestamp: currentTimestamp,
                updateTime: currentDateTime,
                updateTimestamp: currentTimestamp
            };
            let userInfo = {
                username: '',
                nonce: Math.floor(Math.random() * 1000000),
                about: '',
                updateNameTimes: 0,
                createTime: currentDateTime,
                createTimestamp: currentTimestamp,
                updateTime: currentDateTime,
                updateTimestamp: currentTimestamp,
                user: {
                    connectOrCreate: {
                        where: {
                            userAddress: userAddress
                        },
                        create: createUser,
                    }
                }
            };
            const result = yield client_1.default.userInfo.create({ data: userInfo });
            return result;
        });
    }
};
UserService = __decorate([
    (0, typedi_1.Service)(),
    __metadata("design:paramtypes", [])
], UserService);
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map