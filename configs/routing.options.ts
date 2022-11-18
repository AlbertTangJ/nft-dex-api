import { RoutingControllersOptions } from 'routing-controllers'
import * as controllers from '../src/controllers'
import * as middlewares from './routing.middlewares'
import * as interceptors from './interceptors'
import { dictToArray } from './utils'
import { Action } from 'routing-controllers';
import async from 'async';
import { ApiResponse, ResponseStatus } from 'src/helpers/apiResponse'
type CheckResult = { result: boolean, message: string };
export const routingConfigs: RoutingControllersOptions = {
  controllers: dictToArray(controllers),

  middlewares: dictToArray(middlewares),

  interceptors: dictToArray(interceptors),

  routePrefix: '/apis',

  validation: true,

  authorizationChecker: async (action: Action, roles: string[]) => {
    let tasks = []

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      if (role == 'auth-token') {
        let checkMessage = "";
        let checkTokenResult = true;
        let checkAuthToken = function (callback: (error: any, data: CheckResult) => void) {
          const token = action.request.headers['auth-token'];
          console.log(token)
          const userAddress = action.request.body.userAddress;
          try {
            let decodedToken = global.firebaseAdmin
              .auth()
              .verifyIdToken(token);
            if (decodedToken.uid != userAddress) {
              checkTokenResult = false;
              checkMessage = `Failed token is not right`;
            }
          } catch (error) {
            checkMessage = error.message;
            checkTokenResult = false;
          }
          let checkResult: CheckResult = { result: checkTokenResult, message: checkMessage };
          callback(null, checkResult);
        }
        tasks.push(checkAuthToken)
      }

      if (role == 'username') {
        let checkUserName = function (callback: (error: any, data: CheckResult) => void) {
          let username = action.request.body.username;
          let checkMessage = ""
          let checkUserNameResult = false
          if (username == "" || username == null) {
            checkUserNameResult = true;
          } else {
            var patten = /^[a-zA-Z0-9_]{5,10}$/;
            let result = patten.test(username);
            if (!result) {
              checkUserNameResult = false;
              checkMessage = "username must be 5-10 characters"
            } else {
              checkUserNameResult = true
            }
          }
          let checkResult: CheckResult = { result: checkUserNameResult, message: checkMessage };
          callback(null, checkResult);
        }
        tasks.push(checkUserName)
      }

      if (role == 'about') {
        let checkAbout = function (callback: (error: any, data: CheckResult) => void) {
          const about = action.request.body.about;
          let checkAboutResult = false
          let checkMessage = ""
          if (about == "" || about == null) {
            checkAboutResult = true;
          } else {
            if (about.length >= 0 && about.length <= 200) {
              checkAboutResult = true;
            } else {
              checkMessage = "about can not over 200 characters"
              checkAboutResult = false
            }
          }
          let checkResult: CheckResult = { result: checkAboutResult, message: checkMessage }
          callback(null, checkResult);
        }
        tasks.push(checkAbout);
      }
    }

    let result = true
    async.parallel(tasks, function (error, results: CheckResult[]) {
      console.log(results);
      for (let i = 0; i < results.length; i++) {
        let check: CheckResult = results[i];
        if (!check.result) {
          result = check.result;
          throw new ApiResponse(ResponseStatus.Failure).setErrorMessage(check.message);
        }
      }
    });
    return result
  },
}
