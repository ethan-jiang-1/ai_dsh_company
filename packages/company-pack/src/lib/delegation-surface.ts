/**
 * 委派面的运行时边界表（pack 内；与 `tools/lib/delegation-model.mjs` 的期望同源）。
 *
 * 为什么 pack 里要有一份：host 注入面随包发布，不能 import 仓内 `tools/lib`（发布面不自包含）；
 * `tests/presets/delegation-model.spec.ts` 钉本表 == 模型 `handbookSkipPresets()`。
 */

/**
 * 非公司角色的 preset：worker family（执行手）+ 质量环能力档（`quality-loop-*` 两个）。
 * 它们是**按 brief/任务书干活的能力档**，不是公司角色 ⇒ ① 不注入角色/汇报线/编制手册
 * （token 税 + persona 矛盾；BUG-047）；② 不装 subagent 控制面（它们的声明里没有这一面，
 * host 不能靠全局注册绕过去；BUG-052）。
 *
 * 新增非角色 preset 先加进这里，模型与 host 同 diff 跟上——默认值取本表，不取某个写死的 preset id。
 */
export const NON_ROLE_PRESETS = [
  'worker', 'worker-researcher', 'worker-orchestrator', 'quality-loop-producer', 'quality-loop-verifier',
] as const

/**
 * 这个 preset 是不是**非角色 support 座位**（worker family / 质量环能力档）。
 *
 * 用途是座位判据，不是安装判据：vendor `agent-team` 把任何没有 parentSession 的 root 都当 Lead，
 * `tool-agent-team` 因此仍会安装团队工具；产品侧只有公司角色才把 team 当可用通道（BUG-072）。
 * 未知 / 缺省 preset 返回 false——不替别的组合猜。
 * @param preset - `composedPresetOf(agent)` 的结果。
 * @returns 属于非角色 support 表则 true。
 */
export function isSupportPreset(preset: string | undefined): boolean {
  return preset !== undefined && (NON_ROLE_PRESETS as readonly string[]).includes(preset)
}
