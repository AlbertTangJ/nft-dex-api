import { Service } from "typedi";
import prisma from "../helpers/client";
import { Prisma, UserInfo } from "@prisma/client";

import { recoverPersonalSignature } from "eth-sig-util";
import { bufferToHex } from "ethereumjs-util";
type Follower = { followerAddress: string, followers: number, ranking: number }
@Service()
export class UserService {
  constructor() { }
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data: data,
    });
  }

  async fetchFollowUserInfo(userAddress: string) {
    // 获取我追踪的列表
    let followingCount = await prisma.userFollowing.count({ where: { userAddress: userAddress.toLowerCase() } });
    // 获取追踪我的列表
    let followersCount = await prisma.userFollowing.count({ where: { followerAddress: userAddress.toLowerCase() } });

    return { followers: followersCount, following: followingCount }
  }

  async findByAddress(userAddress: string) {
    return await prisma.user.findUnique({
      where: {
        userAddress: userAddress
      },
    });
  }

  // 根据参数地址获取followers
  async followersList(userAddress: string, targetAddress: string, pageNo: number, pageSize: number) {
    if (pageNo > 0) {
      pageNo = pageNo - 1
      pageNo = pageNo * pageSize
    }
    let condition = userAddress.toLowerCase();
    if (condition == '') {
      condition = `t."followerAddress"`
    }
    let followers: Follower[] = await prisma.$queryRaw`
      SELECT
          CASE WHEN uf."userAddress" IS NOT NULL
          THEN true 
          ELSE false
          END AS "isFollowing", t."userAddress", t."followers", t.following, t.username, t.about, t.points, t.ranking
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
              "UserInfo"."ranking" AS "ranking" 
            FROM "api"."UserFollowing" 
            JOIN "api"."UserInfo"
            ON "api"."UserFollowing"."userAddress" = "api"."UserInfo"."userAddress" 
            WHERE "api"."UserFollowing"."followerAddress"=${targetAddress.toLowerCase()} 
            LIMIT ${pageSize} OFFSET ${pageNo}
        ) t
      ON uf."userAddress" = ${condition}
      AND uf."followerAddress" = t."userAddress";
    `;
    return followers;
  }

  // 根据参数地址获取正在following
  async followingList(userAddress: string, targetAddress: string, pageNo: number, pageSize: number) {
    if (pageNo > 0) {
      pageNo = pageNo - 1
      pageNo = pageNo * pageSize
    }
    let condition = userAddress.toLowerCase();
    if (condition == '') {
      condition = `t."userAddress"`
    }
    let followList: Follower[] = await prisma.$queryRaw`
      SELECT
          CASE WHEN uf."userAddress" IS NOT NULL
          THEN true 
          ELSE false 
          END AS "isFollowing", t."followerAddress", t."followers", t.following, t.username, t.about, t.points, t.ranking
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
              "UserInfo"."ranking" AS "ranking" 
            FROM "api"."UserFollowing" 
            JOIN "api"."UserInfo"
            ON "api"."UserFollowing"."followerAddress" = "api"."UserInfo"."userAddress" 
            WHERE "api"."UserFollowing"."userAddress"=${targetAddress.toLowerCase()} 
            LIMIT ${pageSize} OFFSET ${pageNo}
        ) t
      ON uf."userAddress" = ${condition}
      AND uf."followerAddress" = t."followerAddress";
    `;
    return followList;
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
      let result = await prisma.$transaction(async (tx) => {
        let result = await tx.userFollowing.create({ data: follow });
        if (result != null) {
          let updateFollowing = await tx.userInfo.update({
            where: { userAddress: userAddress.toLowerCase() },
            data: { following: { increment: 1 } }
          })
          await tx.userInfo.update({
            where: { userAddress: followerAddress.toLowerCase() },
            data: { followers: { increment: 1 } }
          })

          return updateFollowing;
        }
      })
      return result;
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
        userAddress_followerAddress: {
          userAddress: userAddress.toLowerCase(),
          followerAddress: followerAddress.toLowerCase(),
        }
      },
    });
    if (haveFollowed != null) {
      let result = await prisma.$transaction(async (tx) => {
        let result = await tx.userFollowing.delete({
          where: {
            userAddress_followerAddress: {
              userAddress: userAddress.toLowerCase(),
              followerAddress: followerAddress.toLowerCase(),
            }
          }
        });
        if (result != null) {
          let userUpdateResult = await tx.userInfo.update({ where: { userAddress: userAddress.toLowerCase() }, data: { following: { decrement: 1 } } })
          await tx.userInfo.update({
            where: { userAddress: followerAddress.toLowerCase() },
            data: { followers: { decrement: 1 } }
          })

          return userUpdateResult;
        }
      })
      return result;
    }
    return haveFollowed;
  }

  async inputReferralCode(code: string, userAddress: string) {
    let userInfo = await prisma.userInfo.findFirst({ where: { referralCode: code } })
    if (userInfo.userAddress == userAddress.toLowerCase()) {
      return null;
    }
    let item = await prisma.referralEvents.findFirst({ where: { referralCode: code, userAddress: userAddress.toLowerCase() } })
    if (item == null) {
      let result = await prisma.referralEvents.create({ data: { referralCode: code, userAddress: userAddress.toLowerCase() } });
      return result;
    } else {
      return item;
    }
  }

  async saveEvent(name: string, params: any) {
    await prisma.userEventsLog.create({ data: { name: name, event: params } })
  }

  async authUserService(signature: string, publicAddress: string) {
    // let that = this;
    let accessToken = await prisma.userInfo.findUnique({
      where: { userAddress: publicAddress },
    })
      ////////////////////////////////////////////////////
      // Step 1: Get the user with the given publicAddress
      ////////////////////////////////////////////////////
      .then((user) => {
        if (!user) {
          throw new Error(
            `User with publicAddress ${publicAddress} is not found`
          );
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
        const msgBufferHex = bufferToHex(Buffer.from(msg, "utf8"));
        const address = recoverPersonalSignature({
          data: msgBufferHex,
          sig: signature,
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
      .then(async (user) => {
        user.nonce = Math.floor(Math.random() * 10000);
        const result = await prisma.userInfo.update(
          {
            where: { userAddress: user.userAddress },
            data: { nonce: user.nonce }
          },
        );
        return result;
      })
      ////////////////////////////////////////////////////
      // Step 4: Create JWT
      ////////////////////////////////////////////////////
      .then(async (user) => {
        console.log(user)
        const firebaseToken = await global.firebaseAdmin
          .auth()
          .createCustomToken(user.userAddress);
        return firebaseToken;
      });
    return accessToken;
  }


  async updateByAddress(userAddress: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: {
        userAddress,
      },
      data,
    });
  }

  async findUsersInfoByAddress(updateUserAddress: string) {
    let userInfo = await prisma.userInfo.findFirst({
      where: {
        userAddress: updateUserAddress.toLowerCase()
      },
    });
    return userInfo;
  }

  async checkUserName(username: string) {
    const updateUserInfo = await prisma.userInfo.findFirst({
      where: { username: username },
    });

    return updateUserInfo;
  }

  async searchAddressUsername(keyword: string) {
    let result = await prisma.userInfo.findMany(
      {
        where: {
          OR: [
            {
              username: {
                contains: keyword,
              },
            },
            {
              userAddress:
                { contains: keyword }
            },
          ],
        },
      }
    )

    return result;
  }

  async fetchUserInfo(user: string, targetUser: string) {
    let targetUserInfo: { id: string, userAddress: string, username: string, about: string, followers: number, following: number, points: number, referralPoints: number, referralCode: string, isFollowing?: boolean, referralUsersCount?: number } = await this.findUsersInfoByAddress(targetUser.toLowerCase());
    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: user.toLowerCase(), followerAddress: targetUser.toLowerCase() }
      }
    });
    let isFollowing = false
    if (haveFollowed != null) {
      isFollowing = true
    }
    let referralUsersCount = await prisma.referralEvents.count({
      where: { referralCode: targetUserInfo.referralCode }
    })
    targetUserInfo.referralUsersCount = referralUsersCount
    targetUserInfo.isFollowing = isFollowing
    return targetUserInfo;
  }

  async updateUserService(userAddress: string, data: any) {
    const result = await prisma.userInfo.update(
      {
        where: { userAddress: userAddress.toLowerCase() },
        data: data
      },
    );
    return result;
  }

  async test() {
    let result: { userAddress: string }[] = await prisma.userInfo.findMany();
    for (let i = 0; i < result.length; i++) {
      const element: { userAddress: string } = result[i];
      await prisma.$queryRaw`CALL GEN_UNIQUE_REFERRAL_CODE(7, ${element.userAddress.toLowerCase()}::TEXT);`
    }

  }

  async createUserInfoService(regUserAddress: string) {
    let userAddress = regUserAddress.toLowerCase();
    let existUser = await this.findUsersInfoByAddress(userAddress);
    if (existUser != null) {
      return existUser;
    }
    let currentDateTime = new Date()
      .toISOString();
    let currentTimestamp = Math.floor(Date.now() / 1000);

    let createUser: Prisma.UserCreateInput = {
      userAddress: regUserAddress.toLowerCase(),
      createTimestamp: currentTimestamp,
      updateTime: currentDateTime,
      updateTimestamp: currentTimestamp
    }
    let userInfo: Prisma.UserInfoCreateInput = {
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
    }
    const result: UserInfo = await prisma.userInfo.create({ data: userInfo });
    await prisma.$queryRaw`CALL GEN_UNIQUE_REFERRAL_CODE(7, ${regUserAddress.toLowerCase()}::TEXT);`
    return result;
  }
}
