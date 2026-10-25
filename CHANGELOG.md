# Changelog

本文件只记用户/收件人可见的变化；维护者过程证据在 `notes/implemented/` 与 `_dist/release-manifest.json`。

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
