import { Service } from "typedi";
import prisma from "../helpers/client";
import { Prisma, UserInfo } from "@prisma/client";

import { recoverPersonalSignature } from "eth-sig-util";
import { bufferToHex } from "ethereumjs-util";
@Service()
export class UserService {
  constructor() { }
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data: data,
    });
  }

  async findByAddress(userAddress: string) {
    return await prisma.user.findUnique({
      where: {
        userAddress: userAddress
      },
    });
  }

  // 获取follow 我的所有人
  async followList(userAddress: string, pageNo: number, pageSize: number) {
    let fansList = await prisma.userFollowing.findMany({
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
  }

  async followingList(userAddress: string, pageNo: number, pageSize: number) {
    let followList = await prisma.userFollowing.findMany({
      where: {
        userAddress: userAddress.toLowerCase(),
      },
      take: pageSize,
      skip: pageNo
    });

    let result = [];
    for (let i = 0; i < followList.length; i++) {
      const follower = followList[i];
      result.push({
        id: follower.id,
        userAddress: follower.userAddress,
        followerAddress: follower.followerAddress,
        status: follower.status,
      });
    }
    return result;
  }

  async followUser(userAddress: string, followerAddress: string) {
    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: { userAddress: userAddress.toLowerCase(), followerAddress: followerAddress.toLowerCase() }
      }
    });
    if (haveFollowed == null) {
      let currentDateTime = new Date()
        .toISOString();
      let currentTimestamp = Math.floor(Date.now() / 1000);
      let follow: Prisma.UserFollowingCreateInput = {
        status: 1,
        createTimestamp: currentTimestamp,
        updateTime: currentDateTime,
        updateTimestamp: currentTimestamp,
        followerUser: {
          connect: {
            userAddress: userAddress.toLowerCase()
          }
        },
        followingUser: {
          connect: {
            userAddress: followerAddress.toLowerCase()
          }
        }
      };
      let result = await prisma.userFollowing.create({ data: follow });
      return result
    }
    return haveFollowed;
  }

  async unFollowUser(userAddress: string, followerAddress: string) {
    let haveFollowed = await prisma.userFollowing.findUnique({
      where: {
        userAddress_followerAddress: {
          userAddress: userAddress.toLowerCase(),
          followerAddress: followerAddress.toLowerCase(),
        }
      },
    });
    if (haveFollowed != null) {
      let result = await prisma.userFollowing.delete({
        where: {
          userAddress_followerAddress: {
            userAddress: userAddress.toLowerCase(),
            followerAddress: followerAddress.toLowerCase(),
          }
        }
      });
      return result;
    }
    return haveFollowed;
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
    let userInfo = await prisma.userInfo.findUnique({
      where: {
        userAddress: updateUserAddress.toLowerCase()
      },
    });
    return userInfo;
  }

  async checkUserName(username: string) {
    const updateUserInfo = await prisma.userInfo.findUnique({
      where: { username: username },
    });

    return updateUserInfo;
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
    return result;
  }
}
