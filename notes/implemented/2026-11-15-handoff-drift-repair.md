# 2026-11-15 · 接手漂移修复：CI 证据单家、旧测试分区指针、交接物边界

状态：implemented（2026-11-15 落地）

> 上游 = 接手成本只读诊断（会话内报告，无卡）。本轮只做「让下一位不必猜」的最小修复，不做发布、不动用户工作树文件。

## 决定

1. **CI 证据范围单家 = release.md。** 删掉 [bootstrap.md](../../docs/guides/bootstrap.md) 与 [release.md](../../docs/contracts/release.md) 两处「fresh-clone CI 只跑 install + bundle:init + verify」的过期断言，改成 [fresh-clone.yml](../../.github/workflows/fresh-clone.yml) 的三 job 口径：`install-verify`（Ubuntu+macOS）、`setup-macos`（macOS 全量构建 + verify + test + keyless lane）、`install-channel`（真实 npm DSH 通道）；release 仍不在 CI 内。bootstrap 只留指针，不复述。
2. **旧测试分区名随盘面更新。** 旧分区 tests/company 已不存在，但仍在 [AGENTS.md](../../AGENTS.md) 命令表、[board.spec.ts](../../tests/lib/board.spec.ts) 的红配方、[doors.spec.ts](../../tests/lib/doors.spec.ts) 的迁移注、[signoff.ts](../../packages/company-pack/src/lib/signoff.ts) / [presence-status.ts](../../packages/company-pack/src/lib/presence-status.ts) / [ledger.ts](../../packages/company-pack/src/lib/ledger.ts) 的模块注、[taskboard-presence-probe.mjs](../../probes/fs-taskboard/taskboard-presence-probe.mjs) 的头注与 [tsconfig.test-harness.json](../../tsconfig.test-harness.json) 的注释里。全部改到 `tests/{host,lib,content}`、tests/lib 下的对应 spec、或对应 tsconfig 名；生成物 `lib/types/**` 不手改（随下次 build 更新）。
3. **加一条防漂移 spec，不加门禁。** [navigation-assets.spec.ts](../../tests/repo/navigation-assets.spec.ts) 增「AGENTS 命令表路径」：只扫 `## 命令表` 的 sh 围栏，把 `tests/{a,b}` 花括号展开后逐成员对盘。红证两次：真实旧分区名 tests/company（1 failed / 7 passed）；盲审后又以真实 AGENTS 临时插入 `tests/{host,missing}` 复证花括号成员会红（1 failed / 7 passed，还原即绿）。选 spec 不选 gate：单次复发证据 + 门禁总数受只降不升硬顶；navigation-assets 本就是导航资产 owner。
4. **交接物边界写进根 README。** 根 [README.md](../../README.md) 明说：本仓库是维护者源码 handoff，不产出可安装 tarball；收件人两件套由 `pnpm release --prepare` 生成；[安装手册](../../_dist/安装手册.md)与最新导出版同版本，HEAD 未导出的改动以 README / [pack README](../../packages/company-pack/README.md) 为准；维护者首跑含 vendor 构建（分钟级），与收件人 5 分钟安装是两条路。inject 边数不再写死（条数以 `package.json` 为准）。
5. **干净 clone 验收暴露的死指针收口。** 在 `/tmp` 做真 clean clone（`git clone --no-hardlinks` + submodule + `pnpm install` + vendor install + `bundle:init` + `pnpm run setup`）：`pnpm verify` 首跑 **5 FAIL**，全是 tests/harness（已退役）死指针——[testing.md](../../docs/testing.md) 与旧 Note [test-asset-naming](./2026-11-13-test-asset-naming.md) 把它当活指针；暖树没红是因为本地留了空目录 tests/harness/（git 不跟踪空目录，clean clone 没有）。修：testing / dev-loop 的现行目录清单更新到 `tests/{host,lib,content}` 与 `tests/{repo,contract,tools,session,evidence,ui}`；旧 Note 的历史名改为非反引号叙述；删空目录。clean clone 重跑 verify 红→绿。
6. **tests/presets 纳入类型面（2026-11-15 追补）。** 把 `tests/presets/**/*.ts` 加进 `tsconfig.test-company.json` 后首跑暴露 **24 个类型错误**（8 个 spec：字面对象按 string 索引、`Set<never>`、可能 undefined 的数组下标/捕获组）；逐文件加类型表与非空断言/守卫，不改测试语义。覆盖从 213→**226/244**；未接 18 = contract 5 + pack-exports 1 + client 4 + host 8。AGENTS / tests README / testing / dev-loop 四处数字同步。
7. **生成物随行号漂移 + 配置计数纠偏。** 类型修让 delegation spec 行号下移，`tests/BUG-COVERAGE.generated.md` 必须 `node tools/bug-coverage.mjs --write` 重生成（204 行），否则 `tests/repo/bug-coverage.spec.ts` 逐字比对红。另把四份文档里的「四个 tsconfig.test-*」改为盘上实数**三个**，并修 tests/README 的两处旧枚举。
8. **0.11.7 发布准备（本地，不 publish）。** `pnpm release --bump patch` → CHANGELOG 填 0.11.7 用户可见变化 → `--prepare`（268 条目，tgz sha `3f797ca4…`）→ `--verify` **7/7 pass**（verify/test/release-smoke/company-entry/client-load/preset/present-catalog）；`market-index.staged.json` 同步 0.11.7。**不 npm publish**：publish 是人工 handoff，staged 保持在场；READY 只按 pre-publish 口径核对。
9. **18 个混面/直引 vendor spec 不新增类型工程（试过并证伪）。** 合同-only 工程在 root strict 配置下编译 vendor cordis 源触发 `exactOptionalPropertyTypes` / `noImplicitThis` / `override` 等错误；全 18 的混合工程另有 20 个 mock 类型错（client/host）。结论 = 现有 exclusion 是结构性的，不新增第四个 tsconfig；缺口按 [testing.md](../../docs/testing.md) 记。

## 输掉的方案

- **新建 doc-path 门禁**：拒绝。单次复发证据；`MAX_GATES=75` 只降不升，新建会把导航资产变成第二 owner；现有 spec 已覆盖该载体。
- **改写旧 Note / archived / CHANGELOG 里的旧分区名**：拒绝。archived 冻结，CHANGELOG 是变更史；`notes/implemented/2026-11-11-product-type-single-source.md` 的那行是当轮验证收据，不按现状改写。
- **同版重打 `_dist`（0.11.6）**：拒绝。版本纪律 = 改内容必 bump；0.11.7 走正式 bump + prepare/verify（决定 8）。
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

- [environment-gap] Linux 全量构建未跑：本轮 clean clone 验收在 macOS 本机完成，Linux 缺口只读工作流头注 → `docs/repo-hygiene.md`
- [policy] 18 个混面/直引 vendor spec 不进 tsc：独立工程试验已证伪（vendor 源在 root strict 下报错）→ `docs/testing.md`
- [environment-gap] 新装 profile 的浏览器首屏未单独跑：本轮真页面证据是 dev home 的 client-load → `checks/lanes/client-load.entry.mjs`
- [policy] 用户工作树的 `temp/` 两篇跨仓提案保持原位（不是仓库字节）→ `docs/repo-hygiene.md`
- [unprovable] Desktop 真机安装：合同已声明未逐平台认证 → `docs/contracts/release.md`

## 验证

| 层 | 实跑证据 | 负控 / 边界 |
|---|---|---|
| 路径防漂移 spec | 修前 `pnpm test tests/repo/navigation-assets.spec.ts` → **1 failed / 7 passed**（真实旧分区名）；修后 **8 passed** | 红来自真 AGENTS 字节，不是构造输入 |
| 结构 | 暖树 `pnpm verify` → **ALL PASS**（75 门；2 门无对象）；**clean clone 首跑 5 FAIL（tests/harness 死指针）→ 修后 ALL PASS** | 两次跑（暖树 / clean clone） |
| 回归 | 暖树 `pnpm test` → **244 files / 2094 tests passed**；clean clone → **244 files / 2091 passed + 3 skipped**（dev-only 台账） | 新增 1 条断言；skip 预算内 |
| 防漂移 spec | 花括号红证：AGENTS 临时插入 tests/{host,missing} → **1 failed / 7 passed**；还原 → **8 passed**；旧分区名红证 → 8 passed | 真文件，还原后 `git diff` 空 |
| 独立盲审 | 只读子代理审两提交：**2 blocker**（spec 花括号失明 / typecheck 覆盖面多处文档过宽）全部回修；建议 9 条收 8 条（未收 = _backlog 历史结案叙述不改） | 输入 = 提交 diff + 盘面；不含外部 WIP |
| 独立盲审（第二轮） | 审未提交 diff：**3 blocker**（BUG-COVERAGE 生成物随行号漂移 / tests README 旧枚举 / “四个 tsconfig”实为三个）全部回修；建议 13 条收 10 条（未收 = 局部类型表共享化、24 errors 回执、_backlog 历史文风） | 输入 = 未提交 diff；不含外部 WIP |
| 干净 clone | `git clone --no-hardlinks` + submodule + `pnpm install` + vendor install + `bundle:init` + `pnpm run setup` → 构建成功；verify 红→绿；test 绿；0fb6256c 仅 install+verify 亦 **ALL PASS** | `/tmp` 独立树，不碰工作区 |
| 类型 | `pnpm typecheck` → exit 0（含新纳入的 tests/presets 13 spec） | 改前 / 改后各一次；新增覆盖抓到 24 个类型错误并修 |
| presets 类型面 | 加 `tests/presets` 后首跑 **24 errors / 8 files**；修 typings 后 exit 0；`pnpm test tests/presets` **13 files / 138 tests passed** | 类型断言不改测试语义；lint 0 |
| 生成物 | 行号漂移后 `node tools/bug-coverage.mjs --write` → **204 行**；`pnpm test tests/repo/bug-coverage.spec.ts` 绿（逐字比对） | 不重生成时该 spec 必红 |
| 发布准备 | `pnpm release --bump patch` → 0.11.7；`--prepare` → **268 entries / sha 3f797ca4…**；`--verify` → **7/7 pass**（verify/test/release-smoke/company-entry/client-load/preset/present-catalog） | 未 npm publish；staged 0.11.7 在场 |
| 混面类型试验 | 合同-only tsc → vendor cordis 源 strict 错；全 18 混合 → 20 个 mock 类型错；试验配置已删除、未提交 | 不算覆盖；只作为 exclusion 的结构性证据 |
| 源码面 | `pnpm lint` 0 warnings / 0 errors；`pnpm dup` 0 clones | 注释与 tsconfig 改动 |
| 真挂载 | `node checks/lanes/preset.entry.mjs` → **preset-smoke: ALL PASS**（11 preset 逐个 session/create、skills 隔离、client 闭包） | 真 company profile，不是 roster 扫描 |
| 真页面 | `node checks/lanes/client-load.entry.mjs` → **ALL PASS**（零挂载失败 / 零 loader 错误 / 品牌槽在场） | 真浏览器 |
| 安装生命周期 | `node checks/lanes/release.entry.mjs`（现场 build + npm pack）→ **ALL PASS**：应用内安装 applied → 干净 profile boot（11 roster 零 broken、session/create）→ 首启落盘 46 件 → 二次 boot 零变更 → remove 摘净且公司状态字节不变 → 重装恢复 | 新字节、干净 profile；不覆盖 Desktop 真机与浏览器首屏 |
| 发布就绪 | `node tools/release.mjs --check` 仍红（源码面已变但 `_dist` 没重打） | 未 bump / 未重导，按决定 4 属未准备发布 |
