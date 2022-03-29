import {
  type Middleware,
  Router,
} from "https://deno.land/x/oak@v10.5.1/mod.ts";
import {
  findControllers,
  getStateAndTarget,
  HttpVerbs,
  IAwilixControllerBuilder,
  IStateAndTarget,
  rollUpState,
} from "https://raw.githubusercontent.com/KnorpelSenf/awilix-router-core/5992af9a874bd3854ef12d936e8f8872ac51480c/src/index.ts";
import { makeInvoker } from "./invokers.ts";

/**
 * Constructor type.
 */
export type ConstructorOrControllerBuilder =
  | (new (...args: Array<any>) => any)
  | IAwilixControllerBuilder;

/**
 * Registers one or multiple decorated controller classes.
 *
 * @param ControllerClass One or multiple "controller" classes
 *        with decorators to register
 */
export function controller(
  ControllerClass:
    | ConstructorOrControllerBuilder
    | Array<ConstructorOrControllerBuilder>,
): Middleware {
  const router = new Router();
  if (Array.isArray(ControllerClass)) {
    ControllerClass.forEach((c) =>
      _registerController(router, getStateAndTarget(c))
    );
  } else {
    _registerController(router, getStateAndTarget(ControllerClass));
  }

  return compose([router.routes(), router.allowedMethods()]);
}
function compose(middleware: Middleware[]): Middleware {
  if (!Array.isArray(middleware)) {
    throw new TypeError("Middleware stack must be an array!");
  }
  for (const fn of middleware) {
    if (typeof fn !== "function") {
      throw new TypeError("Middleware must be composed of functions!");
    }
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context, next) {
    // last called middleware #
    let index = -1;
    return dispatch(0);
    function dispatch(i: number): Promise<unknown> {
      if (i <= index) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      index = i;
      let fn = middleware[i];
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve();
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
}
/**
 * Loads controllers for the given pattern.
 *
 * @param pattern
 * @param opts
 */
export async function loadControllers(pattern: string): Promise<Middleware> {
  const router = new Router();
  (await findControllers(pattern)).forEach(
    _registerController.bind(null, router),
  );

  return compose([router.routes(), router.allowedMethods()]) as any;
}

/**
 * Reads the config state and registers the routes in the router.
 *
 * @param router
 * @param ControllerClass
 */
function _registerController(
  router: any,
  stateAndTarget: IStateAndTarget | null,
): void {
  if (!stateAndTarget) {
    return;
  }

  const { state, target } = stateAndTarget;
  /*tslint:disable-next-line*/
  const invoker = makeInvoker(target as any);
  const rolledUp = rollUpState(state);
  rolledUp.forEach((methodCfg, methodName) => {
    methodCfg.verbs.forEach((httpVerb) => {
      let method = httpVerb.toLowerCase();
      if (httpVerb === HttpVerbs.ALL) {
        method = "all";
      }

      router[method](
        methodCfg.paths,
        ...methodCfg.beforeMiddleware,
        invoker(methodName),
        ...methodCfg.afterMiddleware,
      );
    });
  });
}
