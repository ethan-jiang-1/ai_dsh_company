# 2026-09-22 · 分身培养与自我学习（写权、载体与自主节律的边界）

状态：proposed（2026-09-22）
进轮：R6 分身成长（2026-09-22 起，⛔ 待命——阻塞项见 [roadmap](../../docs/plans/roadmap.md) 轮间待办）

## 背景

数字分身要被不同的人专业培养，也要能在干活中学到东西。DSH 没有为这两件事提供专门机制，只有
"文件 + 权限"。机制底已研究清楚
（[../research/2026-09-22-digital-twin-cultivation-and-self-learning.md](../research/2026-09-22-digital-twin-cultivation-and-self-learning.md)），
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

### 三、前置修复两条（做完才谈得上上面两条）

1. **隔离角色 skills**：五个 preset 的 `skill-filesystem` 都保留 `includeDefaultRoots` 默认
   true（已核实：行里只写了 `customSkillDirs`），共享根与角色私有目录同 layer。显式关掉它或
   只列角色目录，把 rank-100 的全公司覆盖面收掉。
2. **接线 D7 的"公司手册"载体**：web-app bundle 关了 host 面 `agent-instructions`，shipped
   preset 各自补回，公司五个 preset 都没补 ⇒ 角色会话不加载 `<projectRoot>/AGENTS.md` 链
   （研究笔记标为**推断**，先跑 U4 实证）。补一行，或证明不需要并记录原因。

### 四、自主节律：不做，只记缺口

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

- **U1–U8 均未跑**（研究笔记逐条给了最小实证步骤）。其中 **U1（skills 热改是否下一轮生效）**
  在 vendor 内部有两条互相冲突的陈述，直接决定"学习"能否比"新会话"更实时。
- **沙箱对 pack 目录的拒绝（U5）**依赖"会话 cwd = `company-workspace/`"这一本仓设定。
- **是否新开一轮**：培养/学习是新能力，R5 是皮肤 + 门禁收尾轮，塞不进。建议新开一轮（R6）；
  轮序调整按 roadmap 维护规则改表 + notes 记一行原因。
- **U2/U3 的探针会写全公司共享的 `.dsh/skills/`**，跑完必须清理，否则静默盖掉角色 skill。
