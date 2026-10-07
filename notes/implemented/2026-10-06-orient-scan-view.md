# 2026-10-06 · 扫描入 orient 视图：默认全景带「待核工作候选」节（R3′ 口径）

状态：implemented（已交付 2026-10-06，本文件即毕业 Note——RFC 三件 + 验证记录合一；批准：用户 2026-10-06 两项范围裁决——①视图形态 = 默认全景带扫描节；②规则口径 = R3′ 单视图。授权链 = 用户选「A 后接 B」方向 + 逐项确认；前包 = [scan-rule-iteration](2026-10-06-scan-rule-iteration.md)——R2′/R3′ 采用裁决已落盘，本包是其「接线」半步）

## 问题

R2′/R3′ 已采用（2026-10-06 裁决）但只活在打分腿（`candidate-scan-eval.mjs --variants`）：**驾驭者的日常视图 `pnpm orient` 看不到盘面上有哪些待核候选/阻塞**。orient 公司盘节目前只列 deliverables 目录名，读的人不知道「现在该看谁的活」。仪器最后一步（走到驾驭者眼前）未接。

## 方案

- **lib 侧**（[scripts/lib/orient.mjs](../../tools/lib/orient.mjs)，keyless 纯逻辑）：新增 `scanDeliverables(workspaceRoot)`——遍历 `deliverables/<slug>/`：`final.md` 在场与否、任务书 = `drafts/ceo.md`（CEO 派活行家）、`draftFiles` = drafts 清单；调已采用的 `scanR3Dual`。`orientState` 挂 `scan` 节，`renderOrient` 渲染。
- **视图**：公司盘节后加「== 待核工作候选（R3′ 口径）==」——每 slug 一行：已关闭（final 在场，不报）/ 进行中（候选 N · 阻塞 M；`depByDisk` 标 ᵈ 降档、`stale` 标「待核实」）；空盘如实显示。**命名纪律照抄扫描器头注**：未达零容忍门槛（当前违规 26）只显示「待核候选」，不叫待办、不进个人待办、不自动通知；`needsVerify` 恒真。
- **CLI 侧**（[scripts/tools/orient.mjs](../../tools/orient.mjs)）零新进程效果——扫描纯 fs 只读，走 lib；脚本头注自述同步。
- **范围**：只动默认全景；`--session` / `--scenario` 不动。B 包（r6 真运行闭环）另行 RFC。

## 输掉的方案（备选必载，留尸）

- 显式 `--scan` 子命令——用户否决：默认不可见多一步，容易忘了跑，失「入视图」本意。
- R2′/R3′ 并排显示（像打分表）——视图嘈杂；基线只留打分腿对照。
- 五规则全上——未采用的规则不进日常视图（D32：采用与否 = 用户裁决，视图跟着裁决走）。
- 扫描结果进个人待办/通知——零容忍未达门槛，纪律禁止（扫描器头注 + 评审 §五 B）。

## 验收

机制面（判据先行，vitest orient spec 先红）：

1. **红**：`pnpm test` 新增用例——`scanDeliverables` 不存在即红；红收据入 commit message。
2. **绿**：同一用例断言（fixture = tests 内合成 deliverables，三种形状各一）：①slug 带 `final.md` → 判已关闭不报；②无 final、派活行待办 → 候选/阻塞分列正确；③无 final + 盘上稿 → `depByDisk`/`stale` 降档标记在场。`renderOrient` 断言扫描节标题含「待核工作候选」。
3. **反证**：故意写错期望（如把关闭 slug 断言成报候选）见红 → 还原见绿。
4. **真入口**：`pnpm orient` 实跑（keyless）显示扫描节——当前 `company-workspace/deliverables/` 空 → 如实显示「无动议在盘」；空显示本身 = 行为面走查判据。
5. **门禁**：`pnpm verify` ALL PASS + vitest 全绿；scripts/README 与 orient 脚本头注自述同 diff 更新（枚举型事实家 = 实现自己，D28）。

## 验证记录（红绿收据，全部实跑 2026-10-06）

- **红**：vitest orient spec 新增两用例（三形状扫描 / 渲染节）实跑 **2 failed**（`scanDeliverables` 不存在 + 渲染无扫描节），原 16 项不受扰——实现前已有红，测的正是本条要的东西。
- **绿**：最窄实现后复跑同一文件 **18 passed**；全量 `pnpm test` **36 文件 354 项**（+2）+ `pnpm verify` ALL PASS。
- **反证**：故意把已关闭 slug 断言成报 1 候选 → 红 1 failed（`expected 0 to be 1`）→ 还原 → 绿——判据不是恒真装饰。
- **真入口**：`pnpm orient` 实跑（keyless）——扫描节出现在公司盘节后，空盘如实显示「无动议在盘（deliverables/ 无动议目录）」；另以 lib 直扫排练盘 `runtime/rehearsal-workspace` 见真实数据形状正确（`2026-10-06-multi-user-e2e` 报 2 候选、`stale: true`——CEO 派活行不回写的漂移形状，与 case 14 判定一致）。
- **自述同步**：tools/orient.mjs 头注、scripts/README、docs/orient.md 同 diff 更新。

## 边界与未做

- **扫描根跟 orient 现有 `workspaceRoot`（company-workspace）**：排练盘（`runtime/rehearsal-workspace`，r6 现场）不在默认视图——lib 已支持任意根，扩 CLI 入口（如 `--workspace`）待 B 包真运行闭环时按需另立。
- 扫描结果进个人待办/通知仍被零容忍门槛挡住（当前违规 26）——门槛路径的推敲属 scan-quality 卡（未立，见 _backlog 章制：该不该做未熟，不进实施）。
