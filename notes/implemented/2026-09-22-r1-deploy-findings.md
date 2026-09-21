# 2026-09-22 · R1 部署决策（bundle 承载 host 行 + 观察窗形态）

## 决定

1. **host 行随 pack 的 bundle 走**（`packages/company-pack/cordis.patch.yml`）：`agent-presets`
   行用**替换**语法覆盖 web-app 的出厂行（`default: standard` → `ceo`），roots 用 `!!js` +
   `baseUrl` **自定位**到本包安装目录的 `presets/`；`tool-present`/`agent-team`/`tool-agent-team`
   用 `- insert:` 新增。原 `profiles/company.cordis.yml` 源文件删除（一处事实一个家）。
   依据：R1 实证 profile 层 patch 只能替换不能新增（D12）。
2. **runtime deps 精确钉 `0.1.5-rc.2`**（8 个，npm 实测同版可用）：`agent-presets`、
   `session-persistence-jsonl`、`tool-fs`/`tool-fs-search`/`tool-skill`/`tool-present`、
   `experimental-agent-team`、`experimental-tool-agent-team`。R5 转 peer + compatibility 矩阵。
3. **团队两行从 R1 起直插**（不装官方 `agent-team-profile` bundle）：保持零 JS、避免 bundle 的
   全局续驶控制 disable（10 §3 冲突注①）；R3 的"从 bundle 改直插"因此提前完成。
4. **观察窗用 web profile**（`dsh web -- --port 3081`）：pack 装进 **web profile**（bundle 行生效），
   preset roster 在 UI 的 CUSTOM 区出现四角色；3080 与本 GUI 冲突，固定用 3081。
5. **根 devDependencies 加四个 insert 行的 `workspace:*` 链接**：源码 CLI 下 TS 导入走
   tsconfig paths 进 src，但插件清单的 `require.resolve` 走 Node 原生解析——root 无链接会报
   `REQUEST_EXTENSION: ... preparation failed`。

## 输掉的方案

- **company profile 跑观察窗**：`--profile company`（base + pack，无 web-app）里 agent-presets
  行在源码 CLI 下**挂起**（进程不退、无输出；同一行在 web profile 里正常）。根因未定 → 改用
  web profile 绕开，开放点记 design/10 §6 要点 5 与下方"未验证"。
- **官方 team bundle + 我们 pack 并存**：会 disable 全局续驶控制（10 §3 冲突注），且 R1 用不到
  官方 bundle 的默认行 → 直插行。
- **`--patch` overlay 加 agent-presets 行（headless 形态）**：headless 组合无此行，insert 能加；
  但 web 组合已有此行，再 insert 即 `duplicate loader entry id` → 定案为"pack 用替换、overlay 用
  insert"，两者各管一种组合（`dev/company.overlay.yml` 保留给纯 headless 动议）。

## 验证（实际跑过）

- web profile `--dump-config`：155 行，`# == @deepseek-ai/dsh-web-app, patched by dsh-company-pack`
  段含我们的 agent-presets 行（default: ceo + 自定位 roots）与三个 insert 行。
- web 观察窗启动：`http://127.0.0.1:3081/?token=…` HTTP 200、27.6KB、5 个脚本引用（修复前端
  dist 前是 404 空页）。
- headless 全组合 overlay：`pnpm dsh --profile headless --patch ./dev/company.overlay.yml "只回答：OK"`
  → exit 0 且模型回复（修复根 devDeps 链接前报 REQUEST_EXTENSION）。
- 内容面 `pnpm verify` → ALL PASS（presets ×4、skill frontmatter name 与目录名一致）。

## 未验证 / 已知风险

- **company profile（无 web-app）下 agent-presets 行挂起**：根因未定（栈采样显示事件循环空转，
  等一个不来的事件）；R2 若需要纯 headless 的 company profile，需回头查。
- **web profile 的 `file:` 副本刷新**：pack 内容变更后 pnpm 缓存命中不刷新（R1 手工 `cp` 同步过
  一次）；正式机制（bump 版本重装）留 R5 release-smoke 验证。
- **入戏探针（M1）与动议本身尚未跑**：R1 验收还差这两步（见 roadmap R1 行）。
