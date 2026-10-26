# 真实 npm 通道、条件 browser 与公司盘指针（0.3.10）

状态：已交付（2026-10-26）。上游 = 用户 2026-10-26 探索性测试要求（安装/分发/数据隔离，P0/P1 优先）。
本文记录 0.3.10 的决定、输掉的方案与真跑证据；不是功能合同，合同住 [release](../../docs/release.md)、
[pack README](../../packages/company-pack/README.md) 与生成式《安装手册》。

## 决定

1. **五个角色 preset 的 browser 组改为条件启用**，不再硬依赖 npm 发布版 DSH 不提供的两包。
   - 判定：`DSH_COMPANY_BROWSER=off` 强制关；`=on` 强制开；缺省时从 profile 用
     `createRequire(new URL('package.json', baseUrl))` 解析 `@deepseek-ai/dsh-browser-use` 与
     `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp`，两包都在才开。
   - 缺包时整组禁用：五角色 roster 零 broken、`session/create` 正常；browser 工具缺席是明示的能力降级。
   - 可选恢复：`dsh plugin --profile web add @deepseek-ai/dsh-browser-use@<dsh version> @deepseek-ai/dsh-experimental-browser-use-playwright-mcp@<dsh version>`；
     profile 可解析后自动开。vendor 源码通道两包在安装侧，`run/env.sh` 显式 `DSH_COMPANY_BROWSER=on`。
2. **`DSH_COMPANY_HOME` 归一**：`~` 展开、相对路径按启动 cwd 绝对化、空白视为未设置；与
   `resolveDshHome` 同口径，不再把不可复现字符串写进 `bundle.json`。
3. **`bundle.json.workspace` 是 bundle 身份的一部分**：已有 manifest 时改 `DSH_COMPANY_HOME`，
   启动在 stderr 明确告警，并跳过自举/升级/目录重建；不在新路径建第二份公司盘。换盘/搬家 = 新
   `DSH_HOME`，或备份后删除 `bundle.json` 重建。
4. **`export-dist` 先 build**：`tsc -b` + `tsdown` 后才 `npm pack`；`lib/` 是 gitignored 的构建目录，
   直接打包会静默打旧代码。发布 `files` 只留 `lib/index.js`、`lib/client.js`、
   `lib/types/**/*.d.ts`；tsc 中间 `.js`/`.map`/`.tsbuildinfo` 不进包。
5. **新增两条常驻冒烟**：
   - [channel-matrix-smoke](../../checks/smoke/channel-matrix-smoke.mjs)：vendor built CLI + 真实全局
     `dsh` 的五角色 roster/会话；`--with-browser` 验可选包自动启用。
   - [isolation-matrix-smoke](../../checks/smoke/isolation-matrix-smoke.mjs)：改 `DSH_COMPANY_HOME`
     的告警/不建新盘 + 相对/`~` 落点归一。

## 发现（为什么必须做）

用真实全局 `dsh` 0.2.1-rc.3 装 0.3.9 tarball：安装 exit 0、boot 成功，但 `agentPresets/list`
把 ceo/vp-eng/vp-sales/coo/cfo 全部标 `broken: browser-use-def ... never started`，
`session/create` 直接失败；`standard`/`researcher` 正常。

根因：npm 上 `@deepseek-ai/dsh@0.2.1-rc.2` 与 `rc.3` 的 meta package **都不依赖** browser 两包
（vendor 源码树有）。此前所有安装冒烟都把 `dsh` shim 到 vendor built CLI，第二机模拟也用同一
shim；测试把“通道”这个变量固定住了，所以没暴露。把两个 browser 包装进 profile 后五角色立刻恢复。

**测试设计教训**：冒烟 home 若落在仓库内，Node 的上行解析会看到 repo 根 `node_modules` 里的
vendor browser 包，把全局通道的缺包 bug 遮住。channel/isolation 冒烟因此把 lab home 放到
`os.tmpdir()` 的仓库外；第一次在 `runtime/` 下跑出的“ALL PASS”是假绿，已作废。

## 输掉的方案

| 方案 | 为什么不选 |
|---|---|
| 把 browser 两包改成普通 `dependencies` | 开箱即用，但安装要联网拉 `@playwright/mcp`，破坏当前 file tarball 离线/零 runtime 依赖姿态；`pack-files` 也明确 dependencies 为空 |
| 收窄 `engines.dsh` 到 rc.2 | 诚实但挡住当前真实全局 rc.3 用户；窗口仍会漂，不解决通道差异 |
| 拆成可选 browser bundle | 能力分层更干净，但 preset 行是每个角色的静态配置，注入/卸载成本高；先条件禁用够用 |
| 只把警告写 `ctx.logger` | 实测 logger 不落启动 stdout/stderr；数据分裂风险必须出现在用户眼前，故加 `process.stderr.write` |
| 保留 `lib/**` 发布 | 272 条目里 216 条是 tsc 中间物（含 source map/tsbuildinfo），无运行时价值 |
| 换盘时自动改 `bundle.json.workspace` | 会让“同一 home 两个盘”静默合法化；身份指针必须先显式处理 |

## 后果与边界

- npm 发布版默认**没有** browser 工具；五角色可用，手册给可选安装。vendor/dev 通过 `run/env.sh`
  显式开启，保持原有全员 browser 覆盖。
- `DSH_COMPANY_HOME` 相对路径仍按 cwd 归一（与 `DSH_HOME` 一致），但手册建议绝对路径/`~`。
- 搬 home 后 bundle.json 的相对 workspace 会随新 home 解析；DSH 自己的
  `storages/workspace.json` 与 session 目录名仍存绝对旧路径，**不会自动迁移**——手册要求重新添加
  工作区，旧 session 留在旧路径。这是上游存储行为，不在本 pack 修复面。
- Windows/容器/NODE 20/其他 0.2.x 仍未执行；不因本次绿而声称支持。
- `--with-browser` 需要网络与同 DSH 版本的两个 browser 包；本次实测 rc.3 可用。

## 验证（都真跑过）

| 命令 | 结果 |
|---|---|
| `node checks/smoke/channel-matrix-smoke.mjs --channel global --browser off`（0.3.9 旧包） | **红**：5 角色 broken + 5 session FAIL = 10 FAIL；证明回归线咬得住 |
| `node checks/smoke/channel-matrix-smoke.mjs --channel all`（0.3.10） | ALL PASS：vendor + 全局 rc.3，五角色/五会话 |
| `node checks/smoke/channel-matrix-smoke.mjs --channel global --browser auto --with-browser`（0.3.10） | ALL PASS：无包自动禁用；装 rc.3 browser 两包后自动启用 |
| `node checks/smoke/isolation-matrix-smoke.mjs --pack <0.3.9 修复前>` | **红 6**：rebind 无警告且建了新盘；relative `bundle.workspace` 记 `./company-rel`；tilde 落成字面 `~` 目录 |
| `node checks/smoke/isolation-matrix-smoke.mjs`（0.3.10） | ALL PASS：rebind 告警/不建新盘、bundle 字节不变、旧盘 sentinel 不动；相对/`~` 归一 |
| `pack-shape` 的 `pack-files` 造红（临时把 `files` 加回 `lib/**`） | **红**：`files 缺 lib/index.js；files 缺 lib/client.js；…；files 用了 lib/**`；还原后 PASS |
| `pnpm test` | 92 files / 863 tests passed |
| `pnpm verify` | ALL PASS（含新 `pack-files`、`dist-manual`） |
| `pnpm release --prepare --force` | export-dist ALL PASS：106 条目、sha256 `6c83d37e…`、build 在 pack 前 |
| `pnpm release --verify` | 7 项全绿：verify / test / release-smoke / lifecycle-smoke / standalone-smoke / client-load-smoke / preset-smoke / present-catalog-smoke |
| 发布冒烟内的 vendor 通道 | release-smoke 五角色零 broken、session/create ceo+researcher；preset-smoke 五角色+researcher 全挂载 |

未跑：`--with-browser` 的浏览器 UI 交互（只证 roster/会话）、Windows/容器、真模型。
release manifest 在提交前仍是 dirty=true；提交后按 release-runbook 跑 `--stamp`/`--check`。
