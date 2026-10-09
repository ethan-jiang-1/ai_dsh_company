# 2026-09-22 · 角色 skills 硬隔离（`includeDefaultRoots: false`）

## 背景

研究笔记（implemented/2026-09-22-digital-twin-cultivation-and-self-learning.md（已删，历史在 git））
发现：五个角色 preset 的 `skill-filesystem` 只写了 `customSkillDirs`，`includeDefaultRoots` 取默认
true ⇒ 角色私有目录（rank 300）与项目根（100/200）、用户级（400/500）根**同处一个 layer**。
preset 文件里那句注释"角色专属 skills……其他角色不可见（**硬隔离**）"与行为相反。

后果不止"看得见别的角色的 skill"：`~/.agents/skills` 里的用户级开发技能集
（`tdd` / `youtube-transcript` / `grilling` …）会出现在每个公司角色的目录里；更糟的是往
`<repo>/.dsh/skills/` 放一个与角色 skill **同名**的文件会以 rank 100 静默盖掉角色 skill，
且对全公司生效（该目录当前不存在，属潜伏）。

## 决定

1. **五个 preset 的 `skill-filesystem` 加 `includeDefaultRoots: false`**：只认本 preset 的
   `skills/`，不并入项目根与用户级技能集（vendor 语义："an isolated provider sees only its own
   configured roots"）。公司角色的技能面从此**恰好等于**该角色目录里的内容。
2. **把这条写成门禁**：`scripts/preset-smoke.mjs` 新增第 ③ 项——用 session 寻址的
   `skills/list` Remote 断言"该角色会话看见的 skill 恰好等于该角色目录里的 skill"。
   这是真入口路径检查（真 web profile + 真 `session/create` + 真读模型），不是配置形状检查。
3. **重装纪律修正**：pack 装进 profile 的是**真拷贝**（inode 不同、link count 1），改
   `presets/*.yml` 后必须 `plugin --profile web remove` + `add` 才被伺服；
   guides/dev-loop §7 原先只写"新增 `lib/**` 才要重装"（那条针对 tsdown 原地写），已补正。

## 输掉的方案

- **只改注释、承认不隔离**：公司角色带着 `youtube-transcript` 这类用户级开发技能出场，
  与"数字分身是岗位对应物"的设定直接冲突。
- **保留默认根、靠命名避开冲突**：rank 100 的覆盖是静默的，且要靠人记住"别在
  `<repo>/.dsh/skills/` 放同名文件"——把机制约束降级成人的记忆。
- **在 preset 里显式列出用户级根**：等于把污染写进配置，还多一层维护。
- **只加 keyless 配置形状测试**：能过，但抓不到"注册表实际合并了什么"——R1 的教训正是
  "roster/dump 看不到的东西必须走真入口"。

## 依据（实际查过）

- vendor `packages/skill/skill-filesystem/README.md`：rank 表（100 `project-dsh` / 200
  `project-agents` / 300 `custom` / 400 `user-dsh` / 500 `user-agents`）与
  `includeDefaultRoots` 语义（同页 `:48-54`、`:65-73`）。
- **红 → 绿实证**（同一台机器、同一份 pack 安装）：
  - 修复前 `node scripts/preset-smoke.mjs`：5 个角色全 FAIL，列出被泄漏的 26 个用户级 skill；
  - 重装 pack 后：`PASS ceo/vp-eng/vp-sales/coo/cfo 只看见自己的 skills`，
    `preset-smoke: ALL PASS（5 个 preset 全部可挂载）`。
- 其余门禁同批跑过：`pnpm test` 8 passed；`pnpm verify` ALL PASS（presets ×5、vendor-clean 等）。
- 顺带在源码层回答了研究笔记的 **U1**：`skill-filesystem` 的 Change detection 写明
  "adding, renaming, or deleting a skill (or editing its frontmatter) triggers a catalog refresh
  **for the next model step**"，且首方 `write`/`edit` 工具**直接失效** provider——即 skill 条目
  的改动下一轮就生效（不必等新会话）。这让"分身自我学习"在机制上可行，也让本条的隔离更关键：
  一旦允许自改 skill，改动会立刻进入下一次模型请求。
- 与 R6 的关系：本条的隔离是 R6"培养/学习"的前置条件之一（见
  implemented/2026-09-22-twin-cultivation-and-self-learning.md（已删，历史在 git）
  与 roadmap 的轮间待办）。
