# RFC：standalone-deployment（目录即部署）

状态：已消化（2026-10-25 实施；批准：用户 2026-10-25；goal 授权按 2026-10-25 收尾计划自主推进）

## 问题

现在只有维护者的 dev 形状：`source run/env.sh` 强制仓库内 home/workspace、dev profile 用绝对 `link:`；换目录、换机器、换 home 都要手工修，复制目录还会带上 `runtime/harness-home` 的凭据/会话。没有“干净目录 + 干净 home 一条命令起 web”的受支持入口；也没有“不同公司不改源码部署”的身份缝和错盘守卫。对应问题卡：[独立启动形状](../../_backlog/_archive/settled_issues/2026-10-25-standalone-deployment-shape.md) 与 [部署身份与盘守卫](../../_backlog/_archive/settled_issues/2026-10-25-deployment-identity-and-workspace-guard.md)。

## 当前事实

- [run/env.sh](../../run/env.sh) 无条件导出 `DSH_HOME` 到 `runtime/harness-home`、`DSH_COMPANY_HOME` 到仓库 `company-workspace`，并 `DSH_COMPANY_BOOTSTRAP=off`。
- dev profile 的 pack 依赖是绝对 `link:`（runtime 状态，gitignored）；没有 relink/repair。
- [bundle-init.mjs](../../tools/bundle-init.mjs) 用符号链接把制度件指回 pack；这是维护者 single-source，不是可移植部署。
- [bootstrap.md](../../docs/guides/bootstrap.md) 是长配方；[fresh-clone.yml](../../.github/workflows/fresh-clone.yml) 只跑 install + bundle:init + verify，不构建/不启动。
- DSH 源码直跑 = 先 `pnpm run build`，再 `pnpm dsh`；launcher 不检查产物新鲜度。
- 品牌硬编码在 [Brand.tsx](../../packages/company-pack/src/client/Brand.tsx)；出厂 org 是样例；没有“会话 cwd 是不是公司盘”的守卫。
- `bundle.json` 的 workspace 在盘内记相对、盘外记绝对（[bundle-manifest.ts](../../packages/company-pack/src/host/bundle-manifest.ts)）。

## 方案

### 1. 独立启动入口

新增 tools/standalone.mjs + `pnpm standalone`：

- 参数：`--home <dir>`（默认 `runtime/standalone/home`）、`--workspace <dir>`（默认 `<home>/company-workspace`）、`--port`（默认 0）、`--no-open`、`--reset`、`--no-build`。
- 前置检查（doctor）：Node ≥22.19、pnpm、`vendor/dsh` 工作树、vendor host/client/web 产物、pack `lib/`；缺失时打印对应的构建命令并非零退出。
- 隔离：设置子进程 `DSH_HOME`，清除 `DSH_COMPANY_HOME` / `DSH_COMPANY_BOOTSTRAP` 等 dev 旋钮；不读写 `runtime/harness-home`；不写 `~/.dsh`。
- provision：在隔离 home 里建/修 `web` profile，`plugin add link:<repo>/packages/company-pack`；若 profile 里已有指向别处的绝对 `link:`，重指并打印；不重复添加。
- workspace：默认 `DSH_COMPANY_HOME=<home>/company-workspace`，由 pack 首启复制骨架（copy，不 symlink）；`--reset` 只删默认 home 或显式 `--home`（且必须在 `runtime/standalone` 下或用户确认），不碰用户数据。
- 启动：spawn pinned vendor CLI（`node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts --profile web -- --port ...`），继承 stdio，打印当前 home/workspace/构建状态；不在脚本里复制 `dsh` 全局命令。
- 迁移：repo 路径变化时，入口检测 profile 的绝对 link 并重指；home 搬家时按手册步骤重装 profile 包；`bundle.json` 的相对 workspace 记录保持不变。

### 2. 形状矩阵

在 docs 增加/扩写一张矩阵：**真插件安装（tarball/npm + profile）** vs **目录独立启动（repo + pinned vendor + 隔离 home）**，逐列写前置、数据落点、首启、升级、删除、证明边界。更新 [bootstrap.md](../../docs/guides/bootstrap.md) 的入口段，避免读者自己拼 release.md 与 bootstrap.md。

### 3. 部署身份与盘守卫

- 新增 `workspace/kb/company.md`（部署身份：`name`、`product`、`sample: true/false`）；手册第一段引用它；CompanyView 读它显示公司名；`Brand.tsx` 保留产品名（梦之队），不把产品名当客户名。
- 错盘守卫：host 在 `api-session/added` 时比较会话 cwd 与 `bundle.json.workspace`；company preset 且 cwd 不匹配时记警告；client 的 company 页签在 workspace 缺 `AGENTS.md`/`kb` 时显示“这不是公司盘”的明确空态，不显示半套数据。不拒绝维护者 coding 会话。
- dev 链接策略：`bundle:init` 默认仍为维护者 single-source；新增 `--copy` 给独立环境/第三方用；文档明确默认是维护者专用。`standalone` 不走 `bundle:init`。

## 输掉的方案

- 复制构建产物（node_modules/vendor 产物）作为分发：跨平台/体积/新鲜度不可控，DSH 也不承诺。
- 只写文档、不做入口：不满足“一条命令、可迁移、可清理”。
- 容器镜像：只有出现具体目标环境时才值得做，不在本轮承诺。
- 完全品牌可配置：成本高；先做“产品名 + 公司名”分离。

## 验收

命令（全部实跑，红→绿收据进 Note）：

```sh
pnpm verify
pnpm test
pnpm standalone --home <tmp>/home --workspace <tmp>/home/company-workspace --port 0 --no-open
node checks/smoke/standalone-smoke.mjs
```

断言：

- clean-room：临时 `HOME` + 全新 home；入口起 web；RPC roster 五角色 + researcher；`session/create` 成功；临时 `HOME` 下无 `.dsh`，`runtime/harness-home` 未被读写。
- 移动：用临时符号链接/副本改变 repo 路径后重跑；入口检测并修复绝对 link；boot 成功。
- `--reset`：只清 standalone home/workspace；越界路径拒绝；用户数据不动。
- doctor：缺 Node/pnpm/vendor 产物/pack lib 时非零退出并给命令；不全绿也如实报告。
- 身份：`kb/company.md` 的 `name` 在 CompanyView 显示；不匹配 cwd 的 company 会话有提示/空态，不显示半套数据。
- 形状矩阵：两形状的前置/数据落点/升级/删除/证明边界在同一张表。
- 红样：旧树无入口（`pnpm standalone` 不存在）/dev profile 绝对 link 在路径变化后失效；实现后绿。

## 范围 / 排除

- 范围：standalone 入口 + doctor + 隔离 home + copy workspace + relink/reset + clean-room smoke + 形状矩阵 + 公司名配置 + 错盘提示 + `bundle:init --copy`。
- 排除：预构建离线包、容器镜像、Windows 支持、同 home 多公司、完全品牌皮肤。

## 实施顺序

1. doctor + 参数 + 隔离 home（先让 `--help`/缺前置路径可测）。
2. provision（profile link 修复）+ 启动 + workspace copy。
3. clean-room smoke（先写失败断言）。
4. 形状矩阵 + `bundle:init --copy`。
5. 身份/错盘守卫（client + host）。
6. 全量证据 + Note。

## 实施与证据（2026-10-25）

已落树：

- [tools/standalone.mjs](../../tools/standalone.mjs) + `pnpm standalone`：`--home`/`--workspace`/`--port`/`--no-open`/`--provision-only`/`--no-build`/`--reset`/`--help`；doctor 查 Node/vendor CLI/web dist/vendor client bundles/pack 产物；隔离 `DSH_HOME`，自建 `web` profile，`link:` 指回当前 pack，`DSH_COMPANY_BOOTSTRAP=if-missing` 让 host copy 骨架；`--reset` 只删带 `.standalone-home` 标记的 home，拒绝接管已有 DSH 数据的 home。
- [standalone-smoke.mjs](../../checks/smoke/standalone-smoke.mjs)：临时 `HOME` + 隔离 home；provision → 改坏 link → relink → boot/RPC（五角色 + researcher、`session/create`）→ reset；断言不写日用 `~/.dsh`。
- 身份：新增 [kb/company.md](../../packages/company-pack/workspace/kb/company.md)（公司名/产品名/样例标记）；手册标题改为「公司手册」并指向它；[CompanyView](../../packages/company-pack/src/client/CompanyView.tsx) 读该文件显示公司名，读不到显示「非公司盘 / 身份未配置」；[DeliverablesTab](../../packages/company-pack/src/client/DeliverablesTab.tsx) 的缺索引错误提示确认 workspace。
- 形状矩阵：[bootstrap.md](../../docs/guides/bootstrap.md) 顶部「先选形状」表；[profile.md](../../docs/profile.md) 部署形状表加「目录独立启动」行；`bundle-init` 头注标维护者专用。
- 索引：[checks/README.md](../../checks/README.md) 登记 `standalone` 与 `standalone-smoke`。

红/绿收据（实跑）：

- 绿：`node checks/smoke/standalone-smoke.mjs` → `ALL PASS`（provision / relink / roster 五角色 + researcher / copy 骨架 + 身份 / bundle.json / session-create / 不写日用 `.dsh` / reset / 无标记 reset 拒绝）。
- 绿：`pnpm verify` → `ALL PASS`；`pnpm test` → 839 passed；`release-smoke` → `ALL PASS`（32 件骨架、空 catalog、二启零变更）；`lifecycle-smoke` → `ALL PASS`；`client-load-smoke` → `ALL PASS`。
- 红样：旧树没有 `pnpm standalone` 入口；smoke 的 relink 步骤先写入 `link:/tmp/does-not-exist/...`，入口未修复即红；`--reset` 对无标记目录必须非零。

未验证 / 偏离：

- 未做 `bundle:init --copy`：独立环境统一用 `pnpm standalone`（host copy 骨架）；`bundle-init` 保持维护者符号链接单源，避免 copy 模式与 `company-skeleton` 门禁冲突。原文的这一步以此替代。
- 错盘守卫是**可见提示/空态**，不是拒绝会话（避免误伤维护者 coding 会话）；host 侧拒绝策略未做。
- 未承诺/未验证：真容器或第二台机器、Windows、离线预构建、浏览器里公司名的视觉断言（client-load 只证零挂载失败与品牌）。
