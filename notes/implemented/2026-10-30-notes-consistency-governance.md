# notes/ 长期维护：机械审计 + 语义分诊 + 写侧逆转检查（2026-10-30）

状态：implemented（2026-10-30；授权 = 用户「能长远做，把它做对，别太短视，因为这是个长项目」——
明确要机制而不是一次性清扫）

## 问题

notes/ 已经历多轮产品演进，三类东西混在同一层：

- **现行决定**（仍指导行动）；
- **已被后来决定推翻/吸收的旧文**（没有“被取代”指针，读者会照旧行动）；
- **根本不是决定的收据**（轮次收尾、演练场次、批次流水、状态快照）——notes/README §二
  早就把它们列为负例，但存量从未回扫。

2026-10-30 的全树分诊（5 个并行子代理 + 机械扫）确认：约 15+ 处旧断言与现行代码/合同相反，
约 33 篇是收据/流水/提案体；其中至少 5 处会直接误导下一次操作。**根因不是“某篇写错”，
是“改口时没有强制留痕、之后也没有可重复的分诊动作”**——只做一次清扫，过两个月照旧。

## 决定

1. **机械面 `pnpm notes:audit`**（[tools/notes-audit.mjs](../../tools/notes-audit.mjs) +
   [lib](../../tools/lib/notes-audit.mjs)）：只读工作表，枚举死路径、取代缺回链、收据特征、
   零活引用、状态行异常。**不是门禁**——它只出候选，不判语义、不删东西。
2. **语义面 [notes-consistency-audit skill](../../.agents/skills/notes-consistency-audit/SKILL.md)**：
   固定步骤 = 机械基线 → 定现行真值 → 逐篇抽 claim → 六类分诊（KEEP / FIX-FACTS / SUPERSEDED /
   RECEIPT / RFC-RESIDUE / CONFLICT）→ 最小处方 → 执行 → 留痕。报告落
   `_backlog/_archive/research/`（按需开 notes-consistency 子目录），**报告不是 Note**。
3. **写侧逆转检查**（[agent-note-definition](../../.agents/skills/agent-note-definition/SKILL.md)
   + [close-out-definition](../../.agents/skills/close-out-definition/SKILL.md)）：
   新 Note 说“取代/部分取代”时，同 diff 给 implemented 旧文加指针；旧文已无现行内容 → `git mv`
   到 archived；archived 冻结不回写，由新 Note 单侧承载。没有回链的取代 = 未收口。
4. **规则 owner 仍是 [notes/README](../../notes/README.md) §五**：写清互链、机械面、语义面、
   节奏（发布 runbook §0 跑机械审计；机制改口当轮做语义分诊），**不建第二索引**。
5. **收据层与删除授权**：收据/流水先 `git mv` 到 `archived/receipts/`（证据层，不删原文）；
   失效/重复才合成 digest 后删（git 留历史），删除需用户明确点头。旧决定优先 archive 顶层；
   删除现行 rationale owner 同样需点头。

6. **机械硬项门禁 `notes-supersession`**（第 51 门）：implemented 旧文缺“被取代”回链即红。
   它只守这一条可机械判的硬项——语义矛盾（旧文与新合同相反）仍归 skill，不冒充机器判。

## 输掉的方案

- **只做一次性清扫**：本轮清完，下一次机制改口又新增一层；用户明确要“长远”。
- **建一份 notes/INDEX.md 或状态总表**：D34/D36 已经因为“第三本账/必漂”退役过两次；树 + 全文检索
  才是清单，状态住状态行与链接。
- **给语义矛盾加门禁**：机器判不了“旧文这句是否已被新合同推翻”；硬做会造一个假 oracle，
  把真矛盾漏在外面。机械面只做可机械判的五项，语义面留给 skill 的固定步骤。
- **自动删除收据**：收据里可能夹着唯一的否决理由；“删”需要人/授权，工具只给候选。
- **日历提醒做节奏**：会话级提醒不可靠，且项目节奏不是日历；挂在“发布 runbook §0”与
  “机制改口”这两个真实事件上。
- **把分诊表留在对话里**：下一轮没人读得到；报告落 `_backlog/_archive/research/`，链接从
  notes/README §五进。

## 后果

- 新增公开入口 `pnpm notes:audit`（已进 [checks/README](../../checks/README.md)）；**门禁 50 → 52**
  （`notes-supersession` 守“取代缺回链”，`notes-archived-links` 守“归档层链接”），不新增静默哑弹。
- [notes/README](../../notes/README.md) 增 §五（约 10 行）；两处 skill 增写侧检查；未来 Note 的收尾多两问：
  “这是收据吗？”“旧文有回链吗？”
- 机械审计首次基线（本轮实跑）：收据候选 9、无决定节 10、死路径 2、取代缺回链 0、零入链 57。
  这些是**待分诊候选**，不是失败；语义分诊按 skill 逐篇裁决。
- 与本轮相邻的 [收敛证据家](./2026-10-30-converge-evidence-home.md) 是同一治理目标下的独立决定：
  先拆掉“下一次收口会踩”的地雷，再谈清理存量。
- 主动卫生不再是日历：收据直接进 `archived/receipts/`；`pnpm verify` 有 `notes-supersession` 硬门禁；
  发布前 runbook §0 跑 audit；同一机制第二次改口当轮分诊。

## 验证（真跑）

```text
npx vitest run tests/harness/notes-audit.spec.ts
#   16 passed（解析/收据/死路径/取代回链/活引用/状态行 + 否定句豁免）
pnpm notes:audit
#   implemented 74 / archived 69 / receipts 21（均不含 README）；收据候选 0 / 无决定节 0 / 死路径 0 / 取代缺回链 0 / 零入链 41
node checks/run-gates.mjs
#   负例：临时 zz note 说“取代”且目标无回链 → FAIL notes-supersession: …:5 → … 缺 `…` 指针
#   删临时 note → PASS notes-supersession ×74；ALL PASS（52 门，2 门无对象）
pnpm test
#   119 files / 1042 tests passed
```

已执行：21 篇收据移入 `archived/receipts/`（不删原文，证据层），digest 为唯一索引；
其余分诊与两批 archive 已执行。本 Note 只验收“机制可用 + 写侧规则生效 + 机械硬项有门禁”。
