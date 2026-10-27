---
status: 推敲中
opened: 2026-10-28
---

# 推敲：第四轮六维打扫——金样假绿、授权门牌截断与延后的结构债

> 立卡：2026-10-28 ｜ 状态：推敲中 ｜ 类型：任务 ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：（未关闭；用户已批全批 A–E，实施中）

**问题与期望结果：** 距第三轮打扫（2026-10-27）只隔一天，但同日收口的“六维提分”把 D1/D4/D5 自评到 A-，并声称 0.3.15 已清理失效引用。用户要求以 fresh agent 视角重新评估六维、把问题挖透、再决定持续改善的批次。期望结果 = 带一手证据的六维复评、分级问题清单、可分批实施的改善方案；本轮推敲完成 = 用户 REVIEW 选批并把批次写进本卡。

**当前情况：** 审计报告 = [research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md](../research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。主 agent 亲跑 `pnpm verify`（50 门 ALL PASS + 2 SKIP）、`pnpm test`（106 spec / 954 例）、`pnpm typecheck`、`pnpm test:coverage`（85.73/79.02/85.08/89.65）、`release --check`（READY 0.3.15）、`orient`/`diagnose`，并连续三次跑 `ui-scene-smoke --isolated --golden`（**三次全红、两种差异**）；五个独立子代理分别深挖 D1+D3/D2/D4/D5/D6。**复评：D1 B / D2 B / D3 B / D4 B / D5 B / D6 C；上一轮“六维全部 A-”不成立。**

**两个必须先处理的硬问题：**

1. **UI 金样回归网假绿/假红混合**：隔离场景继承 `DSH_COMPANY_BOOTSTRAP=off`，公司盘无骨架；`cdp-probe` 在异步读取稳定前抓文本，金样把“读取中… / 读取团队状态…”钉成期望；`verify` 只查金样形状，所以 50 门全绿而真页面 exit 1。三次实跑差异不同（培养/台账 → 培养/成品 → 成品）。
2. **`diagnose` 仍会说 `FAILURES none`**：`tool/result` 的 `[exit code: 1]` 不是 `isError`；实测 `session-01b060a7` 有 8 条非零退出、`toolErrors=0`、`FAILURES none`、exit 0。等用户回答/等审批会被误诊“进程被杀”，child 会话（无 `session-` 前缀）不可 diagnose，`team/member.phase=failed` 不折。

**结构面主债：** 不是目录平铺，而是四个入口级巨函数（host `apply` 326 行、client `apply` 201 行、`CultivationBoard` 483 行、`cultivationCommandHandler` 338 行）+ 重复小工具（`isRecord`×3、`clip`×3、`parseCatalog` 埋在 .tsx）+ 测试分区错位（6 个 `tools/lib` spec 住 `tests/company`）+ 用户可见面缺测（`createCompanyView` 全仓 0 import、`useWorkspaceText` 0 用例、观察者生产接线未证）。

**未决问题：**

- 是否接受本轮评分（尤其 D6 = C，即“用户症状腿仍断”）。
- 批 A（真实性/安全）与批 B（UI 反馈车道）是否现在做；批 C（diagnose 真话）是否紧随。
- 批 D（用户可见面补测）与批 E（拆巨人/收家）的取舍与顺序。
- UI 症状捕获走哪条：只修金样稳定性 / 加 `cdp-probe --attach <devtools-port>` 接用户正在跑的页面 / 再加 `--steps` 交互脚本。

**下一步：** 用户已于 2026-10-28 批全批（A–E），按批落 commit + Note；每批跑对应真检查。批 A 已落（[Note](../../notes/implemented/2026-10-28-r4-batch-a-truth.md)），批 B 已落（[Note](../../notes/implemented/2026-10-28-r4-batch-b-ui-lane.md)），继续 C→D→E。

## 范围与排除项

**范围：** 六维（文档/代码结构与渐进披露、代码与测试层次、文档—执行—验收结构、上下文腐化、测试资产、日志与端到端反馈）的评估与改善；允许改 docs/、tests/、checks/、company-pack src 与预设完成定义。

**排除：** 真模型认证档（需成本授权）；vendor/dsh 内部机制重校；公司业务产物质量；preset persona 文案质量；全量 notes 两两比对。

## 已知与未决

**已知（实跑/实读）：**

| 维 | 本轮 | 关键证据 |
|---|---|---|
| D1 | B | 入口 82/32/92 行；但 Plan Mode 不在首屏；ledger/外部研究指针仍指 index；18/35 文档无“什么时候读”；11/32 预算 <5%；两篇新指南无预算。 |
| D2 | B | 0 反向边 / 0 环 / 0 无测试模块；巨函数 326/201/483/338 行；`isRecord`×3、`clip`×3；6 个 tools/lib spec 住 company 区；同名 spec。 |
| D3 | B | 收尾/授权已单家；但 `_backlog/AGENTS.md` 丢“常设指令”、bugs README 缩成“P0/严重/变向”；preset 完成定义 4 份；§1 实施→选证据 vs 测试先行；无一张总图。 |
| D4 | B | release/pin 干净；但 tests/README 仍写“语料回放 = 升 pin 第一道”，release.md 明说不要；0.3.15 CHANGELOG 过度收口；48 vs 50；`snapshots/ui` 死路径。 |
| D5 | B | 954 例、覆盖 85.7/79.0；但 CompanyView 16.1% stmts/20.8% lines、company-tabs 24.1%、CultivationTab 0%、client/index 分支 13.3%；金样不稳。 |
| D6 | C | 真页面 9/9 能看；但 client 错误不进会话、错误环刷新即失、探针只看新页、diagnose 漏 8 条非零退出/等审批/child、启动崩溃丢 stderr、无交互步骤。 |

**未决：** 批次取舍；`--attach`/`--steps` 的成本收益；拆巨人的回归风险；是否把 D6 的“用户症状腿”作为下一轮专项。

## 方案与取舍

- **方案 A（推荐先做）：真实性/安全 + UI 车道**——先修授权门牌、回放真值、导航计数、金样稳定与启动日志；成本 1–1.5 天，风险低，先把“门禁全绿”与“真页面全绿”对齐。
- **方案 B：A + diagnose 真话**——再加 1 天，直接减少 agent 误诊；建议紧随。
- **方案 C：A + B + 测试补强**——再加 1–2 天，覆盖用户可见面；风险中低。
- **方案 D：全做（含拆巨人/收家）**——再加 2–4 天；收益是结构层次，风险在巨函数行为回归，需要按现有缝拆并逐步跑测试。
- **不建议：** 全量重排 `tests/*`/`src/client` 目录、改 CSS Modules、给每目录加 barrel；这些在 D2 子代理里有反证（成本高于导航收益）。

## 验收标准

- 批 A：`pnpm verify` + `pnpm test` 全绿；活文档/头注无 `snapshots/ui` / `48 个模块` / `语料回放全绿`；门牌只留指针。
- 批 B：`ui-scene-smoke --isolated --golden` 连续 3 次 exit 0；改一个页签文本 → 红；启动失败证据目录含 web.log。
- 批 C：`diagnose` 对真实 `session-01b060a7` 报出非零 bash 退出；等问/等审批不再误诊“崩溃”；child 可 diagnose。
- 批 D：CompanyView / workspace-text / 观察者接线 / host 生命周期各有行为级 spec；tools/lib spec 迁回 harness；重名 spec 消除。
- 批 E：四个巨函数拆到可点名子行为；`parseCatalog`/`isRecord`/`clip` 收家；`src-layering` 补动态导入/require/注释盲区。
- 六维复评：D1–D6 全部 ≥ A-（至少给出逐维证据；不达项写“不做/以后做”及理由）。

## 关闭条件

- 用户选定批次并落地；每批 `verify`/`test`/（涉类型时）`typecheck` + 对应真检查全绿；
- 六维复评有更新后的分数与证据；未做项明确写“不做/以后做”及理由；
- 本卡写结论/去向并按 `_backlog` 章程归档或转 RFC/Note。
