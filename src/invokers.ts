import {
  asClass,
  asFunction,
  AwilixContainer,
  ClassOrFunctionReturning,
  Constructor,
  FunctionReturning,
  Resolver,
  ResolverOptions,
} from "https://raw.githubusercontent.com/KnorpelSenf/awilix/9ce861b2f6738405426d5812927e20a459392024/src/awilix.ts";
import { isClass } from "https://raw.githubusercontent.com/KnorpelSenf/awilix/9ce861b2f6738405426d5812927e20a459392024/src/utils.ts";
import { MethodName } from "https://raw.githubusercontent.com/KnorpelSenf/awilix-router-core/5992af9a874bd3854ef12d936e8f8872ac51480c/src/index.ts";
import { assert } from "https://deno.land/std@0.132.0/testing/asserts.ts";

/**
 * Creates either a function invoker or a class invoker, based on whether
 * the argument can be classified as a class or not. Uses Awilix' `isClass` utility.
 *
 * @param functionOrClass
 * The function or class to invoke.
 *
 * @param opts
 * Resolver options for the class/function.
 */
export function makeInvoker<T>(
  functionOrClass: ClassOrFunctionReturning<T>,
  opts?: ResolverOptions<T>,
) {
  return isClass(functionOrClass)
    ? /*tslint:disable-next-line*/
      makeClassInvoker(functionOrClass as Constructor<T>, opts)
    : /*tslint:disable-next-line*/
      makeFunctionInvoker(functionOrClass as FunctionReturning<T>, opts);
}

/**
 * Returns a function that when called with a name,
 * returns another function to be used as Koa middleware.
 * That function will run `fn` with the container cradle as the
 * only parameter, and then call the `methodToInvoke` on
 * the result.
 *
 * @param, {Function} fn
 * @return {(methodToInvoke: string) => (ctx) => void}
 */
export function makeFunctionInvoker<T>(
  fn: FunctionReturning<T>,
  opts?: ResolverOptions<T>,
) {
  return makeResolverInvoker(asFunction(fn, opts));
}

/**
 * Same as `makeInvoker` but for classes.
 *
 * @param  {Class} Class
 * @return {(methodToInvoke: string) => (ctx) => void}
 */
export function makeClassInvoker<T>(
  Class: Constructor<T>,
  opts?: ResolverOptions<T>,
) {
  return makeResolverInvoker(asClass(Class, opts));
}

/**
 * Returns a function that when called with a method name,
 * returns another function to be used as Koa middleware.
 * That function will run `container.build(resolver)`, and
 * then call the method on the result, passing in the Koa context
 * and `next()`.
 *
 * @param, {Resolver} resolver
 * @return {(methodToInvoke: string) => (ctx) => void}
 */
export function makeResolverInvoker<T>(resolver: Resolver<T>) {
  /**
   * 2nd step is to create a method to invoke on the result
   * of the resolver.
   *
   * @param  {MethodName} methodToInvoke
   * @return {(ctx) => void}
   */
  return function makeMemberInvoker(methodToInvoke: MethodName) {
    /**
     * The invoker middleware.
     *
     * @param  {Koa.Context} ctx
     * @param  {...*} rest
     * @return {*}
     */
    return function memberInvoker(ctx: any, ...rest: any[]) {
      const container: AwilixContainer = ctx.state.container;
      const resolved: any = container.build(resolver);
      assert(
        methodToInvoke,
        `methodToInvoke must be a valid method type, such as string, number or symbol, but was ${
          String(
            methodToInvoke,
          )
        }`,
      );
      return resolved[methodToInvoke](ctx, ...rest);
    };
  };
}

/**
 * Injects dependencies into the middleware factory when the middleware is invoked.
 *
 * @param factory
 */
export function inject(factory: ClassOrFunctionReturning<any> | Resolver<any>) {
  const resolver = getResolver(factory);
  /**
   * The invoker middleware.
   */
  return function middlewareFactoryHandler(ctx: any, ...rest: any[]) {
    const container: AwilixContainer = ctx.state.container;
    const resolved: any = container.build(resolver);
    return resolved(ctx, ...rest);
  };
}

/**
 * Wraps or returns a resolver.
 */
function getResolver<T>(
  arg: ClassOrFunctionReturning<T> | Resolver<T>,
): Resolver<T> {
  if (typeof arg === "function") {
    /*tslint:disable-next-line*/
    return asFunction(arg as any);
  }

  return arg;
}
