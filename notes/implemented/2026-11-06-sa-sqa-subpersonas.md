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
- **真模型 E2E（跑到收口，2026-11-06 18:04–18:15，slug `2026-11-06-portable-overload-detection`）**：
  CEO 建会话 → `spawn_teammate` 起 vp-eng → vp-eng 调 `system_architect` + `system_qa` ⇒ 两个子会话
  `agentPreset = system-architect / system-qa`、**`delegationDepth = 2`**、同一 `parentSession`（VP-Eng）。
- **收口证据（六条断言全 PASS，脚本化）**：
  ① 接线（preset ×2 / depth 2 / 同一 parent）；② `final.md` 出现（6.5KB）；
  ③ final 点名 SQA（「参与：… system_qa（SQA 子代理）」）；④ final 带裁决词（**「SQA 总判 = 不通过」**、
  「能否开工 = 否」）；⑤ `drafts/sqa.md`（32KB）＝ SQA 正文原样落盘（文件头写明「未改一字、未删一行」）；
  ⑥ `drafts/sa.md`（32KB）＝ SA 架构稿（21 条 IF-001…IF-021）。
  ⇒ **SQA 的否决真的进了 CEO 收口**，不是只写在规则里。
- 探针已升级为同样断言（等 `final.md` → 点名 SQA → 裁决词 → drafts 里 SA/SQA 稿），后续可一条命令复跑。
- **探针自身的假绿已修（2026-11-06 19:1x 现场）**：第一版按「目录里出现 system-* preset 会话」判定，
  第二轮跑时它把**18:05 的旧子会话**当成 19:04 这一轮的成果，报 ALL PASS——典型的假绿。修法：
  只认 `createdAt >= 探针启动时刻` 的会话。修后用本轮的**真实** id 复核：
  `lead c7bbb913 → vp-eng 66c53afe（depth 1）→ SA 54ebdb28 / SQA 04a2c289（depth 2）`，
  收口稿 = `2026-11-06-portable-overload-detection-v2/final.md`（「SQA 总判 = 不通过」）。
  教训写在此处而不是只改代码：**E2E 的发现逻辑必须按本轮时间窗过滤，否则它证明的是历史**。

## 后果 / 边界

- 只在**落地项目**起 SA/SQA；demo 与 `vp_*` 快捷路径不变。
- 子会话可能没有写盘能力（本次两子代都只回正文）⇒ 由 VP-Eng 落盘；这条边界已写进 `vv-playbook`。
- 上游 `spawn_teammate` 仍无 `agentPreset`（团队成员人格继承 Lead）；本 Note 只保证**两个子代**有人格，
  团队成员的 per-member preset 是另一条（上游）。
- `org.md` / `owners.md` 不动：子人格不占编制、不进在场板；若将来要给他们 journal/kb 席位，按研究题的
  16 面清单二期再走。

## 追补（2026-11-06 19:xx）：把「证明」做成可复核的资产，并修掉两处假象

用户指出「没证明 = 质量不够」，对。这一轮把证明补齐，并当场抓到两个假象：

- **假绿（探针发现逻辑）**：`sa-sqa-delegation-probe` 第一版按「目录里出现 system-* preset 会话」判定，
  第二轮跑时把**上一轮的旧子会话**当成本轮成果 ⇒ 假 PASS。修：只认 `createdAt >= 探针启动时刻`。
- **假失败（脚本 maxBuffer）**：复核脚本用 `execFileSync` 读会话头，1MB+ 的文件默认 `maxBuffer` 溢出
  ⇒ header 抛错被吞成 undefined ⇒ 已完成的运行被判 FAIL。修：`maxBuffer: 64MB`（探针同步修）。
- **超时 ≠ 失败**：探针原来超时也 kill web，把还在跑的 SA/SQA 活干一起毙掉。改为 exit 3 TIMEOUT、
  保留实例，并把默认墙钟从 10 分钟提到 30 分钟（实测某轮 SQA 单干 25 分钟）。

**新的常驻资产** `probes/team/sa-sqa-closeout-audit.mjs`（零模型成本，纯读盘）：把「一轮运行算不算真的
跑通」写成 10 条判据，逐轮读该轮自己的 session 头 + 交付物。红证：把 SA 判据改成 `vp-eng` ⇒ exit 1。

复核结果（两轮完整运行，各自用自己的 id）：

| 运行 | lead | VP-Eng（team 成员） | SA | SQA | 收口稿 | 结果 |
|---|---|---|---|---|---|---|
| 18:04 | `session-69573cd5` | `0f76976f` depth 1 | `8e052efa` depth 2 | `3bfbbcba` depth 2 | `…/2026-11-06-portable-overload-detection/final.md` | **10/10 PASS** |
| 19:04 | `session-c7bbb913` | `66c53afe` depth 1 | `54ebdb28` depth 2 | `04a2c289` depth 2 | `…/2026-11-06-portable-overload-detection-v2/final.md` | **10/10 PASS** |

两轮 final.md 都写着「**SQA 总判 = 不通过**」，`drafts/sqa.md`（32KB）为 SQA 正文原样落盘。⇒ 「CEO 组队 →
VP-Eng 干活 → VP-Eng 自己起两个新角色 → SQA 否决进入 CEO 收口」这条链**有行为证据**，不是规则文本。
