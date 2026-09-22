import { WocheBrandName } from "./Brand.js";
/** Required service: the UI slot registry. */
export const inject = ['slots'];
/**
 * Register the deployment's brand name in the sidebar.
 * @param ctx - Client root context.
 */
export function apply(ctx) {
    ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({ name: 'sidebar.brand.name' }, WocheBrandName));
}
//# sourceMappingURL=index.js.map