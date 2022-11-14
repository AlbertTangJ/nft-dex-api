import { Service } from "typedi";
import prisma from "../helpers/client";
import { Prisma, User } from "@prisma/client";

@Service()
export class UserService {
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data: data,
    });
  }

  async findByAddress(userAddress: string) {
    return prisma.user.findUnique({
      where: {
        userAddress,
      },
    });
  }

  async updateByAddress(userAddress: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: {
        userAddress,
      },
      data,
    });
  }
}
