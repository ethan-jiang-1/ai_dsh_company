# 2026-11-11 · 接手面卫生：0.11.0 发布、默认端口与指针收口

状态：implemented（2026-11-11 落地；验证见下）

上游 = 用户 2026-11-11 接手成本卫生审计指令（七维审计后批准 P0+P1+P2，版本处理 = 切 0.11.0）。
相关 = [0.11.0 交付模式轴](2026-11-11-delivery-mode-axis.md) · [交付检查 v2](2026-11-11-delivery-check-v2.md)。

## 决定

1. **切 0.11.0，而不是继续把 0.10.0 当当前版。** HEAD 在 0.10.0 之后已有两轴交付模式、
   `/delivery check`、business-software 与 BUG-056..070 修复；旧 tarball 缺这些运行时文件。
   发布物必须由当前 HEAD 重打，`_dist` 之后只认当前 manifest。
2. **`pnpm company` 缺省端口 = 0。** 用户显式 `--port <n>` / `--port=<n>` 时尊重；否则交系统分配。
   原因 = 本机日常 GUI 占 3080，最后一条启动日志就是 `EADDRINUSE 127.0.0.1:3080`。
3. **owner 文档按现行家重校。** `src/README` 的 host 路径改成 2026-11-09 分组后的真实文件，
   inject 清单补 `workspaceRegistry`；`docs/contracts/presets.md` / `docs/architecture.md` 把
   “手册经 agent-instructions 注入”改成“T0 由 host `systemPrompt.section` 注入，T2 按需读”；
   `orient` 的角色计数从 `delegation-model` 派生；`run/env.sh` 用 `${VAR}` 防止 macOS bash 3.2
   吞掉全角括号前的值。
4. **`dsh.client.inject` 只留一个完整定义。** 准确语义 = 不排 Cordis 激活，但排浏览器模块
   factory arrival（vendor `client/modules` 的 `arriveGraphRow`）；其余文档只留指针，不再写
   “informational only”这种会被读成“纯展示元数据”的短句。
5. **`attention-observers` 的 `$on` 必须可撤销。** 捕获两个 disposer，挂到 `scoped.effect`；
   组件重载/卸载时退订，不再依赖“宿主会收拾”的口头假设。
6. **不新增 Config schema。** `cultivationRoot` / `handbookSkipPresets` 仍是可选行 config；
   包 README 已显式说明没有 schema 校验。这是本次的范围选择，不是遗漏。

## 输掉的方案

- **保留 0.10.0，只在 README 标注“未发布”。** 用户拿到的 tarball 仍缺两轴交付模式；
  标注只能解释旧，不能让当前 HEAD 可交付。
- **保留 3080，让用户自己记得 `--port 0`。** 最后一条启动日志已证明这会直接失败；
  端口是环境状态，应由 wrapper 给安全默认。
- **继续在 `orient` 里写死“5 公司角色”。** 已经漂过一次；计数应从
  `FULL_ROLE_IDS` / `SUPPORT_PRESET_IDS` 派生。
- **忽略 `$on` 返回的 disposer。** vendor 合同明确返回退订函数，`ui-session` 等已按
  `ctx.effect` 捕获；本包不应靠宿主 fiber 的副作用。
- **加一个最小 `Config` schema。** 当前只有两个可选旋钮，包 README 已说明没有 schema；
  在没有真实配置错误前加 schema 属于范围扩张。

## 后果

- 版本与产物：`packages/company-pack/package.json` = `0.11.0`；`_dist` tarball = 258 entries，
  11 个 `agent.cordis.yml`，19 个 `content/delivery-modes/**` 文件；`_dist/安装手册.md` 同步再生。
- 分发状态：`market-index.json` = 0.11.0；`market-index.staged.json` 仍标 `requiresPublish: true`
  （未执行 `npm publish`，不冒充已发布）。
- 启动：`tools/company.mjs` 缺省追加 `--port 0`；`tools/lib/dev-install.mjs` 的
  `ensureDefaultPort` 是唯一判断点，带单测。
- 接手面：新测试 `tests/harness/repo/src-readme-pointers.spec.ts` 钉住 README 相对路径与 inject；
  `orient.spec` 钉住 6+5 计数；`attention-observers.spec` 钉住两个事件退订。
- 本地 dev profile 因真实启动从 `link:` 切到 `file:` 安装；这是 dev home 状态，不进 git。

## 验证

实测 2026-11-11：

- 修前红：`pnpm test tests/harness/repo/src-readme-pointers.spec.ts` → 2 failed：
  `host/cultivation.ts`、`host/bootstrap.ts`、`host/catalog.ts` 不存在；README inject 少
  `workspaceRegistry`。修后同命令 → 2 passed。
- 修前红：`pnpm release --check` → `pack 源码面已变但 _dist 没重打`，exit 1。修后
  `pnpm release --check` → `release: READY 0.11.0 @ d3343898（tgz 258 条目；7 项检查 pass）`，exit 0。
- `pnpm verify` → `ALL PASS；2 门无对象`，exit 0。
- `pnpm test` → `Test Files 186 passed (186)` / `Tests 1541 passed (1541)`，exit 0。
- `pnpm typecheck` → exit 0；`pnpm lint` → 0 warnings/0 errors；`pnpm dup` → 0 clones。
- `pnpm release --verify` → 全绿：`release-smoke: ALL PASS`、`company-entry-smoke: ALL PASS`、
  `client-load-smoke: ALL PASS`、`preset-smoke: ALL PASS（6 个角色 + 5 个非角色 preset）`、
  `present-catalog-smoke: ALL PASS`。
- 真首屏：`source run/env.sh && pnpm company --workspace "$PWD/company-workspace" --no-open`
  → 横幅 `http://127.0.0.1:65218/?token=…`，日志无 `EADDRINUSE`；`cdp-probe --evidence`
  → `booted: true`、`composerReady: true`、`brandPresent: true`、9 个公司页签全部
  `tabsOpened`、`tabFailures: []`、`consoleProblems: []`、`exceptions: []`；证据目录 =
  `runtime/harness-home/diagnosis/cdp-probe-2026-11-11T00-02-38-219Z/`。
- `run/env.sh` 修复的复现：`/bin/bash -c 'X=/tmp/foo; echo "X=$X（bar）"'` 在 bash 3.2.57
  输出 `X=..bar`；改为 `${X}` 后输出完整路径；`source run/env.sh` 实跑显示
  `DSH_HOME=/Users/bowhead/ai_dsh_company/runtime/harness-home`。
- 未造红的项：`attention-observers` 的 disposer 测试是新增守卫，修前未单独跑旧实现；
  行为依据 = vendor `typert` 的 `$on: () => void` 合同 + 新测试 green。

## 未验证

- `npm publish` 未执行；`market-index.staged.json` 保留，registry 上仍没有 0.11.0。
- Desktop 真机、其他 OS 未验；README 已改成“Desktop 安装句跨面，仓库未逐平台真机认证”。
- 真模型会话未跑（`cdp-probe` 未加 `--ask`）；`preset-smoke` 只证挂载，不证行为。
- dev home 的 3 个 profile 安装与 2 条失效 workspace 登记未清理（gitignored 运行态；
  启动日志已如实警告，不属于本包发布物）。
