# 收口纪律缺口修复（2026-10-16）：present 前置于「已完成」＋收敛前置拦未结发现

状态：implemented（授权 = 用户 2026-10-16 对 issues/2026-10-16-all-in-ai-ceo-closeout 令「继续按你推荐」⇒ 方案 A+B；来源卡 = [_archive/settled_issues](../../_backlog/_archive/settled_issues/) 待迁；commit = 见本 Note 同轮）

## 事故（先把事实钉死）

`deliverables/2026-10-13-all-in-ai-2026/final.md` 在真盘常红 `final-not-presented`。深挖结论（证据链见 [BUG-019](../../_backlog/bugs/BUG-019-final-present-evidence-lost.md)）：

- 收口会话 `session-350eb581`（557 行）**95 次 `tool/call` 里没有 `present`**；收口靠 `write` 写 final + `team_task_update` 收任务；
- **`present` 当时就在工具表里**（该会话 `request/header` 含 `{"name":"present","description":"Declare existing files as final del…`）⇒ 工具在手、没用；
- 用判据自己的 `parseSessionLog` 扫**全部 2783 份**日志（两 home × v3 610 + v4 2173）⇒ 真 present 事件 **0 条**；
- 该件 meta 自述「final v2 已 present」= **纸面声明，无机器动作**。

⇒ 真凶 = **收口流程跳过了 `present`**；审计判得对。且 CEO skill 第 5 步**本来就写着**「用 `present` 声明交付」——所以缺口不在「没写规则」，在**规则没有机器强制**。

## 决定（A + B，按职责分家）

**A（公司侧，1 行）**：`company-workspace/AGENTS.md` 的「工作纪律」节加一条——**成品收口必须先 `present`**：写进 `final.md` 不等于收口；**先 present、后**把 meta「结果」改终态词；没 present 就没有「已完成」，顺序颠倒会被收敛前置点名。真身落 `packages/company-pack/workspace/AGENTS.md`（运行盘是符号链接；出厂骨架随包分发）。

**B（工具侧，同一道闸）**：`tools/converge.mjs` 新增前置「**无未结审计发现**」，判据**复用** `checks/audit/deliverables-check.mjs --only <slug>` 的裁决——收敛器**不重写** present 背书 / meta 形状 / 占位抢注这些判据（单一来源是审计档；复述必然漂移），它只要一个「通过/未通过 + 为什么」。计划模式与执行档都接；放行 = 显式 `--allow-open-findings`（照记警告，不静默）。

## 输掉的方案

- **在 converge 里重写一遍 present 判据**：败于判据单一来源——present 背书/形状/占位抢注的裁决属审计档，复述一遍就有两个会漂的家。
- **判据只看「meta 标终态 ∧ 无 present」**（不看审计档其余发现）：败于窄——同一道闸顺手把「形状坏 / 占位抢注 / 立了没删的 draft」一并挡住，没有额外成本。
- **A 面把「present」写成新的一段**：败于手册饱和——`handbook-budget` 行预算 190 行、改前 186 行（只剩 4 行头寸，且门禁自己的注释写着「顶格 = 饱和信号，处置 = 瘦身不是提额」）⇒ 压成 1 行，188/190。
- **让 converge 自己读会话日志**（BUG-019 候选 B 的本体）：败于成本与耦合——要接线 `session-log-export` + 解析明文日志；复用审计档的退出码把这件事降到「一次子进程」。
- **环境不可用时静默跳过这道前置**：败于 fail-closed——「没查」不等于「查过没问题」；缺 `DSH_HOME` 时报一条「不可评估」的发现并拦下。

## 后果

- **「跳步收口」这条路被堵**：动议要收敛，必须先过审计档；meta 标了终态却没有 present 背书的件会在收敛第一步被点名（实测：`✗ … 有未结审计发现——final-not-presented deliverables/…/final.md`）。
- **`converge` 多了一个环境前提**（要 `source run/env.sh`）——头注已按纪律更正（原先自称「纯文件/git 操作、秒级」，现在是「秒级~十秒级 + 需 DSH_HOME + fail-closed」）。
- **`all-in-ai-2026` 本条仍红**（正确状态）：闸门只负责**不许它静默过去**；要变绿只有一条真路——**一次真实收口动作补 present**（归公司侧，见下「未做」）。
- 未做（记录在案）：① 公司侧的**真实**收口（补 present）——需要一条**真 CEO 会话**（preset 只在 Web 面挂载，`dev-loop §3.6`；headless/sdk 绕过 preset ⇒ 不能在这里替代）；② `present` 缺失时的公司侧自检清单（skill 已有文字，本轮未加机器面）。

## 验证

- **A 面**：`pnpm verify` 的 `handbook-budget` 双闸——`手册 25657B + 1024B 余量 ≤ maxBytes 32768` PASS、`五 preset maxBytes 一致` PASS；行数 188/190（未提额）。
- **B 面（真入口红绿）**：造一件「有 final + closed + 一句话结论 + 1 篇 journal」的临时动议（`2026-10-16-gate-findings-test`，故意不给 present 背书）⇒ 计划模式 `· 未备 … ← 有未结审计发现：final-not-presented deliverables/…/final.md`、执行档 `✗ … 有未结审计发现——final-not-presented …` + 两条出路提示，exit 1 ⇒ 删临时件 ⇒ 计划模式无残留。
- **旗标**：`--allow-open-findings` 进 `parseFlags` 的 `KNOWN_FLAGS`（未知旗标仍 fail-loud）；3 条 `toEqual` 整对象断言随新键同步（`converge-rules.spec` 19 → 20 用例）。
- **全量**：`pnpm test` → `62 passed (62)` / `571 passed (571)`；`pnpm verify` ALL PASS。
- **头注合同自校**：发现并更正了本轮引入的文档失真（原「成本：秒级、无模型（纯文件/git 操作）」与我加入的子进程调用矛盾）。
