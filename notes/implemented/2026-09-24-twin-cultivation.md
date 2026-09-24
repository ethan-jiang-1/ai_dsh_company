# 2026-09-24 · 条目收尾：分身成长（培养 + 学习一次完整回路）

状态：✅ 已交付并收尾（队列条目「分身成长」完成即离队）
RFC：[2026-09-22-twin-cultivation-and-self-learning.md](./2026-09-22-twin-cultivation-and-self-learning.md)（已毕业，状态「已消化」；条目去向表在其末节）
研究依据：[2026-09-22-digital-twin-cultivation-and-self-learning.md](./2026-09-22-digital-twin-cultivation-and-self-learning.md)（研究已毕业；**§6 = 交付期修订**）

## ① Motivation（外部可观察行为）

一次完整培养回路可走通：真动议的 journal 教训 → **人审**选定 → 提升进 pack skill → 四道检查全绿；
且培养的生效边界被活体钉死（并修正 U1 旧结论）。

## ② 交付

- **学习回路（首次完整走通）**：教训源 = 用户 2026-09-23 在 3084 实时窗跑的真动议
  `ent-agent-platform`（**复用，零新模型成本**；五份 journal 在排练场 `dev/rehearsal-workspace/kb/*/journal/`，
  gitignored）。人审采纳三条（用户批 A/B；G 由用户授权代理裁定加入，理由 = 同文件同角色同落位、
  CEO 纪要 10 整条编号决定为证）：
  - **A 合稿只依据稿面原文** ← CEO 纪要 11「合稿只依据稿面原文，不依据回执转述」（合稿期两处校正留痕）；
  - **B 互审稿标权威版号** ← VP-Eng 纪要「同一稿出现过 62 / 59 / 70 三种行数读数……教训：稿首必须标
    权威版号，否则评审人读的不是同一份」+ COO task-5 版本账 + CEO 纪要 10 三方印证；
  - **G 收口盘点保留账** ← CEO 纪要 10「三方终态的保留账（全员归零/明示）」。
- **培养动作**：`presets/ceo/skills/chairing-staff-meeting/SKILL.md` +4 行（第 4 步权威版号纪律、
  第 5 步合稿依据 + 保留账盘点，写作按 `writing-for-agents`：正向措辞、单一事实家、no-op 猎杀）；
  文本只写方法论、不含公司事实与出处（D17——出处即上三行，pack 换公司可复用）。
- **生效边界修正（本轮最硬的发现）**：skill 正文的生效边界 = **同会话下一轮**，不是"新会话"——
  link: 安装下活体探针：旧会话 A 跨盘上改动第 2 轮 `skill()`（日志 `tool/call` 确认两轮都走 skill
  工具、非 fs read）读到新文；2026-09-22 U1"只有新会话变"被证伪（U1 量的是模型转述，本轮量的是
  日志 `tool/result`）；与 vendor 源码"每次 get() 读盘"一致。persona / 组合文件的新会话边界不变
  （vendor stamp 机制，活体未跑）。研究笔记 §6 修订 + 合同按面钉死。
- **培养/学习合同**：落 [presets.md §培养回路与学习载体](../../docs/presets.md)（**落现有家零新增**，
  出生地图行解决）；台账 **D25**。

## ③ 实际跑过的验证

| 检查 | 结果 |
|---|---|
| `pnpm verify` / `pnpm test` | ALL PASS（16 项门禁）/ **91/91** |
| `node scripts/preset-smoke.mjs` | ALL PASS（5 preset 真挂载 + 隔离断言 ×5 + client 闭包 lint） |
| 边界活体探针（`/tmp/cultivation-boundary.mjs`，一次性；3 次模型调用，墙钟 ~2.5 min） | 4 断言 3 绿 + **1 修正性发现**：旧会话第 2 轮也见新文（非探针故障——工具调用名已从会话日志核实为 `skill`；会话 `session-7d09615f…`〔A，两轮〕/ `session-e46fc82d…`〔B〕，dev home 排练场目录，未清理） |
| `node scripts/probe-smoke.mjs --full`（入戏探针，认证档一次） | **15/15 PASS**（coo#2 知识首轮 90s 超时，按 guides/dev-loop §9「失败重试一次换新会话」通过；**CEO 三探针全过 = 培养后入戏不受损**） |
| coo#2 单题重试（`/tmp/probe-coo2-retry.mjs`，1 次调用） | PASS（回复 3207 字符，/8/ + /CEO/ 命中） |

## ④ 环境状态（下条会话判断"哪些已就绪"只读这里）

- 两观察窗仍在（**3084 实时**真 key / **3085 重放**无 key；关闭 `pkill -f "dsh web"` / `pkill -f dsh-observe`）。
- 一次性脚本（/tmp，非仓库资产）：`cultivation-boundary.mjs`（边界探针）、`probe-coo2-retry.mjs`
  （coo#2 重试）、`dump-toolcalls.mjs`（日志工具调用诊断）。
- 边界探针两会话留 dev home 排练场目录（证据源）；`ent-agent-platform` 的 journal/deliverables 仍在
  排练场（教训源，教训候选 C/D/E/F 的证据也在那里）。
- dev `web` profile = `link:` 安装（改 preset 无需重装）；`company` profile = `file:`（本轮未用）。
- **已 push**（2026-09-24 当夜 443 通道成功，`06e7634..2f0f316`——历史积压 113+ 一并推净；
  push 命令见 AGENTS.md 命令表）。

## ⑤ 条目去向（RFC 表之外的增量；全文见 RFC 末节）

| 项 | 归宿 |
|---|---|
| 教训候选 C/D/E/F（本轮未提升） | 留今后培养轮（裁定理由与证据指针 = RFC 条目去向表末行）；**当夜执行进展见后续维护规则行 / 晨报** |
| U1 结论修正 | 研究笔记 §6（随毕业落 implemented/）+ 合同生效边界表（presets.md） |
