import { Service } from "typedi";
import prisma from "../helpers/client";
import { Prisma, UserInfo } from "@prisma/client";
import { recoverPersonalSignature } from "eth-sig-util";
import { bufferToHex } from "ethereumjs-util";
import { Decimal } from "@prisma/client/runtime";
import { BigNumber, utils } from "ethers";
import { PointsService } from "./points.service";
import axios from "axios";
import { CompetitionService } from "./competition.service";
import { BigNumber as BigNumber1 } from "bignumber.js";

type Follower = { followerAddress: string; followers: number; ranking: number; points: number; userAddress: string };
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
@Service()
export class UserService {
  private competitionService;
  constructor(private pointService: PointsService) {
    this.competitionService = new CompetitionService()
    
  }
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data: data
    });
  }

  async fetchUserSocialProfile(userAddress: string) {
    let result = await prisma.userTradeAnalysis.findMany({
      where: {
        userAddress
      }
    })
    return result;
  }

  async fetchFollowAndUpdateUserInfo(userAddress: string) {
    // 获取我追踪的列表
    let followingCount = await prisma.userFollowing.count({ where: { userAddress: userAddress.toLowerCase() } });
    // 获取追踪我的列表
    let followersCount = await prisma.userFollowing.count({ where: { followerAddress: userAddress.toLowerCase() } });

    let result = await prisma.userInfo.update({
      where: { userAddress: userAddress.toLowerCase() },
      data: { followers: followersCount, following: followingCount }
    });
    return result;
  }

  async findByAddress(userAddress: string) {
    return await prisma.user.findUnique({
      where: {
        userAddress: userAddress.toLowerCase()
      }
    });
  }

  async getUserInfo(address: string) {
    return await prisma.userInfo.findFirst({
      where: {
        userAddress: address.toLowerCase()
      }
    });
  }

  async userInfoByReferralCode(referralCode: string) {
    return await prisma.userInfo.findFirst({
      where: {
        referralCode
      }
    });
  }

  async updateUserInfos(data: Prisma.UserInfoUpdateManyArgs) {
    return prisma.userInfo.updateMany(data);
  }

  async getRefererUserInfo(userAddress: string) {
    let info = await prisma.$queryRaw<UserInfo[]>`
    SELECT * FROM api."UserInfo" WHERE "referralCode" = 
    (SELECT "referralCode" FROM api."ReferralEvents" WHERE "userAddress" = 
     ${userAddress.toLowerCase()})
     LIMIT 1
     `;

    return info.length === 1 ? info[0] : null;
  }

  // 保存连接钱包的地址
  async saveConnectWalletAddress(userAddress: string) {
    let haveOne = await prisma.connectHistory.findUnique({ where: { userAddress } });
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    if (haveOne) {
      return haveOne;
    } else {
      let data = {
        userAddress: userAddress,
        createTimestamp: currentTimestamp,
        updateTime: currentDateTime,
        updateTimestamp: currentTimestamp
      };
      let user = await prisma.connectHistory.create({ data: data });
      return user;
    }
  }

  // 查询地址是否连接过
  async fetchConnectWallet(userAddress: string) {
    let haveOne = await prisma.connectHistory.findUnique({ where: { userAddress } });
    return haveOne;
  }

  // 查询地址是不是在whitelist
  async fetchWhitelist(userAddress: string) {
    let haveOne = await prisma.whitelist.findUnique({ where: { userAddress } });
    return haveOne;
  }

  // 将地址加入whitelist
  async saveWhitelist(list: string[]) {
    let datalist = [];
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    for (let i = 0; i < list.length; i++) {
      const address = list[i];
      let data = {
        userAddress: address.toLowerCase(),
        createTimestamp: currentTimestamp,
        updateTime: currentDateTime,
        updateTimestamp: currentTimestamp
      };
      let haveOne = await prisma.whitelist.findUnique({ where: { userAddress: address.toLowerCase() } });
      if (haveOne == null || haveOne == undefined) {
        datalist.push(data);
      }
    }
    if (datalist.length > 0) {
      let result = await prisma.whitelist.createMany({ data: datalist });
      return result;
    }
    return null;
  }

  async fetchUsersRank(users: string[]) {
    let multiplierResult = await prisma.rankMultiplier.findMany();
    let currentSeason = await prisma.season.findFirst({ where: { seasonEnd: 0 } });
    let isStartRank = currentSeason == null ? false : true;
    if (isStartRank) {
      let usersStr = users.join("','");

      let sql = `SELECT "userAddress", "isBan", "rank", "tradeCount", "convergePoints", "convergeVol", "referralSelfRewardPoints", "referringRewardPoints", "tradeVol", "tradePoints", eligible, "eligibleCount", "ogPoints", "total"  
      FROM (SELECT row_number() OVER (
          ORDER BY total DESC
      ) AS "rank",
      "tradeCount", 
      CASE WHEN elig.eligible THEN true ELSE false END AS eligible,
      plb."userAddress" AS "userAddress", 
      "convergePoints",
      "convergeVol", 
      "referralSelfRewardPoints",
      "referringRewardPoints", 
      "tradeVol", 
      "tradePoints", 
      "eligibleCount",
      "ogPoints",
      "isBan",
      total
      FROM api."PointsLeaderBoard" AS plb
      LEFT JOIN (SELECT "userAddress", eligible FROM (SELECT "userAddress", SUM("tradeVol") AS "tradeVolTotal" ,CASE WHEN SUM("tradeVol") >= 5000000000000000000 THEN true ELSE false END AS eligible
      FROM api."PointsLeaderBoard" AS plb WHERE season > 0 GROUP BY "userAddress") t WHERE eligible = true) elig
      ON plb."userAddress" = elig."userAddress"
      WHERE season = ${currentSeason.round}
      ORDER BY "total" DESC) nt WHERE nt."userAddress" in (\'${usersStr}\')`;
      let results: any[] = await prisma.$queryRawUnsafe(sql);
      if (results.length > 0) {
        let multiplier = 1;
        let list = JSON.parse(JSON.stringify(results));
        for (let i = 0; i < list.length; i++) {
          const element = list[i];
          let tradeVol = element.tradeVol;
          let isBan = element.isBan;
          let eligible = element.eligible;
          let tradeVolBigNumber = BigNumber.from(tradeVol.toString());
          if (!eligible || tradeVolBigNumber.isZero()) {
            element.rank = 0;
          }
          if (isBan) {
            element.rank = -1;
          }
          for (let a = 0; a < multiplierResult.length; a++) {
            const multiplierItem = multiplierResult[a];
            let startRank = multiplierItem.start_rank;
            let endRank = multiplierItem.end_rank;
            if (startRank <= element.rank && element.rank >= endRank) {
              multiplier = parseFloat(multiplierItem.multiplier.toString());
              element.total = parseFloat((element.total * multiplier).toFixed(1));
              break;
            }
          }
        }
        return list;
      }
    }
    return [];
  }

  // 根据参数地址获取followers
  async followersList(userAddress: string, targetAddress: string, pageNo: number, pageSize: number) {
    if (pageNo > 0) {
      pageNo = pageNo - 1;
      pageNo = pageNo * pageSize;
    }
    let condition = userAddress.toLowerCase();
    if (condition == "") {
      condition = `t."followerAddress"`;
    }
    let followers: Follower[] = await prisma.$queryRaw`
      SELECT
          CASE WHEN uf."userAddress" IS NOT NULL
          THEN true
          ELSE false
          END AS "isFollowing", t."userAddress", t.followers, t.following, t.username, t.about, t.points, t.ranking, string_to_array(t.amm, ',') AS amm
          FROM api."UserFollowing" AS uf
          RIGHT JOIN (
              SELECT 
                "UserFollowing"."userAddress" AS "userAddress", 
                "UserFollowing"."followerAddress" AS "followerAddress", 
                "UserInfo"."followers" AS "followers", 
                "UserInfo"."following" AS "following", 
                "UserInfo"."username" AS "username", 
                "UserInfo"."about" AS "about", 
                "UserInfo"."points" AS "points", 
                "UserInfo"."ranking" AS "ranking",
                "UserInfo"."amm" AS "amm"
              FROM "api"."UserFollowing" 
              JOIN "api"."UserInfo"
              ON "api"."UserFollowing"."userAddress" = "api"."UserInfo"."userAddress" 
              WHERE "api"."UserFollowing"."followerAddress"=${targetAddress.toLowerCase()}
              LIMIT ${pageSize} OFFSET ${pageNo}
            ) t
          ON uf."userAddress" = ${condition}
          AND uf."followerAddress" = t."userAddress";
    `;
    let users = [];
    for (let i = 0; i < followers.length; i++) {
      const element = followers[i];
      users.push(element.userAddress.toLowerCase());
    }
    // ['0x1c6b2888c4268a9c8eaf7eb77a759492bbe10833','0x958d58fbb67666e5f693895edc65f46d051ee304','0x2d528026fef9be28b4c97b10979737b3f445eebd']
    if (users.length > 0) {
      let ranks = await this.fetchUsersRank(users);
      for (let i = 0; i < followers.length; i++) {
        const element = followers[i];
        const userAddress = element.userAddress.toLowerCase();
        for (let r = 0; r < ranks.length; r++) {
          const rank = ranks[r];
          if (userAddress == rank.userAddress) {
            element.points = rank.total;
            element.ranking = parseInt(rank.rank);
          }
        }
      }
    }
    return followers;
  }

  // 根据参数地址获取正在following
  async followingList(userAddress: string, targetAddress: string, pageNo: number, pageSize: number) {
    if (pageNo > 0) {
      pageNo = pageNo - 1;
      pageNo = pageNo * pageSize;
    }
    let condition = userAddress.toLowerCase();
    if (condition == "") {
      condition = `t."userAddress"`;
    }
    let followList: Follower[] = await prisma.$queryRaw`
    SELECT
          CASE WHEN uf."userAddress" IS NOT NULL
          THEN true 
          ELSE false 
          END AS "isFollowing", t."followerAddress", t."followers", t.following, t.username, t.about, t.points, t.ranking, string_to_array(t.amm, ',') AS amm
      FROM api."UserFollowing" AS uf
      RIGHT JOIN (
            SELECT 
              "UserFollowing"."userAddress" AS "userAddress", 
              "UserFollowing"."followerAddress" AS "followerAddress", 
              "UserInfo"."followers" AS "followers", 
              "UserInfo"."following" AS "following", 
              "UserInfo"."username" AS "username", 
              "UserInfo"."about" AS "about", 
              "UserInfo"."points" AS "points", 
              "UserInfo"."ranking" AS "ranking",
              "UserInfo"."amm" AS "amm" 
            FROM "api"."UserFollowing" 
            JOIN "api"."UserInfo"
            ON "api"."UserFollowing"."followerAddress" = "api"."UserInfo"."userAddress" 
            WHERE "api"."UserFollowing"."userAddress"=${targetAddress.toLowerCase()} 
            LIMIT ${pageSize} OFFSET ${pageNo}
        ) t
      ON uf."userAddress" = ${condition}
      AND uf."followerAddress" = t."followerAddress";
    `;
    let users = [];
    for (let i = 0; i < followList.length; i++) {
      const element = followList[i];
      users.push(element.followerAddress.toLowerCase());
    }
    // ['0x1c6b2888c4268a9c8eaf7eb77a759492bbe10833','0x958d58fbb67666e5f693895edc65f46d051ee304','0x2d528026fef9be28b4c97b10979737b3f445eebd']
    if (users.length > 0) {
      let ranks = await this.fetchUsersRank(users);
      for (let i = 0; i < followList.length; i++) {
        const element = followList[i];
        const userAddress = element.followerAddress.toLowerCase();
        for (let r = 0; r < ranks.length; r++) {
          const rank = ranks[r];
          if (userAddress == rank.userAddress) {
            element.points = rank.total;
            element.ranking = parseInt(rank.rank);
          }
        }
      }
    }
    return followList;
  }

  async fetchCodeOwner(code: string) {
    let result = await prisma.userInfo.findFirst({ where: { referralCode: code } })
    if (result != null) {
      return { userAddress: result.userAddress, username: result.username }
    }
    return null
  }

  // userAddress follow followerAddress
  // userAddress following + 1
  // followerAddress follower + 1
  async followUser(userAddress: string, followerAddress: string) {
    if (userAddress.toLowerCase() == followerAddress.toLowerCase()) {
      return null;
    }
    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
      }
    });
    if (haveFollowed == null) {
      let currentDateTime = new Date().toISOString();
      let currentTimestamp = Math.floor(Date.now() / 1000);
      let follow = {
        status: 1,
        createTimestamp: currentTimestamp,
        updateTime: currentDateTime,
        updateTimestamp: currentTimestamp,
        userAddress: userAddress.toLowerCase(),
        followerAddress: followerAddress.toLowerCase()
      };
      try {
        await prisma.userFollowing.create({ data: follow });
      } catch (error) {
        console.log(error);
      } finally {
        await this.fetchFollowAndUpdateUserInfo(userAddress.toLowerCase());
        await this.fetchFollowAndUpdateUserInfo(followerAddress.toLowerCase());
      }
      haveFollowed = await prisma.userFollowing.findUnique({
        where: {
          userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
        }
      });
    }
    return haveFollowed;
  }

  // userAddress follow followerAddress
  // userAddress following - 1
  // followerAddress follower - 1
  async unFollowUser(userAddress: string, followerAddress: string) {
    if (userAddress.toLowerCase() == followerAddress.toLowerCase()) {
      return null;
    }
    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
      }
    });

    if (haveFollowed != null) {
      try {
        await prisma.userFollowing.delete({
          where: {
            userAddress_followerAddress: {
              userAddress: userAddress.toLowerCase(),
              followerAddress: followerAddress.toLowerCase()
            }
          }
        });
      } catch (error) {
        console.log(error);
      } finally {
        await this.fetchFollowAndUpdateUserInfo(userAddress.toLowerCase());
        await this.fetchFollowAndUpdateUserInfo(followerAddress.toLowerCase());
      }
    }
    return haveFollowed;
  }

  async inputReferralCode(code: string, userAddress: string) {
    let userInfo = await prisma.userInfo.findFirst({ where: { referralCode: code } });

    if (userInfo == null || userInfo.userAddress == userAddress.toLowerCase()) {
      return null;
    }

    let myUserInfo = await prisma.userInfo.findUnique({ where: { userAddress: userAddress.toLowerCase() } });
    if (myUserInfo.isInputCode) {
      return null;
    }

    let item = await prisma.referralEvents.findFirst({ where: { userAddress: userAddress.toLowerCase() } });
    if (item == null) {
      let result = await prisma.referralEvents.create({ data: { referralCode: code, userAddress: userAddress.toLowerCase() } });
      let countReferralCode = await prisma.referralEvents.count({ where: { referralCode: userInfo.referralCode } });
      await prisma.userInfo.update({
        where: { userAddress: userInfo.userAddress.toLowerCase() },
        data: { countReferralCode: countReferralCode }
      });
      return result;
    } else {
      return item;
    }
  }

  async saveEvent(name: string, params: any, ip: string, userAgent: string) {
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    if (Array.isArray(params)) {
      let datalist = [];
      for (let i = 0; i < params.length; i++) {
        const element = params[i];
        let data = {
          name: name,
          event: element,
          ip: ip,
          userAgent: userAgent,
          createTime: currentDateTime,
          createTimestamp: currentTimestamp,
          updateTime: currentDateTime,
          updateTimestamp: currentTimestamp
        };
        datalist.push(data);
      }
      await prisma.userEventsLog.createMany({
        data: datalist
      });
    } else {
      await prisma.userEventsLog.create({
        data: {
          name: name,
          event: params,
          ip: ip,
          userAgent: userAgent,
          createTime: currentDateTime,
          createTimestamp: currentTimestamp,
          updateTime: currentDateTime,
          updateTimestamp: currentTimestamp
        }
      });
    }
  }

  async fetchUsernameBy(userAddressList: string[]) {
    let users = await prisma.userInfo.findMany({
      where: {
        userAddress: { in: userAddressList },
      }
    })
    let result = {}
    for (let o = 0; o < userAddressList.length; o++) {
      const element = userAddressList[o];
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (element == user.userAddress) {
          if (user.username != undefined && user.username != null && user.username != "") {
            result[element] = user.username
          } else {
            result[element] = element
          }
        }
      }
    }
    return result
  }

  async authUserService(signature: string, publicAddress: string) {
    // let that = this;
    let accessToken = await prisma.userInfo
      .findUnique({
        where: { userAddress: publicAddress }
      })
      ////////////////////////////////////////////////////
      // Step 1: Get the user with the given publicAddress
      ////////////////////////////////////////////////////
      .then(user => {
        if (!user) {
          throw new Error(`User with publicAddress ${publicAddress} is not found`);
        }
        return user;
      })
      ////////////////////////////////////////////////////
      // Step 2: Verify digital signature
      ////////////////////////////////////////////////////
      .then(user => {
        if (!user.nonce) {
          // Should not happen, we should have already sent the response
          throw new Error('User is not defined in "Verify digital signature".');
        }
        const msg = `\x19Ethereum Signed Message:\nHi there! Welcome to Tribe3!\n\nClick to log in to access your very own profile on Tribe3. Please note that this will not execute any blockchain transaction nor it will cost you any gas fee.\n\nYour Nonce: ${user.nonce}`;
        // We now are in possession of msg, publicAddress and signature. We
        // will use a helper from eth-sig-util to extract the address from the signature
        const msgBufferHex = bufferToHex(Buffer.from(msg, "utf8"));
        const address = recoverPersonalSignature({
          data: msgBufferHex,
          sig: signature
        });
        // The signature verification is successful if the address found with
        // sigUtil.recoverPersonalSignature matches the initial publicAddress
        if (address.toLowerCase() === publicAddress.toLowerCase()) {
          return user;
        } else {
          // Should not happen, we should have already sent the response
          throw new Error("Signature verification failed");
        }
      })
      ////////////////////////////////////////////////////
      // Step 3: Generate a new nonce for the user
      ////////////////////////////////////////////////////
      .then(async user => {
        user.nonce = Math.floor(Math.random() * 10000);
        const result = await prisma.userInfo.update({
          where: { userAddress: user.userAddress },
          data: { nonce: user.nonce }
        });
        return result;
      })
      ////////////////////////////////////////////////////
      // Step 4: Create JWT
      ////////////////////////////////////////////////////
      .then(async user => {
        console.log(user);
        const firebaseToken = await global.firebaseAdmin.auth().createCustomToken(user.userAddress);
        return firebaseToken;
      });
    return accessToken;
  }

  async updateByAddress(userAddress: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: {
        userAddress
      },
      data
    });
  }

  async findUsersInfoByAddress(updateUserAddress: string) {
    let userInfo = await prisma.userInfo.findFirst({
      where: {
        userAddress: updateUserAddress.toLowerCase()
      }
    });

    return userInfo;
  }

  async checkUserName(username: string) {
    const updateUserInfo = await prisma.userInfo.findFirst({
      where: { username: username }
    });

    return updateUserInfo;
  }

  async searchAddressUsername(keyword: string, userAddress: string, pageNo: number, pageSize: number, isAddress: boolean) {
    if (pageNo > 0) {
      pageNo = pageNo - 1;
      pageNo = pageNo * pageSize;
    }
    let searchKeyword = "%" + keyword + "%";
    if (isAddress) {
      let sql = Prisma.sql`SELECT CASE WHEN mf."isFollowing" IS true THEN true ELSE false END AS "isFollowing", uif."userAddress", uif.followers, uif.following, uif.username, uif.about, uif.points, uif.ranking FROM "api"."UserInfo" AS uif
      LEFT JOIN
      (SELECT
            CASE WHEN uf."userAddress" IS NOT NULL 
            THEN true
            ELSE false
            END AS "isFollowing", t."followerAddress", t."followers", t.following, t.username, t.about, t.points, t.ranking, string_to_array(t.amm, ',') AS amm
            FROM api."UserFollowing" AS uf
            RIGHT JOIN (
                  SELECT 
                    "UserFollowing"."userAddress" AS "userAddress", 
                    "UserFollowing"."followerAddress" AS "followerAddress", 
                    "UserInfo"."followers" AS "followers", 
                    "UserInfo"."following" AS "following", 
                    "UserInfo"."username" AS "username", 
                    "UserInfo"."about" AS "about", 
                    "UserInfo"."points" AS "points", 
                    "UserInfo"."ranking" AS "ranking",
                    "UserInfo"."amm" AS "amm" 
                  FROM "api"."UserFollowing" 
                  JOIN "api"."UserInfo"
                  ON "api"."UserFollowing"."followerAddress" = "api"."UserInfo"."userAddress" 
                  WHERE "api"."UserFollowing"."userAddress"=${userAddress.toLowerCase()}
              ) t
            ON uf."userAddress"=${userAddress.toLowerCase()}
            AND uf."followerAddress" = t."followerAddress") mf 
      ON mf."followerAddress" = uif."userAddress"
      WHERE LOWER(uif.username) LIKE ${searchKeyword.toLowerCase()} OR uif."userAddress" LIKE ${searchKeyword.toLowerCase()}
      LIMIT ${pageSize} OFFSET ${pageNo}`;
      let result = await prisma.$queryRaw(sql);
      return result;
    } else {
      let result = await prisma.$queryRaw`
      SELECT
        "userAddress", 
        followers,
        following, 
        username, 
        about, 
        points, 
        ranking
      FROM "api"."UserInfo"
      WHERE LOWER(username) LIKE ${searchKeyword.toLowerCase()} OR LOWER("userAddress") LIKE ${searchKeyword.toLowerCase()} LIMIT ${pageSize} OFFSET ${pageNo}`;
      return result;
    }
  }

  async subscribeUserEmail(email: string) {
    let haveSubscribed = await prisma.subscribeUsers.findUnique({ where: { email } });
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);
    if (haveSubscribed != null) {
      return null;
    } else {
      let data = {
        email: email,
        createTime: currentDateTime,
        createTimestamp: currentTimestamp,
        updateTime: currentDateTime,
        updateTimestamp: currentTimestamp
      };
      let result = await prisma.subscribeUsers.create({ data: data });
      return result;
    }
  }

  async isFollowUser(userAddress: string, followerAddress: string) {
    if (userAddress.toLowerCase() == followerAddress.toLowerCase()) {
      return null;
    }
    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
      }
    });
    return haveFollowed;
  }

  async fetchUserInfo(user: string, targetUser: string) {
    let targetUserInfo: {
      id: string;
      userAddress: string;
      username: string;
      about: string;
      followers: number;
      following: number;
      points: Decimal;
      referralPoints: number;
      referralCode: string;
      isFollowing?: boolean;
      referralUsersCount?: number;
      analysis?: any;
      competition?: any;
    } = await this.findUsersInfoByAddress(targetUser.toLowerCase());
    let analysis = await this.fetchUserSocialProfile(targetUser.toLowerCase());
    if (analysis != null) {
      targetUserInfo.analysis = analysis
    }
    let result = await this.competitionService.getAbsPnlLeaderboard(1);

    if (result != null) {
      let userRecord = null;
      let userRank = 0;
      let userObj = null;
      if (user.length > 0) {
        userRecord = (await this.competitionService.getPersonalLeaderboardRecord(user))[0] ?? null;
        if (userRecord) {
          userRank = result.find(record => record.userAddress == userRecord?.userAddress)?.rank ?? 0;
        }
        userObj = {
          userAddress: user.toLowerCase(),
          username: userRecord?.username ?? "",
          rank: userRank.toString(),
          pnl: userRecord?.absolutePnl ?? "0",
          tradeVol: userRecord?.tradedVolume ?? "0",
          eligible: new BigNumber1(userRecord?.tradedVolume ?? "0").gte(new BigNumber1("5e18"))
        };
      }
      targetUserInfo.competition = userObj;
    }

    if (targetUserInfo == null) {
      return null;
    }

    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: user.toLowerCase(), followerAddress: targetUser.toLowerCase() }
      }
    });
    let isFollowing = false;
    if (haveFollowed != null) {
      isFollowing = true;
    }

    let referralUsersCount = await prisma.referralEvents.count({
      where: { referralCode: targetUserInfo.referralCode }
    });
    targetUserInfo.referralUsersCount = referralUsersCount;
    targetUserInfo.isFollowing = isFollowing;
    return targetUserInfo;
  }

  // async fetchUserInfo(user: string, targetUser: string) {
  //   let targetUserInfo: {
  //     id: string;
  //     userAddress: string;
  //     username: string;
  //     about: string;
  //     followers: number;
  //     following: number;
  //     points: Decimal;
  //     referralPoints: number;
  //     referralCode: string;
  //     isFollowing?: boolean;
  //     referralUsersCount?: number;
  //   } = await this.findUsersInfoByAddress(targetUser.toLowerCase());

  //   if (targetUserInfo == null) {
  //     return null;
  //   }

  //   let haveFollowed = await prisma.userFollowing.findUnique({
  //     where: {
  //       userAddress_followerAddress: { userAddress: user.toLowerCase(), followerAddress: targetUser.toLowerCase() }
  //     }
  //   });
  //   let isFollowing = false;
  //   if (haveFollowed != null) {
  //     isFollowing = true;
  //   }

  //   let referralUsersCount = await prisma.referralEvents.count({
  //     where: { referralCode: targetUserInfo.referralCode }
  //   });
  //   targetUserInfo.referralUsersCount = referralUsersCount;
  //   targetUserInfo.isFollowing = isFollowing;
  //   return targetUserInfo;
  // }

  async updateUserService(userAddress: string, data: any) {
    const result = await prisma.userInfo.update({
      where: { userAddress: userAddress.toLowerCase() },
      data: data
    });
    return result;
  }

  // async test() {
  //   let result: { userAddress: string }[] = await prisma.userInfo.findMany({ where: { referralCode: null } });
  //   for (let i = 0; i < result.length; i++) {
  //     const element: { userAddress: string } = result[i];
  //     await prisma.$queryRaw`CALL GEN_UNIQUE_REFERRAL_CODE(7, ${element.userAddress.toLowerCase()}::TEXT);`;
  //   }
  // }

  async createUserInfoService(regUserAddress: string) {
    let userAddress = regUserAddress.toLowerCase();
    let existUser = await this.findUsersInfoByAddress(userAddress);
    if (existUser != null) {
      return existUser;
    }
    let currentDateTime = new Date().toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);

    let createUser: Prisma.UserCreateInput = {
      userAddress: regUserAddress.toLowerCase(),
      createTimestamp: currentTimestamp,
      updateTime: currentDateTime,
      updateTimestamp: currentTimestamp
    };
    let userInfo: Prisma.UserInfoCreateInput = {
      username: "",
      nonce: Math.floor(Math.random() * 1000000),
      about: "",
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
          create: createUser
        }
      }
    };
    const result: UserInfo = await prisma.userInfo.create({ data: userInfo });
    await prisma.$queryRaw`CALL GEN_UNIQUE_REFERRAL_CODE(7, ${regUserAddress.toLowerCase()}::TEXT);`;
    return result;
  }

  async allUserInfos() {
    let userInfos = await prisma.userInfo.findMany();
    return userInfos;
  }

  async updateDegenScore(userAddress: string) {
    try {
      const result = await axios.get(`https://beacon.degenscore.com/v1/beacon/${userAddress.toLowerCase()}`);
      if (result.status == 200 && result.data) {
        let degenScore = result.data.traits?.degen_score?.value ?? 0;
        const multiplier = await this.pointService.getDegenScoreMultiplier(degenScore);

        let userInfos = await prisma.userInfo.update({
          where: { userAddress: userAddress.toLowerCase() },
          data: { degenScore: degenScore, degenScoreMultiplier: multiplier }
        });
        return userInfos;
      }
    } catch (error) {
      console.log("error", error.message);
      return null;
    }
    return null;
  }
}
