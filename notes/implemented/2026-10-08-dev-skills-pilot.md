# 开发 Skills 试点：`.agents/skills/` 落两个多步程序

状态：已消化（2026-10-08；批准链见原状态行 + 上级对话呈批批准——原状态行批准链 = 用户 2026-10-08 在第三轮诊断收口对话中逐条审批通过「条目 C：开发 Skills 试点」，并指定实施次序「A+B 先做，C 独立一轮」，本 RFC 即那个独立轮；判定依据 = [driver-receipt-round](2026-10-08-driver-receipt-round.md) §H1 唯一翻案项。开工 = TDD 红绿环，见 [proposed/README](../proposed/README.md)；红/绿收据与实跑命令见文末验证记录）。

## 问题

本仓零「任务 Skills」层（无 `.agents/skills/` 目录），而 390 行 [dev-loop](../../docs/guides/dev-loop.md) 压着大量**多步判断程序**——DSH 语料 repo-harness 03 的判定标准：需要「读上下文 + 应用判断 + 多步骤 + 报告」且无法化为布尔的任务。后果有二：① 每个会话把整本维修手册装进上下文，渐进披露缺失；② dev-loop 行预算 390/395 顶格，任何新增流程内容无处落（第三轮条目 A 只能行中性硬塞）。

机制侧已核实可用：vendor rc.2 `packages/skill/skill-filesystem/src/index.ts` 的 `roots()` 会自动发现 projectRoot 下 `.agents/skills/`（source `project-agents`）——DSH 会话原生加载，无需自建调度（「不发明」纪律：用 DSH 现成载体）。

## 方案

`.agents/skills/` 落两个最高频多步程序（frontmatter `name`/`description` 按 DSH 五步形状：Match → Load → Resolve sources → Apply judgment → Verify and report；**正文只链规则 owner、不复述**——防第二事实家）：

1. **preset-change-definition**：persona/skill 文案改动的完成定义——presets.spec → preset-smoke → 行为判据面同 diff 场景（testing §2）→ 收尾收割三问。现散在 tests/README 表 + dev-loop §9.1 + §12 三处。
2. **web-window-ops**：起观察窗与现场运维——source env.sh → `pnpm dsh web` → 横幅读 token URL → 零挂载失败冒烟 → 现场症状→动作表。现散在 demo.md §前置 + budget-and-ops §3。

dev-loop 对应节同步瘦身为指针（渐进披露；瘦身轮顺带释放预算头寸，棘轮语义只降不升）。

## 输掉的方案

- **一次铺满 4–5 个 skill**（升 pin 重校 / 改动面选检 / 语义审执行…）：无复发证据不建满载——先两个真程序验证形状，被会话真用后再扩（门禁升格判据同款思路）。
- **把 skill 当门禁替身**：Skill = guidance，可机械判断的规则留在 run-gates（语料 repo-harness 03「Skill ≠ gate」；本仓 run-gates 21/22 区块已带负例留证，不动）。
- **建集中 skill 索引页**：路径树即清单（notes/README D34 同款教义），第二清单必漂。
- **放 `docs/guides/` 当"skill 形状文档"**：不会被 DSH 会话发现与按需加载——只有 `.agents/skills/` 是机制载体，文档目录是冒牌货。

## 验收

- 结构走查：`.agents/skills/` 下两个目录各含 SKILL.md，frontmatter 带 name/description，正文链接全部指向规则 owner（md-links 门禁覆盖新文件）。
- **真入口证据**：起一次真会话（profile 取实际挂 tool-skill 的面——headless 若无 tool-skill 行则用 web；单跑预算），会话 catalog（available_skills）出现两个新 skill 名，且模型对其中一个完成一次 skill 调用（会话日志 skill tool call 为证）——**实施者不看对话就能复现**：命令、断言、红（catalog 缺名）长什么样写在实施 Note 验证节。
- dev-loop 对应节收缩后 `pnpm verify` doc-budget 全绿（行数只降不升）；`pnpm test` 全绿。
- 先**不设** skill 类新门禁（无复发不建 gate；现有 `script-triggers` / `skill-file` 覆盖面不变）。

## 验证记录（2026-10-08 实施）

真模型会话共 **2 次**（预算 ≤3，余量未用）：红 1 + 绿 1（绿兼真调用，同会话双收据）。断言器 = 读会话
JSONL 的 durable `user/message`（`data.source.kind == "skill-catalog"` 的 `entries[].name`）与 `tool/call`
事件——从权威日志取事实，不采信模型正文自述；headless 会话 cwd = 仓根（`project-agents` 根由此发现）。

| 步 | 实跑命令 | 判据与结果 |
|---|---|---|
| 红 | `source run/env.sh && pnpm dsh --profile headless "只回复两个字：收到。不要调用任何工具。"`（建 `.agents/skills/` **前**） | catalog 12 条，`preset-change-definition` / `web-window-ops` **均缺席 = 红**；收据 = session `d98c02b9…` 日志，归档 [skill-catalog-pilot](../../snapshots/probes/skill-catalog-pilot/2026-10-08/README.md) |
| 绿 + 真调用 | 建 2 个 SKILL.md 后另起 `pnpm dsh --profile headless "加载 web-window-ops …只执行它的第 1 步…"` | 同一断言器复跑：catalog 14 条，两名**在场 = 绿**；且日志出现 `tool/call` `"name": "skill", "arguments": "{\"name\": \"web-window-ops\"}"`，随后 bash 执行 skill 第 1 步（env 隔离自检 `grep -c company-pack` = 9 ≥ 1）= **真调用证据**；收据 = session `1072fe2d…`，同归档 |
| 结构面 | `pnpm verify` + `pnpm test`（`set -o pipefail` 链） | 全绿；md-links 扫描面覆盖新 SKILL.md；doc-budget 各行见门禁 PASS 输出 |

同 diff 伴生改动与取舍：

- `tools/lib/markdown-links.mjs`：扫描面显式加 `.agents/skills`（通用 walk 跳过点目录）——md-links
  门禁自此覆盖新 SKILL.md；这是现有门禁的发现面补口，不是新门禁（验收明文要求覆盖新文件）。
- dev-loop 瘦身：§1「呈现即验证」的过程性叙述收缩为 web-window-ops skill 指针（渐进披露）。其余被两
  skill 收拢的叙述（demo.md §前置、budget-and-ops §3、tests/README 表、dev-loop §9.1/§12）本就是规则
  owner 形态、事实家不迁——dev-loop 净行数不变，故 `DOC_LINE_BUDGETS` 棘轮不动（只降不升，无净降无可
  下移；毕业不以瘦身行数为条件，事实承载优先）。
- 收割三问：①异常 = 无；②值得钉 = skill-catalog 红/绿断言已钉成归档证据 + 本节复现命令；③运行态事实 =
  本次两例 headless 会话收尾**均未删**自己的 session 目录（历史「删目录」未复现，日志直接留存可读）。
