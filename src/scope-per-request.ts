import { AwilixContainer } from 'https://raw.githubusercontent.com/KnorpelSenf/awilix/9ce861b2f6738405426d5812927e20a459392024/src/awilix.ts';

/**
 * Koa middleware factory that will create and attach
 * a scope onto a content.
 *
 * @param  {AwilixContainer} container
 * @return {Function}
 */
export function scopePerRequest(container: AwilixContainer) {
  return function scopePerRequestMiddleware(ctx: any, next: Function) {
    ctx.state.container = container.createScope();
    return next();
  };
}
