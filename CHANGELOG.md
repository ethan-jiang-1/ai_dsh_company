# Changelog

本文件只记用户/收件人可见的变化；维护者过程证据在 `notes/implemented/` 与 `_dist/release-manifest.json`。

## 0.3.11 — 2026-10-27

### Changed

- **公司数据作用域收口**：培养记录/成品目录/方法层命令只认 `bundle.json` 解析出的公司盘根；session `header.cwd` 在盘子目录或盘外时明确拒绝公司数据写入（不再只告警），避免一个公司盘长出多份账本。
- **显式换盘**：新增 `DSH_COMPANY_REBIND=1` 一次性换盘；旧盘必须已搬走，先备份 `bundle.json` 再改写 workspace，并写升级日志。默认硬阻断不变；只迁 pack 数据，不迁 DSH session 的绝对 `header.cwd`。
- **`presented` 拆成审计账本 + 派生索引**：新增 `kb/deliverables-presented.json`（`true` 来自会话事件，`false` 是操作员审计）；索引只做派生视图。账本缺失时从旧索引迁移，`true` 可从会话事件回扫；账本损坏/更高 schema 保留原文件并 fail loud。
- **版本与原子写**：`bundle.json` 校验 `v`/必填字段，更高版本保留原文件并告警；catalog/账本 schema 更高时告警；首建 manifest 与基部升级改临时文件 + rename/link，升级中断不再留下半截基部文件。
- **备份合同拆分**：安装手册把备份分为 `business`（公司盘 + `bundle.json` + 方法层，不含 sessions/密钥/搜索索引）与 `full`（整 home，加密限权），并补恢复与换盘步骤。
- **事实级数据卡**：新增 `docs/data-model.md`；README Data 与 FAQ 26 登记同步。

## 0.3.10 — 2026-10-26

### Fixed

- **真实 npm 发布版 DSH 上五角色可用**：`@deepseek-ai/dsh` meta package 不含 browser 两包，旧 presets 会把五个角色全部标 broken、`session/create` 直接失败。browser 组改为条件启用：profile 可解析两包即自动开；缺包时整组禁用，五角色照常可用；`DSH_COMPANY_BROWSER=on/off` 可强制（dev 的 `run/env.sh` 设 on）。
- **`DSH_COMPANY_HOME` 归一**：`~` 展开、相对路径按启动 cwd 绝对化、空白视为未设置；不再把不可复现的字符串写进 `bundle.json`。
- **换盘不再静默分裂**：已有 `bundle.json` 时改 `DSH_COMPANY_HOME`，启动输出明确警告并拒绝在新路径建第二份公司盘。
- **`export-dist` 先 build**：`lib/` 是 gitignored 的构建目录，直接 `npm pack` 会打出旧代码；导出前跑 `tsc -b` + `tsdown`。
- **发布面包瘦身**：`files` 只留 `lib/index.js`、`lib/client.js`、`lib/types/**/*.d.ts`；tsc 中间 `.js`/`.map`/`.tsbuildinfo` 不再进包。
- **搬家后 workspace 登记体检**：启动点名 `storages/workspace.json` 里已不存在的绝对旧路径（只告警，不自动改 DSH 存储）。

### Added

- `channel-matrix-smoke`：vendor built CLI + 真实全局 `dsh` 的五角色 roster/会话；`--with-browser` 验可选 browser 包自动启用。
- `isolation-matrix-smoke`：改 `DSH_COMPANY_HOME` 的告警/不建新盘 + 相对/`~` 落点归一。
- 安装手册补 pnpm 11/12、npm 发布版 `0.2.1-rc.3`、可选 browser、换盘/搬家与备份敏感面。

## 0.3.9 — 2026-10-26

### Changed

- 明确 profile 合同：公司包要求含 `@deepseek-ai/dsh-web-app` 的 web profile；base-only 自定义 profile 的 preset 行会 pending。
- 明确一个 `DSH_HOME` = 一个 run bundle：同 home 多 profile 共享 bundle/sessions/workspace，不是隔离；第二个公司用第二个 home。
- 新增 `multi-install-smoke`：双 home 真装隔离、非空 home 后装、同 home 多 profile 反例、自定义 profile 补 web-app、空 bundle 共存、重复安装幂等。

## 0.3.8 — 2026-10-26

### Changed

- 安装前置补 **pnpm 11 / `corepack enable pnpm`**：第二机模拟证实，只有 Node+DSH 时 `plugin add` 会报 `pnpm was not found`；手册与 README 都写明，`dist-manual` 门禁检查。
- 手册安装步骤加 `command -v pnpm` 预检，避免装到一半才失败。

## 0.3.7 — 2026-10-26

### Changed

- 发布可复现护栏：同版本 tgz 已存在时 `--prepare` 拒绝重打（npm pack 带 mtime，重打会让 sha 漂移）；确要重打用 `--force`。
- 0.3.6 因 test-only commit 后误重打包导致同版本字节漂移，不再作为 handoff；0.3.7 为重新导出的交付字节。

## 0.3.6 — 2026-10-26

### Changed

- 成品目录：真 vendor `present` 工具 → session `deliverables/presented` → host catalog 的端到端 smoke；修 macOS `/var`→`/private/var` symlink 导致事件路径永远匹配不上 catalog 的 bug。
- 盘守卫：host 在 `api-session/added` 比较会话 cwd 与 `bundle.json.workspace`，不一致记警告；新增 keyless 正/负测试。
- 生命周期负例：单字节篡改 tarball 拒绝安装；standalone 缺 pnpm 时拒绝且不创建 home。
- 测试矩阵：catalog 不进模型指令面（T4 无新 replay 场景）、`engines.dsh` 窗口语义（T6 真实多版本矩阵仍待环境）、发布 runbook 补供应链 checklist。

## 0.3.5 — 2026-10-26

### Changed

- 数据边界：README Data 补 D 平面与 session cwd 不一致的提示；catalog 的 `presented=false` 只按精确 path 保留，同 slug 新件不继承旧结论。
- 发布复现：`release --check` 要求 manifest dirty=false 且 verify/test/所有 smoke 全 pass；新增 `release --stamp` 把 manifest 钉到发布 commit；`--verify` 拒绝验旧 HEAD 的产物。
- 手册日期改为 Asia/Shanghai，与 CHANGELOG 一致（0.3.4 手册误写 10-25）。
- 测试资产：移除 catalog wiring 的 mock；补空态、tarball locale/icon、两侧 metaProblems 一致性、persona 公司名断言。

## 0.3.4 — 2026-10-26

### Changed

- preset 定义层去掉公司事实（梦之队/业务/编制），改为引用 `kb/company.md` 与 `kb/org.md`；不同公司不再需要改包源码。
- 包 README 增加 Install / What it contributes / Configuration / Data / Compatibility / Uninstall；Data 节写明包目录只读与 workspace/home/session 边界。
- 增加 `locale/en.json`、`locale/zh.json` 与原创 `icon.svg`，Plugin Manager 可显示真实标题/描述/图标。
- `dsh.compatibility` 从 package manifest 移除；已认证 tag 台账迁到仓库内 `checks/gates/lib/compat-tags.json`，运行时只认 `engines.dsh`。
- 发布内化：`CHANGELOG.md`、`tools/release.mjs`（bump/prepare/verify/check）、`_dist/release-manifest.json`、`release-ready` 门禁与发布 runbook。

## 0.3.3 — 2026-10-25

### Changed

- 分发契约：`engines.dsh` / Node 窗口、tarball sha256、卸载/回退手册。
- 出厂内容自足：去掉安装后指向仓库的路径；成品目录由 host 首启生成。
- 独立启动：`pnpm standalone` 的隔离 home/profile、copy 骨架、relink、reset。
- 审查加固：bundle.json 原子写/损坏诊断、升级日志、catalog metaProblem、standalone 接管安全。

## 0.3.2 — 2026-10-25

### Changed

- 分发契约（engines/license/repository/sha256）与安装生命周期证据。
- 成品目录 host 生成与 present 投影。
- 目录独立启动入口。
