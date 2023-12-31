import { Server } from 'http'
import { print } from './configs/utils'
import CONSTANTS from './configs/constants'
import createServer from './configs/application'
import { bootstrapAfter } from './configs/bootstrap'
import firebaseAdmin from "firebase-admin";

module.exports = (async (): Promise<Server | undefined> => {
  try {
    global.firebaseAdmin = firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(
        require("./serviceAccountKey.json")
      )
    });
    const app = await createServer()
    return app.listen(CONSTANTS.PORT, () => {
      print.log(`server listening on ${CONSTANTS.PORT}, in ${CONSTANTS.ENV_LABEL} mode.`)
      bootstrapAfter()
    })
  } catch (e) {
    console.log(e)
  }
})()
