# 2026-11-18 · C15 门禁闭环 + 不可读/部分输入：从「存在」到「可用/同义」

状态：implemented（2026-11-18 落地；任务源 = 用户「下一波 bug 来了，你也一块儿去改吧」）

> 上游 = [C15 探索卡](../../_backlog/_archive/settled_issues/2026-11-18-guard-closure-and-unreadable-inputs.md) + [10 张缺陷卡](../../_backlog/bugs/README.md)（BUG-233..242）。BUG-212 保持活跃，不并入本批。

## 决定

1. **shipped 关键件从「手写 12 条」扩到运行时读取面**（BUG-233/234/237）：
   `REQUIRED_SHIPPED`（43 条）覆盖 content/AGENTS、manifest、六份 charter、company 合同（含 rates）、
   templates、contracts/delegation、delivery-modes、product-types、methods、kb-setup（seed/guide/run-bundle）、
   wiki-template（AGENTS/index）、state（company/org/owners/roster/motion-ledger）、locale；
   每个关键件必须存在、`trim() !== ''`、JSON 可解析。`EXPECTED_PATCH` 断言 12 个组合目标
   （cordis + 六角色 + 五 support）都在 `dsh.bundle.patch`、目标在 tarball 且 `trim() !== ''`（空 preset 不算可用）。
2. **源码指纹只收 shipped 输入**（BUG-235）：从 `PACKAGE_SOURCE_FILES` 移除 dev `README.md`，
   保留 `README.shipped.md`；只改 dev README 不再让 `_dist` 假过期。
3. **降级必须有理由**（BUG-236）：`--allow-stale` 必须带 `=理由`，裸 flag 直接红；CI 环境禁止。
4. **catalog 不可读是坏形状，不是崩溃**（BUG-238/239）：meta/ledger 读取 try/catch → warning +
   无 meta/空账本；final 在 `plainFileProblem` 后加 `accessSync(R_OK)`，不可读 → warning + `final:false`。
5. **presence 部分 wire 按状态序/共用映射**（BUG-240/241/242）：
   缺 revision 时状态只许前进 `pending → in_progress → completed → deleted`（任意→deleted 允许）；
   事件板与 live 共用 `presenceStatusFromPhase`，`active` 显式保留 durable inactive，未知 phase 落
   `unknown`；未知 phase 的成员动态也用 `memberUnknown` token（不再冒充「故障」）；
   `firstText` 接受 undefined/非数组 → `''`，消息落「（空）」不中断事件流。

## 输掉的方案

- **继续手写少量 REQUIRED**：C14 的 12 条只覆盖上一轮见过的文件；templates/contracts/methods 仍可缺。
- **只查 glob 非空**：内容被裁到 1 个文件仍 PASS；必须有关键件 sentinel。
- **`--allow-stale` 保持裸旗标**：CI 可无理由给旧 `_dist` 盖章；必须带理由且 CI 禁用。
- **把 dev README 留给 sanitizer 覆盖**：它不随包，却让指纹变化；指纹只该收 shipped 输入。
- **catalog 读取直接抛**：权限修复期 boot 整体崩，违反「坏形状给 warning」契约。
- **缺 revision 一律 skip**：C14 的保守版会让 in_progress 任务永久冻结；改为状态序只进不退。
- **未知 phase 事件板落 inactive**：与 live unknown 两语义；共用映射，active 单独注释 durable 语义。
- **firstText 要求数组**：一条坏 message 会打断整场事件折算；接受非数组并降级。

## 状态事实与载体

- **事实**：`REQUIRED_SHIPPED` = 35 条（含 6 charter + templates/contracts/delivery/product/methods/kb/wiki/state/locale）；
  `EXPECTED_PATCH` = 12；真实 tarball 137 entries PASS；`shipped-links` gate 调 `checkSourceShape` 仍 PASS。
- **唯一入口**：`pnpm test tests/repo/release/shipped-shape.spec.ts`（合成/真实 checker）；
  `pnpm test tests/host/ledger/catalog.spec.ts`；`pnpm test tests/lib/presence/presence-board.spec.ts`；
  `pnpm release:shape`；`pnpm verify`（`shipped-links` source shape）。
- **读载体 / 写载体**：读 = 3 份 spec + 真实 `_dist`；写 = 先补 spec 负例，再改 checker/catalog/presence。
- **环境坏法**：`REQUIRED_SHIPPED` 是**运行时读取面**的策展集合，不是自动从代码 import 图派生；
  新增运行时读取点必须同 diff 加 sentinel（未覆盖轴已记）。权限测试在 root 下可能不生效（本机非 root）。

## 验证

- `pnpm release --prepare --force`：ALL PASS（shipped-shape 137 entries）。
- `pnpm release:shape`：PASS（sourceFingerprint 匹配）。
- `pnpm test`：262 files / 2250 tests；`verify` ALL PASS；`typecheck` exit 0；`lint` 0 warning；
  `coverage:ratchet` PASS（200 文件）。
- 真入口：`company-entry` / `client-load` ALL PASS。
- 负例：空 charter/非法 manifest、patch 裁 6、dev README 指纹不变、`--allow-stale` 无理由 exit 1、
  catalog chmod 000 三例、presence in_progress 回退/未知 phase/缺 content 均有 spec 或 CLI 证据。

## 审查记录

- 修复轮（2026-11-18）：独立盲审 B1/B2 已修；**S1–S5 的原始清单未在仓内留档**，仓内仅 S2 见「## 未覆盖轴」——已知记录缺口（与 C13/C14 同惯例），不阻塞本批结论。
- 归档复核（2026-11-18，独立只读子代理）：0 BLOCKER；3 条非阻塞建议——S 记录缺口、归档复核实跑日志在 gitignored `runtime/tmp`、C15 卡验收标准 3 需阶段限定（研究阶段判据，修复轮由用户另行授权）。处置：卡头与本节记明缺口；验收标准加阶段限定。

## 未覆盖轴

- [covered] shipped 关键件/组合/空文件：`pnpm test tests/repo/release/shipped-shape.spec.ts` → `tests/repo/release/shipped-shape.spec.ts`
- [covered] catalog 不可读：`pnpm test tests/host/ledger/catalog.spec.ts` → `tests/host/ledger/catalog.spec.ts`
- [covered] presence 部分 wire：`pnpm test tests/lib/presence/presence-board.spec.ts` → `tests/lib/presence/presence-board.spec.ts`
- [unprovable] `REQUIRED_SHIPPED` 是策展集合，新增运行时读取点仍可能漏；没有从 import 图自动派生 → `tools/lib/release/shipped-shape.mjs`
- [environment-gap] 权限测试依赖非 root；root/CI 容器里 chmod 000 仍可读 → `tests/host/ledger/catalog.spec.ts`
- [unprovable] `--allow-stale` 的 CI 禁用在本地只验证 `CI` 环境变量分支；真实 CI 策略未接线 → `tools/release/shipped-shape.mjs`
- [unprovable] sanitizer/`export-dist` 本身决定 tarball 字节，但不在 pack `sourceFingerprint` 内；只改 sanitizer 时 `release:shape` 仍可能给旧包盖章（C15 审查 S2，未在本批修，需 pipeline 指纹） → `tools/lib/release/shipped-shape.mjs`
- [policy] 缺 revision 的「只进不退」会丢弃合法「退回待办」snapshot；这是为了不让旧事件回退而选的 tradeoff，动态流仍显示退回、任务板保守保留，待 revisionGap/updatedAt 再区分 → `packages/company-pack/src/lib/presence/presence.ts`
- [policy] BUG-212（pre-push 整链 ~46s、docs-only release 摩擦）仍独立活跃，本批未动 → `_backlog/bugs/BUG-212-pre-push-and-release-tail-budget-overrun.md`
