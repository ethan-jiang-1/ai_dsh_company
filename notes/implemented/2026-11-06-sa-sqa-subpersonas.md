# 2026-11-06 · 落地项目的 E/V 分家：SA + SQA 两个委派子人格（子人格档）

状态：implemented（2026-11-06；用户拍定：子人格档、名字照 proposed、SQA 否决直达 CEO）

## 决定

- 新增两个**委派子人格**（不是角色、不占编制、不进在场板/署名）：
  `system-architect`「梦之队 系统架构师（SA）」与 `system-qa`「梦之队 系统质量保证（SQA · V&V）」，
  各带一个 skill（`systems-architecture` / `vv-playbook`），order 10/11。
- 进 `COMPANY_SUPPORT_PRESET_IDS`（`researcher` 同款）**并进 `package.json` 的 `dsh.bundle.patch` 数组**——
  后者是「装了也不进名册」的分界线（本次实踩）。
- CEO 与 vp-eng preset 各加两行命名委托：`system_architect` / `system_qa`，`agentPreset` 各自钉死，
  **`maxDepth: 2`**（VP-Eng 作为团队成员 depth = 1，子代落在 2；`spawn_teammate` 只有 Lead 能调）。
- 规则：VP-Eng persona 写「**落地项目（不是 demo）才起**两个子人格，E 与 V 不许互相代笔」；
  CEO persona 写「**SQA 的否决直达你**——VP-Eng 只能补证据/改稿、不能删结论，收口单列原始结论」。
- SQA 交稿：能写盘就落 `vv-plan.md` / `sqa-review.md`，写不了就把**全文放最终消息**由 VP-Eng 落盘。

## 输掉的方案

- **角色档（第七/第八条汇报线）**：CMO 实证 9 提交/97 文件（编制、在场板、署名、章程、徽标、全量 smoke）；
  且 SA/SQA 本质是 VP-Eng 条线下的专职岗，不是汇报线。
- **CEO 组队时直接把 SA/SQA 叫成团队成员**：`spawn_teammate` 无 preset 参数 ⇒ 成员继承 Lead 人格，
  「独立人格」不成立；独立上下文有了、独立判断没有。
- **SQA 独立汇报线**：用户本轮选择「挂 VP-Eng 条线 + veto 直达 CEO」，更轻且保留升级通道。
- **只建 preset 不登记 `dsh.bundle.patch`**：装进 profile 也不进名册（现场报
  `Unknown agent preset: system-architect`）；已补 `preset-bundle` 门禁。

## 验证（实跑）

- `pnpm verify`：**ALL PASS**；`presets ×6 + 子人格 ×3`；新增 `preset-bundle` 检查（每个 preset 必须登记进
  `dsh.bundle.patch`，且数组里不得指向不存在的文件）。
- `preset-smoke`：**ALL PASS**（6 个角色 + 3 个委派子人格全部可挂载）。
- `pnpm typecheck` 通过；`pnpm test` **1163 passed**（presets spec 新增一条：两子人格声明 + 两处委托行
  `maxDepth: 2` + SQA 否决规则）。
- **真模型 E2E**（新资产 `probes/team/sa-sqa-delegation-probe.mjs`，305s）：CEO 建会话 → `spawn_teammate`
  起 vp-eng → vp-eng 调 `system_architect` + `system_qa` ⇒ 两个子会话
  `agentPreset = system-architect / system-qa`、**`delegationDepth = 2`**、同一 `parentSession`（VP-Eng）。
  SA 交架构稿（VP-Eng 落 `drafts/sa.md`）；SQA 交 V&V 计划 + 对架构稿的独立结论（含量化判据），
  以最终正文送达、由 VP-Eng 原样落盘。

## 后果 / 边界

- 只在**落地项目**起 SA/SQA；demo 与 `vp_*` 快捷路径不变。
- 子会话可能没有写盘能力（本次两子代都只回正文）⇒ 由 VP-Eng 落盘；这条边界已写进 `vv-playbook`。
- 上游 `spawn_teammate` 仍无 `agentPreset`（团队成员人格继承 Lead）；本 Note 只保证**两个子代**有人格，
  团队成员的 per-member preset 是另一条（上游）。
- `org.md` / `owners.md` 不动：子人格不占编制、不进在场板；若将来要给他们 journal/kb 席位，按研究题的
  16 面清单二期再走。
