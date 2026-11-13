# 2026-11-11 · 委派合同事实纠偏：maxDepth 行上限、team 上下文、通道标签与 vendor parity

状态：implemented（2026-11-11；上游 = 委派合同事实纠偏卡；只改模型/合同/文档/测试，不改运行时行为）
上游 = [委派合同事实纠偏](../../_backlog/_archive/settled_issues/2026-11-11-delegation-contract-truth.md)

> 现行语义（canonical）= 文末链接；本 Note 只留决定/理由/证据，不复制现行表。

## 决定

1. **`maxDepth` 是这一行的绝对 child 深度上限，不是“child 不能再派”的链预算。** CEO 的命名行 1 只钉直接 child；child 再派看它自己 preset 的行（vp-eng 的通用 `subagent` 行 = 3）。CEO preset 注释与 `tests/presets/presets.spec.ts` 的文案改成这个口径；`delegation-composition.spec.ts` 加“CEO 行 1 + vp-eng 行 3 同时在场”的组合钉子。
2. **team 上下文是可选参数，不是硬继承。** `CHANNELS.team.inheritsParentContext` 从 `true` 改为 `'optional'`，新增 `context: 'fresh | fork (default fresh)'`；docs 写“默认 fresh；要带 Lead 已完成轮才显式 fork；当前任务书不在 fork 种子里”。CEO 的 `chairing-staff-meeting` 同 diff 改口。
3. **`teamLead` 改名为 `teamLeadWhenRoot`。** 它是 preset 级期望；运行时任何 root 都是 Lead（worker/support root 也拿到团队工具），注入侧必须用 `agentTeams.membership`/`parentSession` 判，并叠加 support 座位（不列 team、guard 拒 spawn——见 [seat Note](./2026-11-11-capability-seat-single-source.md)），不能只看这个字段。
4. **控制面标签分开。** `CHANNELS.*.control` 拆成 `nativeControl`（vendor 名字）与 `repoControl`（本仓 workaround：`list_subagents`/`send_to_subagent`/`workflow_runs`）；不再把 workaround 写成通道硬能力。
5. **通道分类归原生四通道。** A/B/D 只作组织别名：A = spawn，B = team，D = workflow；C（dsh-sdk）标未启用；fork 补进能力矩阵。`docs/architecture.md`、`docs/reference/terminology.md`、`docs/contracts/delegation.md` 同 diff 更新。
6. **加 vendor-parity 钉子。** `tests/contract/delegation-channel-parity.spec.ts` 直接读 vendor 源码断言 provider 能力位/team context/workflow options，并断言模型字段与之一致；升级 pin 时措辞变了就红。

## 输掉的方案

- **只改 CEO 注释与测试文案**：模型里的 team context/control 标签仍是谎报，下一轮还会把“期望源”当真。
- **加一条真模型行为测试证明 child 能派活**：真值表 + `resolveChildDepth` 源码已足够；真模型只增加成本与不稳定。
- **删掉 A/B/C/D 整表**：会丢掉组织别名；保留映射、能力矩阵归原生四通道更稳。
- **直接 import provider 类做 parity**：spawn/fork provider 只导出 `apply`，能力位在模块内部 class 上；import 会拉起 Cordis 依赖。用源码断言 + 固定路径，升级时红。

## 后果

- `delegation-model` 仍是“期望源”，但团队/控制面字段不再伪装成 vendor 硬能力；运行时权限另判。
- docs 的“fork 下发会议上下文”默认机制句消失；团队上下文以 fresh + 任务书为默认，fork 是可选。
- 六个角色/工具面没有变化；`preset-smoke` 仍全绿。

## 验证（实跑）

- **红**：修前 `pnpm exec vitest run tests/contract/delegation-channel-parity.spec.ts` → **3 failed / 3 passed**（team context、control 标签、`teamLeadWhenRoot` 字段各一）。还原配方 = 把 `CHANNELS.team.inheritsParentContext` 改回 `true` 并去掉 `nativeControl`/`repoControl` → 同 spec 红。
- **绿**：同命令修后 **6 passed**；`pnpm test tests/presets` → **128 passed**；`pnpm test` → **194 files / 1561 tests passed**；`pnpm typecheck` 绿；`source run/env.sh && node checks/lanes/preset.entry.mjs` → **ALL PASS（6 角色 + 5 非角色）**；`pnpm verify` → **ALL PASS**。
- 证据边界：parity spec 只证“模型字段与 vendor 源码一致”，不证运行时工具面；运行时面由 `preset-smoke` 与 `surface-matrix` 另证。

## 现行语义（canonical）

- [delegation 合同](../../docs/contracts/delegation.md) · [architecture 协作通道](../../docs/architecture.md) · [terminology](../../docs/reference/terminology.md) · [presets 四形态](../../docs/contracts/presets.md)
- 模型 = [tools/lib/delegation-model.mjs](../../tools/lib/delegation-model.mjs)；钉子 = [delegation-channel-parity.spec.ts](../../tests/contract/delegation-channel-parity.spec.ts)

## 相关

- 上游卡：[2026-11-11 委派合同事实纠偏](../../_backlog/_archive/settled_issues/2026-11-11-delegation-contract-truth.md)
- 研究题：[dsh-native-orchestration-fit](../../_backlog/_archive/research/dsh-native-orchestration-fit/README.md)
- 后续卡：[委派政策能力域化](../../_backlog/_archive/settled_issues/2026-11-11-delegation-policy-capability-scoped.md)
