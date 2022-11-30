import { PrismaClient } from '@prisma/client'

export const db_functions = async () => {
    
    let prismaClient = new PrismaClient();
    try {
        await prismaClient.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "UserInfo_code_unique" ON api."UserInfo" ("referralCode");
      `
      
      await prismaClient.$executeRaw`
          CREATE OR REPLACE PROCEDURE gen_unique_referral_code(IN digits INTEGER, IN user_address TEXT)
          AS $$
          DECLARE
              referral_new_code TEXT;
          BEGIN
              LOOP
                  referral_new_code := UPPER(SUBSTRING(MD5(''||NOW()::TEXT||RANDOM()::TEXT) FOR digits));
                  BEGIN
                      UPDATE api."UserInfo" SET "referralCode"=referral_new_code WHERE api."UserInfo"."userAddress" = user_address;
                      EXIT;
                  EXCEPTION WHEN unique_violation THEN
                  END;
              END LOOP;
          END;
          $$ LANGUAGE PLPGSQL;`
    } catch(error) {
        console.log(error)
    }
}
