# 2026-11-11 · 接手 gap 收口：clean clone 首跑、手册指针与发布证据

状态：implemented（用户 2026-11-11 直接授权：静默自主收口诊断 gap）

## 决定

- **首跑入口 = `pnpm setup`**（实现 [`tools/setup.mjs`](../../tools/setup.mjs)）：按 vendor lock 安装、构建 vendor host/client 类型与 runtime、native、web 前端与 pack；`pnpm company` 缺 vendor CLI 时直接指向它。vendor 构建用 vendor 自己的 tsc/tsdown（根 tsdown 0.22.14 与 vendor 0.22.2 会漂移；实测一次 client runtime 构建失败，切回 vendor 产物后通过）。
- **安装手册指针 = 绝对仓库 URL**：tarball 与手册仍是同目录两件套；[`dist-manual`](../../checks/gates/dist-manual.mjs) 断言 pack README 不再依赖包内不可达的相对 `_dist/安装手册.md`。
- **发布证据带 vendor 身份**：[`tools/release.mjs`](../../tools/release.mjs) 在 manifest 记录 `vendor.head`、`vendor.dirty`、CLI sha256 与 mtime；`release --check` 对不上即红，避免“7 项 pass 但 vendor build 已换”的静默漂移。
- **CI 回到台账内版本**：`fresh-clone` 的 global 通道钉 `@deepseek-ai/dsh@0.2.1-rc.5`；导出前跑 `node tools/setup.mjs --types` 补 vendor 类型面。
- **版本 = 0.11.3**：pack README/手册/市场索引/CHANGELOG 同步；`link-debt` 基线从 32 降到 20（实测 archived 20）。

## 输掉的方案

- 不在 `pnpm company` 里偷偷构建 vendor：启动器保持“只启动”，构建显式化为 `pnpm setup`，避免把分钟级成本藏进服务启动。
- 不把《安装手册》塞进 tarball：手册头含 tarball sha256，先打包后生成；自包含会形成递归指纹。保留两件套 + 绝对 URL。
- 不保留 rc.3 作为兼容证据：台账只列 rc.2/rc.5；CI 必须用台账内版本，否则 channel-matrix 的绿无法归入已认证窗口。
- 不把 vendor CLI 的 mtime 当“新鲜度证明”：manifest 只让身份漂移可见；真正的重建仍由 `pnpm setup` 执行。

## 证据

- `node tools/setup.mjs --skip-install` → 全量通过（vendor host/client、native、web、pack；`SETUP_FULL_EXIT:0`，2026-11-11）。首次用根 tsdown 时 client runtime 报 `Missing field code`；改用 vendor `node_modules/.bin/tsdown` 后通过。
- `node tools/setup.mjs --check` → `setup: 产物齐全（vendor CLI / client / web / pack）`。
- `node tools/release.mjs --prepare` → `0.11.3`；tarball 259 entries；`export-dist: ALL PASS`；manifest 写入 vendor 指纹。
- `node tools/release.mjs --verify` → `verify`/`test`/`release-smoke`/`company-entry-smoke`/`client-load-smoke`/`preset-smoke`/`present-catalog-smoke` 全 pass；`pnpm test` 187 文件 / 1546 tests；`release-smoke: ALL PASS`。
- `pnpm verify` → `ALL PASS；2 门无对象`（replay-fixture / replay-ui 显式 SKIP）。
- `dist-manual` 红/绿：把 pack README 的绝对手册 URL 改回相对 `_dist/安装手册.md` → `FAIL dist-manual pack README 缺指向仓库绝对 URL 的《安装手册》指针`；还原 → `OK dist-manual（版本 0.11.3 …）`。
- `link-debt` → `archived 20 / moved 0 / live 0；基线 20/0/0`。

## 未验

- clean clone 从零重跑（本机是 warm checkout；`pnpm setup` 的全量构建路径已在 warm checkout 跑通，但没有真正删 `node_modules`/vendor 后重来）。
- `fresh-clone` CI 的 Ubuntu/macOS job 未在本机执行（workflow 只读审阅）。
- Desktop/Windows、真模型多轮行为仍按原合同未认证。

## 相关

- 诊断来源：2026-11-11 接手成本评估（报告在当轮回复，未落盘）。
- 运行合同：[release.md](../../docs/contracts/release.md) · [bootstrap](../../docs/guides/bootstrap.md) · [tests/README](../../tests/README.md)。
