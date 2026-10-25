# Changelog

本文件只记用户/收件人可见的变化；维护者过程证据在 `notes/implemented/` 与 `_dist/release-manifest.json`。

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
