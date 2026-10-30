---
topic: 仓库卫生
intent: "2026-10-30 第二轮 notes/ 复核的实证：5 簇 74 篇逐篇对账、已执行的事实落点修正与删除、与首轮/子代理判断的分歧，以及 notes 层外的代码发现。供下一轮复核与 code owner 接手。"
---

# notes 分诊 · 2026-10-30 · 第二轮（全树复核）

> 运行口径：`node tools/notes-audit.mjs --json` 机械基线 + 5 个并行**只读**子代理分簇逐篇对账
> （74 篇 `implemented/` 全覆盖）+ 主 agent 回读对侧证据（工具/合同原文）后执行。
> 规则 = [notes/README §五](../../../../notes/README.md)；程序 = notes-consistency-audit skill。
> **报告不是 Note**；本轮没有新增/搬迁任何 Note。
> 基线：implemented 74 / archived 69 / receipts 21；硬项（死路径 / 取代缺回链 / 状态行）全 0；零 Note 入链 41。

## 一、结论

- **结构层没有新的漏网**：首轮的分层站得住，本轮 **0 篇**需要归档或移入 receipts；两篇
  「像收据」的批次 Note（`r4-batch-c-diagnose`、`fresh-agent-consistency-sweep`）正文都带仍现行的
  `## 决定`，按「体裁不是判据」保留。
- **真正的残余是事实落点过期**：14 篇、20 处——门禁路径 3 处、机制描述 4 处、计数/读数 5 处、
  门禁归属 1 处、gitignore 规则 1 处、文档锚点 1 处、过时「未做/未验」陈述 3 处。已全部就地改新
  （D38），**决定正文一字未动**。
- 子代理的两条归档建议被判**不采纳**（理由见 §四）；三处 notes 层外的发现留待拍板（§六）。

## 二、已执行（14 文件）

| Note | 改什么 | 依据 |
|---|---|---|
| `2026-10-09-implemented-note-currency` | `bare-path` 门禁的家：`checks/run-gates.mjs` → `checks/gates/bare-path.mjs`（2 处） | 该门 2026-10-14 拆成独立文件 |
| `2026-10-09-n7-ci-narrowing` | `docs/testing.md:75` → 「升级地图」节；「没有 `test:coverage` 脚本」→ 当时没有、现为观察档非门禁 | `package.json` 现有 `test:coverage`；testing §6 在 :70 |
| `2026-10-09-postmortem-guard-restoration` | `preset-required-config` 的家 → `checks/gates/preset-required-config.mjs` | 门禁已独立成文件 |
| `2026-10-09-replay-scene-liveness` | 状态行被 banner 截断（括号跨了引用块）；README 锚点 `§快照与 live 盘差异的语义` → `§规则` | 现 README 只有 §场景/§规则 |
| `2026-10-10-sandbox-backend-probe` | `replay-smoke.mjs:238` → `:279` | 行号随重构移位，同一行仍在 |
| `2026-10-16-closeout-requires-present` | 190 行预算归 `doc-budget`（不是 `handbook-budget`，后者是字节闸） | `doc-budget.mjs` 的 190 预算；`handbook-budget` 算 maxBytes |
| `2026-10-16-presence-status-seam` | 360/76 行标「当时读数，现行以代码为准」 | 现 349/110，属历史读数不覆写 |
| `2026-10-20-tracked-token-guard` | 「runtime/web-logs/ 进 .gitignore」→「runtime/ 默认拒绝 + 白名单」 | `.gitignore:14-19`；owner = repo-hygiene-contract |
| `2026-10-23-converge-e2e` | 未验段：backfill 已真执行且探针覆盖；resume 只覆盖 `--dry-run` | `converge.mjs:401`、`converge-e2e-probe.mjs:65-105` |
| `2026-10-23-converge-steps` | `from/to/gitArgs` + `git ls-files` → `from/to` + 纯 fs rename（2 处） | `converge-rules.mjs:177`、`converge.mjs:299-305` |
| `2026-10-27-data-model-r1-r6` | 排除项「方法层迁 home 级」→ M3 已落地（补 owner 指针） | `docs/data-model.md:53` |
| `2026-10-28-data-design-hardening` | M3 候选句补「M4 定案只收方法层」；`ctx.fs` 未做 → round2 已补（2 处） | `docs/data-model.md:25`、round2:14 |
| `2026-10-28-r4-batch-e6-client-apply` | 「四个入口级函数现状」→「当时读数」（2 处） | 现 apply 51 行 / Board 146 / handler 63；不把历史读数改成今天的数 |
| `postmortem/0001-…` | `scripts/preset-smoke.mjs` → `checks/smoke/…`；门禁路径 → `checks/gates/…` | 两处路径均已迁移 |

## 三、机械面与盲区

- `node checks/run-gates.mjs` → **ALL PASS（52 门，2 skip）**；`notes:audit --strict` 硬项 0。
- 盲区（设计如此，记录在案）：`notes-supersession` 只认**同一行**的「取代 + 链接」——换行、
  「替代/推翻/吸收」、或把旧文件名写成反引号都不查；`receiptReasons` 见 `## 决定` 即归零，
  所以「收据候选 0」只证明没有**显式自述**的收据，不证明语义上没有。

## 四、不采纳的判断（附理由）

1. **`2026-10-26-faq24-alignment` → archive**：不采纳。它虽带「问题/验收/实施顺序」，但同时有
   `## 决定` + `## 输掉的方案`（FAQ 24 §9.2 的 why）；`docs/release.md` 承接结论，不承接取舍。
2. **`2026-10-20-fresh-agent-consistency-sweep` → receipts**：不采纳。六条决定（类级守卫/诊断/
   验收合同/结构切片…）仍是唯一理由家；「批次」是工作单位，不是体裁。
3. **bug022「web-rpc 47/47」**：不改。属验证节当时的真跑读数；现行预算 30 由 `doc-budget` 合同承载，
   改它 = 篡改证据。
4. **r3-c5「第 48 门」**：不改。历史事实；D28 的「不枚举」约束新写侧，不回扫存量。
5. **presence / e6 行数**：不改成今天的数字，只标明「当时读数」——否则下次重构再漂一次。

## 五、删除（用户点头后已执行）

- 已删 `notes/archived/2026-09-22-dynamic-team-assembly.md` —— 方法已进 CEO skill
  `assembling-the-team`，全仓 0 链接引用；判据 = 完整吸收且无剩余否决。历史在 git。
- 已删 `notes/archived/2026-10-09-n3-negative-control-retraction.md` —— 结论已由
  `guard-red-record` 门禁接管，全仓 0 引用。历史在 git。
- 同轮把 `_backlog/_archive/settled_issues/2026-10-09-decision-ledger-home-migration.md:77`
  对前者的裸名引用标了「已删」。
- **21 篇收据保留**：6 篇现行 Note 仍链到具体收据（`retro-env-findings` / `gate4` /
  `evidence-availability` / `deliverables-catalog` / `r4-batch-e6` / `r3-c5`），删要先改这 6 处 + digest，
  而证据层本身成本很低。真要删，先改链、再删、再复跑 verify。

## 六、notes 层外（需拍板）

1. **`pack-shape.mjs` 的 `pack-meta` 静默**：`metaProblems` 算完（:69-73）没有任何 `ok`/`fail`，
   只剩注释；faq24 所称的「pack-meta 门禁」对 locale/icon 的 files/exports 断言已失去拦截。
   这是真回归（已核），修法 = 补一对 `ok`/`fail` + 造红证明；动门禁按 gate-change-definition 走，本轮未改。
2. **`CompanyView` 的注册面**：`COMPANY_PANELS` **不是死表**（`CompanyView.tsx:100/119` 用它渲染页签，
   `tests/client/company-view.spec.ts` 直接挂载），子代理的「死代码」判断已撤回；真实情况是
   `createCompanyView` 在 `src/client/index.ts` 无注册——组件有测试、无生产注册。是否退役整页由 code owner 定。
3. **台账路由指向 archived**：`docs/decisions.md` 约 15 行 D 号把「决定的家」指到 `notes/archived/`
   （D14/D15/D20/D27/D28/D31/D36/D37/D39/D41/D42/D48…），其中 D28/D42 等政策仍现行，与
   「archived 不是当前权威」有张力。建议给这些行补现行 docs 家，archived 留作源。

## 七、残余风险

- 41 篇零 Note 入链中 **16 篇全仓零引用**：不等于该删（可能是唯一 owner），但确实是「没人路由」的
  现行决定；补 docs 路由会撞 D28 的「不枚举」，故只登记不处理。
- 收据 digest 住在 `_backlog/_archive/research/`——**活的索引住归档区**，当前靠 receipts README 指路；
  可用但反直觉，若觉得别扭，正确落点是 receipts 层的入口而不是第二本索引。
- 首轮 triage 报告头部写「51 门」，写于第二门落地前；按快照口径未改。
