/**
 * 委派面的运行时边界表（pack 内；与 `tools/lib/delegation-model.mjs` 的期望同源）。
 *
 * 为什么 pack 里要有一份：host 注入面随包发布，不能 import 仓内 `tools/lib`（发布面不自包含）；
 * `tests/presets/delegation-model.spec.ts` 钉本表 == 模型 `handbookSkipPresets()`。
 */

/**
 * worker family：执行手，不是公司角色。按 brief 干活，不读角色/汇报线/编制手册
 * （token 税 + persona 矛盾；BUG-047）。新增 worker profile 先加进这里，模型与 host 同 diff 跟上——
 * 默认值取本表，不取某个写死的 preset id。
 */
export const WORKER_FAMILY_PRESETS = ['worker', 'worker-researcher', 'worker-orchestrator'] as const
