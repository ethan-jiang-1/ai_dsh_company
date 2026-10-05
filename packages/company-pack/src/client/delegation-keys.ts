/**
 * 命名委托工具的 wire 工具名——`tool.call.toolview` 的 keyed key。
 *
 * ⚠ 这个列表必须与 `presets/ceo/agent.cordis.yml` ④ 里的 `toolName` **逐字一致**。
 * keyed slot 的 key 域是开放的（槽合同原话："a typo simply never renders"）：拼错**不报错**，
 * 卡片只是永远不出现。所以 `tests/client/client-face.spec.ts` 用一条 keyless 守卫把两边钉在一起，
 * 别靠人眼比对（R3）。
 */
export const DELEGATION_TOOL_KEYS = ['vp_eng', 'vp_sales'] as const
