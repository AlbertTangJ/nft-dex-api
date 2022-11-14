import { join } from "path";
import { print } from "./utils";
import dotenv, { DotenvParseOutput } from "dotenv";
import { Prisma } from "@prisma/client";

// "before" will trigger before the app lift.
export const bootstrapBefore = (): DotenvParseOutput | undefined => {
  // solve ncc path link.
  Prisma.Decimal.set({ rounding: Prisma.Decimal.ROUND_FLOOR, toExpPos: 1000, toExpNeg: -1000 });
  const result = dotenv.config({ path: join(__dirname, "../.env") });
  if (result.error) {
    print.danger('Environment variable not loaded: not found ".env" file.');
    return {};
  }
  print.log(".env loaded.");
  return result.parsed;
};

// "after" will trigger after the "container" mounted..
export const bootstrapAfter = (): any => {};
