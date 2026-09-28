# 2026-09-22 · 分身培养与自我学习（写权、载体与自主节律的边界）

状态：已消化（2026-09-24 交付并收尾；收尾 Note = [2026-09-24-twin-cultivation.md](./2026-09-24-twin-cultivation.md)）
进轮：原 R6 → 改号 R7（2026-09-23，D21）→ D23 后为队列条目「分身成长」（2026-09-24 交付；完成即离队）
研究依据：[implemented/2026-09-22-digital-twin-cultivation-and-self-learning.md](./2026-09-22-digital-twin-cultivation-and-self-learning.md)（**§6 = 交付期修订**：skill 正文生效边界 = 同会话下一轮，"只有新会话变"作废）
梳理（2026-09-22）：原有两条"前置修复"阻塞**已落地**——见下 §三 与
[2026-09-22-skill-root-isolation.md](./2026-09-22-skill-root-isolation.md)；
U1 已在源码层回答、U2/U3 作废（见研究笔记 §5，后经 §6 再修正）。逐项就绪度判定见 r5-plus-readiness（原审计文件，已于 R6 删除——git 留史）。

## 背景

数字分身要被不同的人专业培养，也要能在干活中学到东西。DSH 没有为这两件事提供专门机制，只有
"文件 + 权限"。机制底已研究清楚
（[2026-09-22-digital-twin-cultivation-and-self-learning.md](./2026-09-22-digital-twin-cultivation-and-self-learning.md)），
本提案把结论变成可执行的边界。

三条已钉死的事实：

1. **DSH 没有记忆子系统**：跨会话学习只能落在文件上（journal / skills / KB），没有第三条路。
   `compaction` 是 surface 减法，`persistence` 只保证**同一** session 还原。
2. **培养权 = 文件系统权限**：persona 在 mount 时注册、运行时无改写入口；preset 子树的 loader
   `write()` 是 no-op；改组合文件只对**新会话**生效。
3. **自主节律不闭合**：`goal` 需人类授权且 session-start 一律 disarm；`schedule` 只在会话 live
   时投递且默认没装；`webhook` 能起会话但进不了 goal 循环；全树无 cron。

## 提案

### 一、培养 = 改 pack 文件 + 人审验收

- **唯一权威**：`packages/company-pack/presets/<role>/`（persona + skills）。培养动作 = 改这些
  文件；生效边界 = **新会话**。
- **验收**：改任何 preset 内容后，`pnpm test`（内容定稿）+ `pnpm verify` +
  `node scripts/preset-smoke.mjs` + 该角色的入戏探针全绿，才算培养成功。这条把"培养"从感觉
  变成检查。
- **明确不做"培养授权"机制**：DSH 没有这个原生动作。谁有 repo 写权谁就能重新定义分身——这是
  当前的权限事实，写进文档，而不是造机制。

### 二、学习 = journal 为唯一载体，人审提升

- **载体**：workspace journal（D8）继续做唯一跨会话学习载体——它经工具调用进日志，满足
  model-visible ⟺ logged。
- **提升回路**：journal 里的教训由**人**读、提炼、写进 pack 的 skills。取舍照 DSH 自己的
  `human-review-skill-maintenance` 提案：只采纳有证据的、不自动提升、单人维护者的 bus factor
  写进风险。
- **明确否决"分身运行时自改 skill"**，三条理由：
  1. 角色私有 skills 与共享的 `project-dsh`（rank 100）同处一个 layer ⇒ 往
     `<repo>/.dsh/skills/` 放同名 skill 会盖掉角色私有 skill 并**对所有角色生效**
     （当前仓库内无 `.dsh/` 目录，陷阱是潜伏的）；
  2. 角色私有目录在 workspace 外，分身自我写入被沙箱拒（`FS_SANDBOX_DENIED`）；
  3. preset 子树 loader `write()` 是 no-op。

  ⇒ 现在"自己长出的 skill"等于"改全公司的 skill"；没有授权模型之前不做。

### 三、前置修复两条（做完才谈得上上面两条）——**两条均已落地（2026-09-22）**

1. **隔离角色 skills**：五个 preset 的 `skill-filesystem` 都保留 `includeDefaultRoots` 默认
   true（已核实：行里只写了 `customSkillDirs`），共享根与角色私有目录同 layer。显式关掉它或
   只列角色目录，把 rank-100 的全公司覆盖面收掉。
2. **接线 D7 的"公司手册"载体**：web-app bundle 关了 host 面 `agent-instructions`，shipped
   preset 各自补回，公司五个 preset 都没补 ⇒ 角色会话不加载 `<projectRoot>/AGENTS.md` 链
   （研究笔记标为**推断**，先跑 U4 实证）。补一行，或证明不需要并记录原因。

### 四、自主节律：不做，只记缺口（**已进 roadmap 搁置池**，复活条件 = 上游接缝）

"分身自己定期复盘"需要"外部触发 → 自动续跑"的接缝，DSH 现在没有。按 D9 的先例：**提 seam，
不 vendor patch**。本提案不承诺任何自建调度器。

## 输掉的方案

- **自建 memory 子系统**：D13 禁止发明本地流程；vendor 无 memory seam，自建等于在 pack 里造
  第二套状态。
- **分身自改 skill 实现"学习"**：见上三条理由（覆盖全公司 + 沙箱拒 + write 是 no-op）。
- **自建 cron / 调度器**：全树无 cron；`goal` / `schedule` 的边界已钉死，缺的是接缝不是调度器。
- **把"培养"做成运行时热改**：preset 子树 `write()` no-op，热改无载体；新会话生效是机制事实。

## 验收判据

1. **隔离反证**：往 `<repo>/.dsh/skills/<某角色 skill 名>/SKILL.md` 放探针 → 修复前角色读到
   探针（被盖），修复后角色仍读自己的；**跑完清理探针**（该目录全公司共享）。
2. **手册接线**：角色会话首个请求里出现 project root 手册内容（snapshot/replay 可断言）；若
   U4 证伪，本条改为"记录不接线的原因"。
3. **培养回归**：改一次某角色 skill → 三道门禁 + 该角色探针全绿，且**旧会话不受影响**
   （即 U1 生效边界的实证）。
4. **学习回路**：一次动议结束后 journal 有可提升的教训 → 提升进 pack → 变更记入
   `notes/implemented/`（人审留痕）。

## 风险与未决

- **U1–U8 的现状（2026-09-22 梳理后）**：**U1 已在源码层回答**（skill 条目改动下一轮生效，
  见研究笔记 §5）；**U2/U3 作废**（隔离后共享 skill 根不再进入角色技能面）；
  U4 已闭合（`agent-instructions` 接线 + `handbook-smoke`）；U5 仍是【推断】但风险低；
  U6/U7 只服务于已搁置的"自主节律"，保留 U7 当上游 seam 证据、不跑。
  逐条最小实证步骤仍在研究笔记 §3，但只需跑 §3.1 的活体探针。
- **沙箱对 pack 目录的拒绝（U5）**依赖"会话 cwd = `company-workspace/`"这一本仓设定。
- **是否新开一轮**：**已定（2026-09-22）——新开「分身成长」**（原 R6；2026-09-23 起改号 **R7**，R6 让位给「内容诊治」轮——见 roadmap 维护规则同日条），roadmap 表里已有该行；原论证
  （培养/学习是新能力，R5（今 R5a/R5b）那条皮肤 + 门禁的线塞不进）保留在此。**R7 的前置已全清**：两条接线 R2
  后已落地、U1 已在源码层回答，唯一那次活体探针已**并入轮间待办（R4 → R5a）①「按问题组队」并已完成**
  ——也就是说 R7 不再等任何前置。
- **U2/U3 的探针会写全公司共享的 `.dsh/skills/`**，跑完必须清理，否则静默盖掉角色 skill
  （U2/U3 既已作废，本条保留为历史风险记录）。

## 条目去向（2026-09-24 消化时逐条销账）

| 条目 | 归宿 |
|---|---|
| §一 培养 = 改 pack + 人审验收 | ✅ 2026-09-24 走通：A/B/G 三条教训提升进 `presets/ceo/skills/chairing-staff-meeting/`，四道检查全绿；合同 = [presets.md §培养回路与学习载体](../../docs/presets.md)（D25） |
| §二 学习 = journal 唯一 + 人审提升 | ✅ 同轮走通：教训源 = 用户 9-23 真动议 `ent-agent-platform` 五份 journal（复用，零新模型成本）；人审采纳 A/B（用户批）+ G（授权代理裁定） |
| §三 前置修复两条 | 已于 R2 落地（[2026-09-22-skill-root-isolation.md](./2026-09-22-skill-root-isolation.md) + `handbook-smoke` 常设门禁） |
| §四 自主节律：不做、只记缺口 | 搁置池（缺上游 seam；复活条件已写，见 [ROADMAP.md](../../_backlog/suspended.md) §搁置池） |
| 验收 1 隔离反证 | 已闭（R2：isolation Note；`preset-smoke` ③ 常设断言） |
| 验收 2 手册接线 | 已闭（R2：五 preset `agent-instructions` 行 + `handbook-smoke`） |
| 验收 3 培养回归 + 旧会话不受影响 | ✅ 全绿 + **边界按面修正**：skill 正文 = 同会话下一轮（活体实证，研究笔记 §6）；persona / 组合文件 = 新会话（vendor stamp 机制）。"旧会话不受影响"的准确表述 = 按面（合同表） |
| 验收 4 学习回路 + 人审留痕 | ✅ 收尾 Note + 本表即留痕 |
| 教训候选余量（本轮未提升） | C 引用两分法（出处核不到 ⇒ 标未核实）/ D 不替别人填数 / E 提问只到标注性质 / F 门槛算式自查 → **留今后培养轮**；C 需先定跨角色载体（公司手册 vs 各角色 skills）。证据 = 排练场 `kb/{vp-sales,cfo,coo}/journal/ent-agent-platform*.md`（gitignored；关键引文见收尾 Note ②） |
