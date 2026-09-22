# 2026-09-22 · client 面去重挂载：官方挂 remote，本包做消费者（修全 UI 砖）

## 决定

1. **`src/client/index.ts` 不再 `$mount` 生成的 Team Remote**：删除运行时 import 与
   `await ctx.remote.$mount(agentTeamsRemote)`。挂载者唯一——官方 `client-ui-agent-team` 行
   （本包 `cordis.patch.yml` 自己插的 `ui-agent-team`）。命名空间的类型增强改由
   `import type {} from '@deepseek-ai/dsh-experimental-agent-team/remote'` 提供（编译期擦除，
   bundle 零运行时引用）。
2. **任务板与品牌槽全保留**（用户拍板：自有的肯定留着，底层利用现成的）。板经
   `ctx.inject(['sessions', 'remote.agentTeams', 'slots'], …)` 读数据：fiber 等官方挂载完成才
   注册；官方缺席时本贡献安静 PENDING（板不出现），**不会**再把全 UI 砖掉——失败模式从
   "apply 抛错 → BootPage 错误屏"降级为"贡献缺失"。
3. **`tsdown.config.ts` 删掉 `noExternal`**（remote 描述符内联）：无运行时引用后是死配置；
   client bundle 197KB → 8.9KB（zod + 描述符离场）。
4. **`scripts/client-load-smoke.mjs` 上线**（本事故的完成定义）：headless Chromium 加载真 web
   页面，断言零 plugin-load 失败（BootPage banner / console `failed to apply loader entry`）
   且品牌槽在场。修前 RED、修后 GREEN（同一条命令，本次实证）。
5. **假事实清理**（docs = 当前合同）：guide 60 §3.9 重写为真实机制；postmortem 0002 追加
   更正节；client-face note 追加更正；preset-smoke 闭包世界补 shell baseline（三个
   "上游缺口" WARN 均为 baseline 假警报）；AGENTS.md 铁律表"先证伪不可用再自建"。

## 输掉的方案

- **幂等挂载（挂前查 `remote.agentTeams` 是否已存在）**：保住"任意组合都能用"的自包含性，
  但把"谁挂"这个组合问题埋进运行时探测；且 gateway 不提供公开的"已挂查询"。组合问题在
  组合层解决（我们的 patch 永远同时插 `ui-agent-team` 行 + `company-client` 行，两者同进退）。
- **删官方行、只留本包挂**：保住自包含，但丢官方富面板（建/改/分配/点进成员会话），且和
  "利用现成载体"（D13）反着走。
- **只删自建任务板、全用官方**：最省，但用户明确要保留自有面板（皮肤第一笔、R2 分镜载体）。

## 验证（实际跑过）

- 修复回路（`dev/scratch-client-load.mjs`，已由 `scripts/client-load-smoke.mjs` 继承）：
  修前 fresh boot **RED**（banner：`failed to apply loader entry … (dsh-company-pack): client
  api: direct method agentTeams/createTask is already mounted`，整页只剩错误屏）；修后
  **GREEN**：无 banner、全 app 渲染、官方 Agent Team 按钮 = 1、本包 🗂 任务板 = 1、品牌槽 = 1，
  官方面板点开可读（Members：lead/vp-eng；Shared tasks：task-1 Completed）。
- `tsc -p packages/company-pack/tsconfig.json` → 0 错；`tsdown` 重建 → lib/client.js 8.9KB；
  与 profile 安装副本 inode 相同（原地写，硬链未断，无需 `plugin remove/add`）。
- `pnpm verify` / `pnpm test` / `node scripts/preset-smoke.mjs` / `node scripts/client-load-smoke.mjs`
  → 见提交信息所列实际结果。

## 未验证 / 已知风险

- 官方富面板的**交互**（建任务/分配/改状态）未驱动（只验证了渲染 + 数据可读）；R2 分镜
  走到时由 story 验证。
- R1"官方 Team UI 挂不上"的真实原因未确立（postmortem 0002 更正节）；若复发，用
  client-load-smoke 重诊而不是 manifest 差集。
