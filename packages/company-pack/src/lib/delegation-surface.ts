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
