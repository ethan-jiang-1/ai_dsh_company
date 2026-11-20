# 2026-11-18 · 修复后的守卫面 + 低置信运行态：把「上一轮修复造出的新判据」再闭包

状态：implemented（2026-11-18 落地；任务源 = 用户「再来一波 _backlog/bugs 里面最近 exploratory test 发现的 bugs，看看是否能系统性修起来」）

> 上游 = [C14 低置信探索卡](../../_backlog/_archive/settled_issues/2026-11-18-low-confidence-runtime-exploratory.md) + [10 张缺陷卡](../../_backlog/bugs/README.md)（BUG-223..232）。BUG-212（收尾验证链成本）保持活跃，不并入本批。

## 决定

1. **checker 的判据面按「声明 → 实盘」闭包**（BUG-223..226）：
   `checkShippedPackage` 对每个 `files` glob 求至少 1 个 entry 命中；content/manifest、六份 charter、company 合同、locale en/zh 等关键件必须在（glob 非空 ≠ 内容完整）；
   `dsh.bundle.patch` 的每个目标必须在 tarball；`TEXT_FACE` 纳入 `content/**` 的可读文本；
   无扩展名/目录级 dev 引用由 `DEV_DIR` 判，tools/pre-execute、tools/skills、tools/source、
   tests/simulation 是显式白名单（它们是通用词/DSH hook，不是仓库路径）。
2. **`release:shape` 证明输入新鲜度**（BUG-227）：读 `_dist/release-manifest.json` 的
   `sourceFingerprint`（`PACKAGE_SOURCE_FILES` 含 `README.shipped.md`，避免只改 shipped README 时假绿），与当前 `sourceFingerprint(packages/company-pack)` 比对；不等即红并提示
   `pnpm release --prepare`，`--allow-stale` 是显式降级。`gitSha` 落后但源码指纹相同
   （docs-only 提交）只打印 note，不误红。
3. **源码侧 shipped 面进 `pnpm test`/pre-push**（BUG-228）：新增 `checkSourceShape()`，覆盖
   `README.shipped.md` 链接/pnpm 文案、`cordis.patch.yml`/`presets`/`content` 的 dev 限定、
   `dsh.bundle.patch` 目标在源码树存在；由 `checks/gates/shipped-links.mjs` 在 `pnpm verify`/pre-push 的 `run-gates` 下真跑
   （不新增昂贵阶段），`README.shipped.md` 的 `coveredBy` = `verify`。真实 tarball 的字节/新鲜度
   仍由 `release:shape` 判。
4. **presence 读模型按「部分视图也是合法输入」**（BUG-229/230）：
   `diffActivity` 对 `prev/next` 的 members/tasks 统一 `?? []`；`teamWithEventTasks` 在投影任务
   缺 `revision` 时保留投影，不让旧事件把 `completed` 覆盖成 `pending`。
5. **catalog 坏形状不再静默**（BUG-231/232）：deliverables 子目录 symlink → warning + 不纳入；
   `slug:` 空/空白 → 回退目录名 + warning；`buildDeliverablesCatalog` 与 `scanEntries` 共用
   `deliverableSlug()`，避免两处口径漂移。

## 输掉的方案

- **只把 `TEXT_FACE` 加 `content/**`、不扩 `DEV_DIR`**：目录级 dev 引用（`tests/host/cultivation/`）
  仍漏；C14 的 G1 会继续空绿。
- **把 `files` glob 全跳过、只查字面条目**：C13 的 checker 原状；缺 content/presets 的包仍 PASS。
- **`release:shape` 用 gitSha == HEAD 判新鲜**：docs-only 提交会误红，且与 BUG-212 的
  `release --stamp` 摩擦叠加；改用 `sourceFingerprint`，gitSha 只提示。
- **把真实 tarball check 塞进 verify**：fresh clone/CI 没有 `_dist`，会变成空转/假红；
  源码侧用 `checkSourceShape`，真实字节留 release。
- **缺 revision 时让事件覆盖投影**：会把 completed 显示回 pending（BUG-230 的原始症状）。
- **catalog 对 symlink 子目录 continue 了事**：UI 少一条且无提示，数据不诚实。
- **空 slug 继续用 `??` 兜底**：`parseMeta` 返回 `''` 不是 undefined，`??` 永远不回退。

## 状态事实与载体

- **事实**：C14 的 10 张全部修复；checker 现在覆盖 files glob/content/patch/dir-dev；
  `release:shape` 有 sourceFingerprint 新鲜度；源码侧 `checkSourceShape` 进 coverage:ratchet；
  presence/catalog 四个最小输入修复。
- **唯一入口**：`pnpm release:shape`（真实 tarball + 新鲜度）；
  `tests/repo/release/shipped-shape.spec.ts`（合成包 + 源码侧）；
  `tests/lib/presence/presence-board.spec.ts`；`tests/host/ledger/catalog.spec.ts`。
- **读载体 / 写载体**：读 = `tools/lib/release/shipped-shape.mjs` 的判据 + 三份 spec；
  写 = 新判据先加 spec 的合成负例，再改 checker；presence/catalog 先补最小输入负例。
- **环境坏法**：checker 依赖 `_dist`（只在 release 期）；source shape 不证真实字节；
  `PLATFORM_MODULES` 是 vendor 钉树；presence 的 wire 可能给部分视图；catalog 的盘面坏形状
  必须 warning 而非静默。

## 验证

- `pnpm release --prepare --force`：ALL PASS（shipped-shape 137 entries）。
- `pnpm release:shape`：PASS（sourceFingerprint 与 `_dist` 一致；gitSha docs-only 只 note）。
- `pnpm test`：262 files / 2237 tests；`verify` ALL PASS；`typecheck` exit 0；`lint` 0 warning；
  `coverage:ratchet` PASS（200 文件；`tools/lib/release/shipped-shape.mjs` 97.84/88.77）。
- 真入口：`company-entry`/`client-load` ALL PASS（2026-11-18 实跑）。

## 未覆盖轴

- [covered] checker 合成包 + 源码侧：`pnpm test tests/repo/release/shipped-shape.spec.ts` → `tests/repo/release/shipped-shape.spec.ts`
- [covered] presence 最小输入：`pnpm test tests/lib/presence/presence-board.spec.ts` → `tests/lib/presence/presence-board.spec.ts`
- [covered] catalog 临时 home：`pnpm test tests/host/ledger/catalog.spec.ts` → `tests/host/ledger/catalog.spec.ts`
- [unprovable] `release:shape` 只证 `_dist` 形状/新鲜度，不证真安装后的每一页/每一命令 → `tools/release/shipped-shape.mjs`
- [environment-gap] fresh clone/CI 无 `_dist`，真实 tarball 检查只能在 release/本地执行 → `tools/release/shipped-shape.mjs`
- [policy] `DEV_DIR` 白名单是通用词与 DSH hook 的显式例外；新增白名单需同 diff 说明 → `tools/lib/release/shipped-shape.mjs`
