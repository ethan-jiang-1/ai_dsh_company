---
status: 已结
opened: 2026-11-13
---

# 推敲：加工环路的入口与事实检查点（fresh agent 走查 + 门禁对账）

> 立卡：2026-11-13 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：rfc — [RFC](../../../notes/proposed/2026-11-13-workflow-entry-and-fact-checkpoint.md)；本卡关闭 = RFC 成立，实施判据由 RFC 的 `## 验收` 承接。
>
> **审查**：agent — RFC 成立（`批准：` + `## 验收` + P0/P1/P2 分档 + 预算/回滚齐）；`pnpm verify` ALL PASS；`pnpm test` 242 files / 1997 tests；实施不在本卡关闭条件内。
>
> **授权边界**：本卡只提方案 + 证据，不改 docs/gates/skills；P0/P1/P2 的实施需 RFC 批准后另行点名。

## 问题与期望结果

**触发**：用户 2026-11-13 追问「从 backlog 到 notes 到实现，我们是不是做对了就会更好？」；随后用两个 fresh-context subagent 做走查与门禁对账。

**期望结果**：一个 fresh agent 能从零做到三件事——

1. **能合法开工**：知道 `待落地` 不是任务源，用户点名/已批 RFC 才是；用户让它「从卡里挑」时，先列候选 + 请示，不自行开工。
2. **能问对问题**：在写第一行代码前，说出这次改动的**状态事实 / 唯一入口 / 读载体 / 环境轴**；写不出载体名单 = 还没想清楚。
3. **能交出可执行证据**：验收条目至少有一个可复现载体（命令/脚本/断言），不是「测试通过」四个字。

**判断完成**：RFC 成立并覆盖 P0/P1/P2 的判据、门禁、生效日、回滚与红证计划；用户批准后按 P0 → P1 → P2 实施。

## 当前情况

- 走查与对账材料 = [fresh agent 走查](../research/workflow-entry-and-fact-checkpoint/2026-11-13-fresh-agent-walkthrough.md) / [规则 × 门禁对账](../research/workflow-entry-and-fact-checkpoint/2026-11-13-workflow-gate-audit.md)。
- **入口**：活跃区只有一张探索卡，卡自述「不改产品代码」；`待落地` 不是任务源（[dev-loop:37](../../../docs/guides/dev-loop.md)）；fresh agent 只能纸面假设「用户点名 wiki FTS」才能继续。环路真实形状 = **backlog 是思考层，用户才是队列**（D32），但 `_backlog/AGENTS.md` 的五道门把 `待落地` 写得像「下一步」。
- **一致性**：走查撞到 6 处文档自相矛盾——`_backlog/README.md` 落地出口「Note 回链」vs `implementation` 不建 Note；`notes/README.md` proposed = 未实施 vs 唯一 RFC 部分已实现；`data-model` 声称字段含 readers/writers 但表头没有；`src/README` 四个命令 vs 源码五个；`src/README` 把 language 合同/`client-copy` 写成将来时；`triggers.md` 不收「用户点名」。
- **发现**：事实/载体问题不是 `dev-loop §3` 四问要求的，而是 `notes/README.md:108` 和 `tests/README.md:35` 顺带提的；`company-root-carriers` 在 `verify` 阶段才红，代码已写完。
- **验收**：`proposals` 只查 `## 验收` 标题，空节也绿；`notes-liveness` 只查 `## 决定` 标题；`backlog-liveness` 的 `sectionBody` 只查非空，「待定/见 RFC」也绿；普通 feature 的红是自述；语义审连续 24 次「未执行」有记录。
- **规模**：71 个门禁、68 篇 implemented Note、118 张已结卡、2 份 RFC；审计统计 43/68 篇 Note grep 不到「未验/未执行/阻断」。

## 未决问题

1. 6 处矛盾的修法方向：`implementation` 出口改成「去向落点 + 真证据，不强制 Note」；部分实施的 RFC 是迁 `implemented/` 还是重定义 proposed？`data-model` 是补 `读者/写者` 列还是删掉声明？`src/README` 改计数还是删未来时？
2. P0 是否可以先于 RFC 直接做（门牌一句话 + 6 处对齐），还是等 RFC 批准后一起做？
3. P1 的模板/门禁落点：卡模板、RFC/Note 节、`dev-loop §1/§3`、两扇 AGENTS.md 门——哪些进 P1，哪些留 P2？
4. P2 的三条 handoff 检查（`acceptance-carrier` / `handoff-carrier` / `env-bound-evidence`）先做哪条？建议先 `acceptance-carrier`。
5. 生效日与祖父豁免：新卡/RFC/Note 从哪一天起查？存量怎么豁免？
6. 行预算：`_backlog/README.md` 136/140、`notes/README.md` 125/132；先搬哪段、压哪段？

## 方案与取舍

**P0（先做，半天）— 让 fresh agent 能合法开工、信任地图**

- `_backlog/AGENTS.md` + root 开工路径各一句：「`待落地` = 等授权，不是任务源；用户让你挑 = 先列候选 + 请示」。
- 修 6 处矛盾（Note 回链 vs implementation、proposed 状态、data-model 列、src 命令数/时态、triggers 用户点名）。
- `data-model` 补 `读者/写者` 列（或删掉「字段含 readers/writers」的声明）——这一列就是「谁读」的格子。

**P1（一天）— 一个事实/载体/轴检查点**

- `dev-loop §1` 定切片 + `§3` 第 ⑤ 行（通用，不依赖卡/RFC）。
- 卡模板 `## 事实与读者` + 验收三列（命令 | 断言 | 红形态）；RFC/Note `## 状态事实与载体` + `## 未覆盖轴`。
- `proposals` / `notes-liveness` 查节（生效日 + 祖父豁免）；`validation-design` 一步；`close-out` 第四问。
- `新建:notes/AGENTS.md` + `新建:tests/AGENTS.md` 两扇薄门；`_backlog/AGENTS.md` 一行。
- 预算：先搬/压再加，否则 `verify` 先红。

**P2（半天）— 让验收可执行**

- `sectionBody` / `proposals` 从「非空」升级为「至少一个可执行标记」（`pnpm test|verify|typecheck` / `node checks/` / `Given/When/Then` / `assert`），配 `zz` 负例「写测试通过必须红」。
- 三个 handoff 检查候选：`acceptance-carrier`（每条验收有可解析载体）、`handoff-carrier`（去向落点 + 回链）、`env-bound-evidence`（环境专属 token 必须配便携命令或豁免）。先做 acceptance。

**输掉的方案**：
- **先加更多测试资产**：资产是锤子；不先修入口/一致性，fresh agent 会先卡在「没活/两份说法」。
- **新流水线 / 新索引**：现有 `_backlog`/`notes`/门禁够用；新层只会再造一本账。
- **每目录 AGENTS.md**：门多了是噪音；只加 `notes/`、`tests/` 两扇，`_backlog/AGENTS.md` 改一行。
- **把语义审也做成门禁**：机器只能判形状；语义审要人/独立 agent，门只保证载体在场。

## 范围与排除项

**做（本卡）**：把上述 P0/P1/P2 写成一份已批 RFC；RFC 含判据、门禁、生效日、回滚、红证计划。

**不做**：不改 docs/gates/skills；不实现 P0/P1/P2；不新建流水线/索引；不把 6 处矛盾的具体改法在本卡里定死（留给 RFC）。

## 验收标准

- [x] RFC 落 `新建:notes/proposed/2026-11-13-workflow-entry-and-fact-checkpoint.md`，状态行带「批准：」，含 `## 验收`。
- [x] RFC 把 P0/P1/P2 分档，每档写：判据、落点（文件:节）、机械面、生效日、祖父豁免、回滚、红证计划。
- [x] P0 清单逐条对上 6 处矛盾，并给出「改哪一句/哪张表」的现行家。
- [x] P1 清单覆盖 `dev-loop §1/§3`、卡模板、RFC/Note 节、两条门禁、两扇 AGENTS.md 门；行预算先搬后加。
- [x] P2 清单覆盖「可执行标记」判据 + `zz` 负例 + `acceptance-carrier` 先行；另两条按复发再做。
- [x] 明确「不做什么」：不新造流水线、不每目录放门、不把语义审机械化为形式。
- [ ] 用户批准 RFC 后，按 P0 → P1 → P2 实施；每档独立可验收，不一次全上。

## 关闭条件

RFC 成立并获用户批准；本卡 `git mv` 到 `_backlog/_archive/settled_issues/`，索引同步。实施不在本卡关闭条件内。

## 抽象度

- 换公司要改吗？→ 不会；这是开发流程，不是公司内容。
- 换产品类型要改吗？→ 不会。
- 换做法要改吗？→ 会；若未来改用外部 tracker/CI，门牌与门禁要跟着换，但「事实/载体/轴」这一问不变。
- 只有机制本身变才改吗？→ 是。
- 第二消费者：下一个 fresh agent、后续 RFC/Note 作者、门禁维护者。
- 搬家成本：低；规则住现有 owner 文件，门是薄门，检查是既有 gate 的扩展。
