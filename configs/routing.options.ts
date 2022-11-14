import { RoutingControllersOptions } from 'routing-controllers'
import * as controllers from '../src/controllers'
import * as middlewares from './routing.middlewares'
import * as interceptors from './interceptors'
import { dictToArray } from './utils'

export const routingConfigs: RoutingControllersOptions = {
  controllers: dictToArray(controllers),

  middlewares: dictToArray(middlewares),

  interceptors: dictToArray(interceptors),

  routePrefix: '/apis',

  validation: true,
}
