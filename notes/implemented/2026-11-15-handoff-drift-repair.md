# 2026-11-15 · 接手漂移修复：CI 证据单家、旧测试分区指针、交接物边界

状态：implemented（2026-11-15 落地）

> 上游 = 接手成本只读诊断（会话内报告，无卡）。本轮只做「让下一位不必猜」的最小修复，不做发布、不动用户工作树文件。

## 决定

1. **CI 证据范围单家 = release.md。** 删掉 [bootstrap.md](../../docs/guides/bootstrap.md) 与 [release.md](../../docs/contracts/release.md) 两处「fresh-clone CI 只跑 install + bundle:init + verify」的过期断言，改成 [fresh-clone.yml](../../.github/workflows/fresh-clone.yml) 的三 job 口径：`install-verify`（Ubuntu+macOS）、`setup-macos`（macOS 全量构建 + verify + test + keyless lane）、`install-channel`（真实 npm DSH 通道）；release 仍不在 CI 内。bootstrap 只留指针，不复述。
2. **旧测试分区名随盘面更新。** 旧分区 tests/company 已不存在，但仍在 [AGENTS.md](../../AGENTS.md) 命令表、[board.spec.ts](../../tests/lib/board.spec.ts) 的红配方、[doors.spec.ts](../../tests/lib/doors.spec.ts) 的迁移注、[signoff.ts](../../packages/company-pack/src/lib/signoff.ts) / [presence-status.ts](../../packages/company-pack/src/lib/presence-status.ts) / [ledger.ts](../../packages/company-pack/src/lib/ledger.ts) 的模块注、[taskboard-presence-probe.mjs](../../probes/fs-taskboard/taskboard-presence-probe.mjs) 的头注与 [tsconfig.test-harness.json](../../tsconfig.test-harness.json) 的注释里。全部改到 `tests/{host,lib,content}`、tests/lib 下的对应 spec、或对应 tsconfig 名；生成物 `lib/types/**` 不手改（随下次 build 更新）。
3. **加一条防漂移 spec，不加门禁。** [navigation-assets.spec.ts](../../tests/repo/navigation-assets.spec.ts) 增「AGENTS 命令表路径」：抽出 AGENTS.md 里 `tests/<path>` token 逐个对盘。先以真实旧分区名造红（1 failed / 7 passed），改 AGENTS 后绿（8 passed）。选 spec 不选 gate：单次复发证据 + 门禁总数受只降不升硬顶；navigation-assets 本就是导航资产 owner。
4. **交接物边界写进根 README。** 根 [README.md](../../README.md) 明说：本仓库是维护者源码 handoff，不产出可安装 tarball；收件人两件套由 `pnpm release --prepare` 生成；[安装手册](../../_dist/安装手册.md)与最新导出版同版本，HEAD 未导出的改动以 README / [pack README](../../packages/company-pack/README.md) 为准；维护者首跑含 vendor 构建（分钟级），与收件人 5 分钟安装是两条路。inject 边数不再写死（条数以 `package.json` 为准）。

## 输掉的方案

- **新建 doc-path 门禁**：拒绝。单次复发证据；`MAX_GATES=75` 只降不升，新建会把导航资产变成第二 owner；现有 spec 已覆盖该载体。
- **改写旧 Note / archived / CHANGELOG 里的旧分区名**：拒绝。archived 冻结，CHANGELOG 是变更史；`notes/implemented/2026-11-11-product-type-single-source.md` 的那行是当轮验证收据，不按现状改写。
- **重打 `_dist` 或 bump 0.11.6 → 0.11.7**：拒绝。本轮无发布授权；版本纪律 = 改内容必 bump，发布是独立流程。`release --check` 仍会报「源码面已变但 `_dist` 没重打」——这是未准备发布的真话，不是回归。
- **删 / 搬 `temp/` 两篇跨仓提案**：拒绝。那是用户工作树文件，不是仓库字节；去向由用户定。
- **给 inject 边数加计数断言**：拒绝。数字已从 README 删除，`package.json` 是唯一家；再断言一次数字等于把双账固化。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | CI 各 job 的证明边界；旧测试分区指针的现行落点；repo handoff 与收件人两件套的边界 |
| 唯一入口 | [fresh-clone.yml](../../.github/workflows/fresh-clone.yml)（job 形状）、[release.md](../../docs/contracts/release.md)（证明边界）、[package.json](../../packages/company-pack/package.json)（inject 条数） |
| 读载体 | fresh agent、发布者、收件人 |
| 写载体 | [bootstrap.md](../../docs/guides/bootstrap.md)、[AGENTS.md](../../AGENTS.md)、[navigation-assets.spec.ts](../../tests/repo/navigation-assets.spec.ts)、各模块注释 |
| 一致性判据 | bootstrap / release 不再复述过期 CI 口径；AGENTS 的 tests/ 路径对盘；README 说清 repo ≠ 可安装包 |

## 未覆盖轴

- [environment-gap] 干净 clone 上的全量构建与 Linux 缺口未在本机重放：只读核对了 CI job 与 workflow 头注 → `docs/contracts/release.md`
- [environment-gap] 新装 profile 的浏览器首屏未单独跑：本轮真页面证据是 dev home 的 client-load → `checks/lanes/client-load.entry.mjs`
- [policy] 用户工作树的 `temp/` 两篇跨仓提案保持原位（不是仓库字节）→ `docs/repo-hygiene.md`
- [unprovable] Desktop 真机安装：合同已声明未逐平台认证 → `docs/contracts/release.md`

## 验证

| 层 | 实跑证据 | 负控 / 边界 |
|---|---|---|
| 路径防漂移 spec | 修前 `pnpm test tests/repo/navigation-assets.spec.ts` → **1 failed / 7 passed**（真实旧分区名）；修后 **8 passed** | 红来自真 AGENTS 字节，不是构造输入 |
| 结构 | `pnpm verify` → **ALL PASS**（75 门；2 门无对象：replay-fixture-freshness / replay-ui-freshness） | 两次跑（改前 / 加 Note 后）均绿 |
| 回归 | `pnpm test` → **244 files / 2094 tests passed**（76.04s） | 新增 1 条断言；无 skip 增长 |
| 类型 | `pnpm typecheck` → exit 0 | 改前 / 改后各一次 |
| 源码面 | `pnpm lint` 0 warnings / 0 errors；`pnpm dup` 0 clones | 注释与 tsconfig 改动 |
| 真挂载 | `node checks/lanes/preset.entry.mjs` → **preset-smoke: ALL PASS**（11 preset 逐个 session/create、skills 隔离、client 闭包） | 真 company profile，不是 roster 扫描 |
| 真页面 | `node checks/lanes/client-load.entry.mjs` → **ALL PASS**（零挂载失败 / 零 loader 错误 / 品牌槽在场） | 真浏览器 |
| 安装生命周期 | `node checks/lanes/release.entry.mjs`（现场 build + npm pack）→ **ALL PASS**：应用内安装 applied → 干净 profile boot（11 roster 零 broken、session/create）→ 首启落盘 46 件 → 二次 boot 零变更 → remove 摘净且公司状态字节不变 → 重装恢复 | 新字节、干净 profile；不覆盖 Desktop 真机与浏览器首屏 |
| 发布就绪 | `node tools/release.mjs --check` 仍红（源码面已变但 `_dist` 没重打） | 未 bump / 未重导，按决定 4 属未准备发布 |
