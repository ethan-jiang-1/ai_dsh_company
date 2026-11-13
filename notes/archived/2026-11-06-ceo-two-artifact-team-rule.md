# 2026-11-06 · CEO 两件套必须组队：MRD+PRD 不允许拆成 vp_* 快捷委托

状态：implemented（2026-11-06；用户实证：`便携式电力异常监测设备设计` 这场两件套动议右侧看板/依赖图/在场全空；
根因 = CEO 把 MRD、PRD 当两份「单职能快捷出稿」分别走 `vp_cmo` / `vp_eng`，没有 `spawn_teammate` → 无 team/task 投影）

## 决定

- CEO persona 的派活规则收紧：**产出两件及以上（如 MRD+PRD）或多职能协作必须 `spawn_teammate` 组队并建任务板**；
  `vp_eng` / `vp_sales` / `vp_cmo` 命名委托只用于**用户明确只要一份、且只属一个职能**的快捷出稿。
- `assembling-the-team` 的产品定义节加同一句（两件套走快捷 = 没有 team/依赖图/面板，收口也没有互审）。
- 新增真模型资产 `checks/lanes/product-team-e2e.entry.mjs`：两件套 prompt → 断言 team 含 cmo+vp-eng、
  无越编、任务板≥2 且 PRD `blockedBy` MRD；`tests/presets` 加两条 keyless 断言把 persona 规则钉住。

## 输掉的方案

- **只靠 assembling-the-team skill**：skill 是按需加载，persona 是每请求常驻；这次实测 persona 的
  「单职能快捷出稿」句子压过 skill 的默认组队，模型走了 `vp_cmo`/`vp_eng` 快捷。
- **两件套也允许 vp_* 直接委派**：没有 team member/task 投影，看板/依赖图/在场只能空；用户看到的正是这个。
- **只加 E2E 不改 persona**：E2E 会红，但没有可执行的规则；persona + skill 同改才让模型有判据。

## 验证（实跑）

- `pnpm test tests/presets` → 32 passed（含新加的两条两件套/快捷路径断言）
- `pnpm verify` → ALL PASS（script-index 已 `--write` 重新生成，119 行）
- `source run/env.sh && node checks/lanes/product-team-e2e.entry.mjs --wall 480` → **ALL PASS（42s）**：
  `members=[cmo,vp-eng]`、无越编、`tasks=2`、`edge=true`
- `presence-e2e-smoke` → ALL PASS（宿主 `agentTeam` 投影，45s；证明空面板不是投影没起）
- 54563 实例（新 pack）已重启；**旧会话的系统提示不变，需新开会话**。

## 后果

- 两件套动议会组队 + 任务板 → 右侧看板/依赖图/在场有数据；单份单职能仍走 `vp_*` 快捷。
- **team member 的人格仍是 lead 继承**（`spawn_teammate` schema 无 preset 参数）；本 Note 只保证角色/任务/
  依赖正确，不保证成员是 CMO/VP-Eng 的 preset 人格——那是另一条（上游 per-member preset）。
- 用户那场 `便携式…` 旧会话已固化旧 persona；新会话才生效。
