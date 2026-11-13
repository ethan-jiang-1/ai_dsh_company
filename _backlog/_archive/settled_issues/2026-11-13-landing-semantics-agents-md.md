---
status: 已结
opened: 2026-11-13
---

# 推敲：AGENTS.md 把“落地/走流程”定义错了，agent 用文档搬运冒充落地

> 立卡：2026-11-13 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：note — [Note](../../../notes/implemented/2026-11-13-landing-semantics.md)；“落地 = 系统可验证变更 + 实跑证据”已写进入口/门禁；`待落地` 状态重命名另卡评估。
>
> **审查**：agent — 定义四处入口同句；三条门禁红→绿；`pnpm verify` ALL PASS；`pnpm test` 242 files / 1997 tests；用户验收后归档。

## 问题与期望结果

**用户两次纠正（原话）**：

- “见鬼了，就是你，就是走了个流程，你对系统改了啥嘛？啥都没改呀”
- “按照我们的流程，把这个落地吧——真正的落地，那不就是落地吗？落地到底是什么意义呢？我们流程难道把落地都会理解错吗？”

**问题**：2026-11-13 两次“按流程落地”都被执行成“写 RFC + 搬卡/归档”，`git show --stat` 只有 `_backlog`/`notes`，零系统面。根因不是执行懒，而是 **AGENTS.md / `_backlog` / `dev-loop` 没有定义“落地/走流程”**；`待落地` 状态名 + `去向=rfc` 让“写 RFC”看起来像“落地”。

**期望结果**：fresh agent 只读根 `AGENTS.md` 就能回答——

1. 落地 = 系统里出现可验证的变更（代码/文档/门禁/模板/技能）+ 实跑证据；写 RFC/搬卡/归档不算。
2. 走流程 = 用门禁/证据保证落地正确，不是用流程替代落地；只产出文档必须标“立项/交接”。
3. `去向=rfc` 的卡在定性出口离场；`note`/`implementation` 才要求 `## 落地证据`。

## 当前情况

- 错误示范 1：`711463c9`（issue + 研究题）只改 `_backlog`，用户说“啥都没改”。
- 错误示范 2：`6e56892b`（RFC + 卡归档）只改 `notes`/`_backlog`，用户说“就靠挪来挪去”。
- `AGENTS.md` 原文只有“任务源/五条命令/一条流水线”，没有“落地/走流程”定义；`_backlog/README` 的“落地”出口写“Note 回链”，与 `implementation` 不建 Note 冲突；`dev-loop` 的完成定义没有“用户说落地=实施”。
- 证据：`git show --stat 711463c9 6e56892b`；用户原话（上引）。

## 事实与读者

- 事实：**“落地/走流程”的语义**（不是某个功能）。
- 唯一入口：根 `AGENTS.md` 开工路径 + `_backlog/AGENTS.md` 五道门。
- 读者：fresh agent、卡/RFC 作者、门禁维护者。
- 环境坏法：状态名歧义（`待落地`）、`去向` 分流、文档-only 轮次、agent 讨好式“走流程”。

## 方案与取舍

- **定义**：落地 = 系统可验证变更 + 实跑证据；走流程 = 手段；文档-only 必须标“立项/交接”。
- **出口物**：`rfc` → 定性出口离场；`note`/`implementation` → 过落地门，必须有 `## 落地证据`。
- **门禁**：新 RFC/Note 查非空 `## 状态事实与载体`；新 `待落地` + `note|implementation` 卡查 `## 落地证据` + 可执行标记；新 `## 验收标准` 查可执行标记。
- **输掉的方案**：
  - 只改措辞、不加门禁——下一轮仍会把写 RFC 当落地；
  - 直接重命名 `待落地`→`待实施`——能根治状态名，但 100+ 卡/门禁/模板迁移，另卡评估；
  - 检测“只改 `_backlog`/`notes` 的提交”——误伤合法文档任务，改为卡上 `## 落地证据` 自证。

## 范围与排除项

**做**：定义、`去向` 语义、`## 落地证据` 模板 + 三条门禁、Note。
**不做**：重命名 `待落地` 状态（另卡）；改产品代码；检测文档-only 提交。

## 验收标准

- [x] 根 `AGENTS.md` / `_backlog/AGENTS.md` 各有“落地/走流程”定义；只读根能复述。
- [x] `_backlog/README.md` 落地门与 `去向` 表明确 `rfc` 不在落地门；`implementation` 不再要求 Note 回链。
- [x] `dev-loop §1` 有“用户说落地 = 实施到系统面；只写 RFC/搬卡不算”。
- [x] `_backlog/issues/README.md` 卡模板有 `## 事实与读者` + `## 落地证据` + 验收三列。
- [x] `notes/proposed/README.md` / `notes/README.md` 有 RFC/Note 的事实与载体节。
- [x] `notes/AGENTS.md` / `tests/AGENTS.md` 两扇薄门在场。
- [x] 三条门禁红→绿（RFC 缺节 / Note 缺节 / 卡缺可执行标记 + 落地证据）。
- [x] `pnpm verify` ALL PASS；`pnpm test` 242 files / 1997 tests。

## 落地证据

- 入口：`AGENTS.md`、`_backlog/AGENTS.md`、`_backlog/README.md`、`docs/guides/dev-loop.md`。
- 模板：`_backlog/issues/README.md`、`notes/README.md`、`notes/proposed/README.md`、`notes/AGENTS.md`、`tests/AGENTS.md`。
- 门禁：`checks/gates/proposals.mjs`、`checks/gates/notes-liveness.mjs`、`tools/lib/backlog-liveness.mjs`、`checks/gates/doc-budget.mjs`。
- 一致性：`docs/contracts/data-model.md`、`packages/company-pack/src/README.md`、`_backlog/triggers.md`。
- 命令：`pnpm verify` ALL PASS；`pnpm test` 242 files / 1997 tests；三条 zz 红证删除后复绿。

## 关闭条件

上述验收全绿 + Note 回链；用户验收后归档（本卡已迁 settled_issues）。

## 抽象度

- 换公司要改吗？→ 不会；这是开发流程语义。
- 换产品类型要改吗？→ 不会。
- 换做法要改吗？→ 会；若换 tracker/CI，入口与门禁跟着换，但“落地=可验证变更+证据”不变。
- 只有机制本身变才改吗？→ 是。
- 第二消费者：fresh agent、后续 RFC/Note 作者、门禁维护者。
- 搬家成本：低；定义住现有入口，门是既有 gate 的扩展。
