# 2026-11-09 · 公司手册的 worker family 边界：按「是否公司角色」派生，不按 ID 白名单

状态：implemented（2026-11-09 交付；上游 = [BUG-047](../../_backlog/_archive/fixed_bugs/BUG-047-worker-family-handbook-scope.md)；根因同 [delegation-surface-single-source](./2026-11-09-delegation-surface-single-source.md)：期望源不覆盖后加 profile）

## 问题

公司手册的注入豁免写成 `handbookSkipPresets: ['worker']`（bundle 配置）与 host 默认 `['worker']`。
2026-11-09 新增 `worker-orchestrator` / `worker-researcher` 后，两个 profile 默认被当成公司角色注入
`Company content (read-only): …` 全文：

- `worker-orchestrator` 的 persona 明写“不读公司手册/CHARTER/journal，除非 brief 明确要求”，
  system prompt 却塞了手册——文案与注入面矛盾；
- `worker-researcher` 只读调研，手册里的汇报线/编制/角色规矩对它只是 token 税；
- 失败类：**family 的边界只对第一个 profile 生效**。新增成员默认继承“公司角色”的注入面，
  靠人记得改列表。

## 决定

1. **归属按「是否公司角色」派生**（2026-11-10 起；原表述 = archetype=worker）：模型新增 `handbookSkipPresets()`，返回
   `archetype === 'worker'` 的全部 preset（`worker` / `worker-researcher` / `worker-orchestrator`）。
   worker family 是执行手，不是公司角色；新增 worker profile 自动继承。company 角色（lead/full）继续注入。
2. **运行时默认取 family**：pack 的 `NON_ROLE_PRESETS` 是唯一运行时表；
   [`handbook.ts`](../../packages/company-pack/src/host/prompt/handbook.ts) 的 `registerHandbook`
   默认 `skipPresets = NON_ROLE_PRESETS`（不再默认空集），`src/index.ts` 只在部署显式配置时传覆盖。
   `cordis.patch.yml` 删掉 `handbookSkipPresets: ['worker']` 的窄覆盖——默认就是对的。
3. **worker-researcher 的取舍写死**：它不注入公司手册；公司事实按 brief 读
   `.dsh-company/kb/company.md`（persona 原本就这么写）。不保留“persona 说不要、系统却给”的矛盾。
4. **验收面**：`tests/host/prompt/handbook.spec.ts` 按模型 `handbookSkipPresets()` 逐个 preset 断言
   section 不注册；`tests/presets/delegation-model.spec.ts` 钉 pack 表 == 模型列表。

## 输掉的方案

- **只把 `worker-orchestrator` 加进配置列表**：下一个 worker profile 还会漏，BUG 复发；没有触及
  “按 ID 白名单”这个根。
- **让 worker-researcher 保留注入**：它的 persona 只需要公司名/业务（company.md），不需要角色/汇报线；
  保留注入会继续制造“persona 说别读、系统却给”的矛盾与 token 税。
- **每个 preset 声明 `handbook: 'skip'` 字段**：能表达，但同一 family 三份重复；archetype 已经声明了
  “这是执行手”，再声明一遍就是第二事实家。
- **直接删掉 `handbookSkipPresets` 配置旋钮**：部署可能想额外排除某个公司角色；保留为**显式覆盖**，
  但默认不靠它。

## 后果

- 新增 worker profile：加进 `PRESET_IDS`/`COMPOSITIONS`（archetype worker）与 pack 的
  `NON_ROLE_PRESETS`；两份 spec 会同时钉住模型与主机默认值，不再靠记忆。
- 公司角色的手册注入不变（`content/AGENTS.md` 仍是只读产品内容；`agent-instructions` 仍只加载
  用户项目自己的 AGENTS.md/CLAUDE.md，两者不混）。
- `cordis.patch.yml` 的注释保留一行示例（注释掉），说明部署要覆盖时怎么写，避免下一个人把窄列表写回来。

## 验证

```sh
pnpm exec vitest run tests/presets/delegation-model.spec.ts tests/host/prompt/handbook.spec.ts
# 绿：2 files / 17 tests passed（handbook family 用例覆盖三个 profile；full role 仍注入）
```

**红形态**：把 `NON_ROLE_PRESETS` 收窄成 `['worker']`（模拟“只跳 leaf”的旧行为）⇒
**2 failed**：模型 parity 用例（`expected [ 'worker' ] to deeply equal [ 'worker', 'worker-researcher', … ]`）
与 handbook family 用例（`worker-researcher: expected [ { name: 'company:handbook', … } ] to have a length of 0 but got 1`）。
还原后 17 passed。

全量 `pnpm verify` / `pnpm test` / `pnpm typecheck` 在同提交收口阶段跑；`vendor/dsh` 零改动。

**真模型/真装配回归（2026-11-09 晚）**：profile 指向当前源码后，`worker-orchestrator` 与
`worker-researcher` 的 system prompt 均不含 `Company content (read-only):`，leaf 仍不含；full role
不变。证据见[研究材料 §9.6](../../_backlog/_archive/research/workflow-subagent-exploration/2026-11-09-post-refactor-round.md)。
